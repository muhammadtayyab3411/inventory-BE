const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const db = require('../config/db');

const randomstring = require('randomstring');
const sendMail = require('../helpers/sendMail');

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

const register = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const secret = speakeasy.generateSecret({ name: 'Koboweb', length: 20 });

  try {
    const existingUser = await getUserByEmail(req.body.email);

    if (existingUser && existingUser.length) {
      return res.status(409).send({ message: 'This user already exists' });
    }

    const hash = await hashPassword(req.body.password);
    const qrCodeDataUrl = await generateQRCode(secret.otpauth_url);

    const result = await executeQuery(
      'INSERT INTO users (name, email, password, secret_key, qrCode) VALUES (?, ?, ?, ?, ?)',
      [req.body.name, req.body.email, hash, secret.hex, qrCodeDataUrl]
    );

    // Send the QR code data URL and user data to the client
    return res.json({
      qrCode: qrCodeDataUrl,
      user: {
        id: result.insertId,
        name: req.body.name,
        email: req.body.email,
      },
    });
  } catch (err) {
    return res.status(500).send({ message: err.message });
  }
};

const getQRCode = async (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).send('No user specified');

  const result = await executeQuery('SELECT qrCode FROM users WHERE id = ?', [
    userId,
  ]);

  res.status(200).send(result[0]);
};

const enable2FA = async (req, res) => {
  try {
    const { otp, email } = req.body;

    // Fetch user using email
    let user = await getUserByEmail(email);

    if (user.length === 0) return res.status(404).send('user not found');

    user = user[0];

    // Verify the OTP using the secret key
    const secret = user.secret_key;

    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'hex',
      token: otp,
    });

    if (verified) {
      await executeQuery('UPDATE users SET is_verified = ? WHERE id = ?', [
        true,
        user.id,
      ]);

      const token = jwt.sign(
        { id: user.id, is_admin: user.is_admin },
        JWT_SECRET,
        {
          expiresIn: '31d',
        }
      );

      return res.json({ message: '2FA enabled successfully', token });
    } else {
      // OTP is invalid
      return res.status(401).json({ message: 'Invalid OTP' });
    }
  } catch (err) {
    console.error('Error enabling 2FA:', err);
    return res.status(500).json({ message: 'Error enabling 2FA' });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await getUserByEmail(req.body.email);

    if (!result.length) {
      return res
        .status(401)
        .send({ message: 'Email or Password is incorrect' });
    }

    const bcryptResult = await comparePassword(
      req.body.password,
      result[0].password
    );

    if (bcryptResult) {
      await updateLastLogin(result[0].id);
      return res.status(200).send({
        message: 'Successfully logged in',
        user: result[0],
      });
    }

    return res.status(401).send({ message: 'Password is incorrect' });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).send({ message: 'An error occurred during login' });
  }
};

const forgetPassword = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const email = req.body.email;
  try {
    let user = await getUserByEmail(email);

    user = user[0];

    if (user) {
      const randomString = randomstring.generate();
      const mailSubject = 'Forget Password';
      const content = `<p>Hi, ${user.name} \
        Please <a href="http://localhost:3000/reset-password?token=${randomString}">Click here</a> to reset your password</p>`;

      sendMail(email, mailSubject, content);

      await deletePasswordReset(email);

      await insertPasswordReset(email, randomString);

      return res.status(200).send({
        message: 'Email Sent Successfully for resetting password',
      });
    }

    return res.status(401).send({
      message: 'Email does not exist',
    });
  } catch (err) {
    console.error('Error in forgetPassword:', err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const resetPasswordLoad = async (req, res) => {
  try {
    const token = req.body.token;

    if (token === undefined) {
      return res.status(404).json({ message: 'Token not found' });
    }

    const passwordResetEntry = await getPasswordResetByToken(token);

    if (passwordResetEntry) {
      const user = await getUserByEmail(passwordResetEntry.email);

      if (user) {
        return res.status(200).send({ tokenValidated: true });
      } else {
        return res.status(404).json({ message: 'User not found' });
      }
    } else {
      return res.status(404).json({ message: 'Invalid token' });
    }
  } catch (err) {
    console.error('Error in resetPasswordLoad:', err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.body;

  const passwordResetDetails = await getPasswordResetByToken(token);

  if (!passwordResetDetails)
    return res.status(400).json({ message: 'invalid token' });

  try {
    const hash = await generateHash(req.body.password);

    await deletePasswordResetByEmail(passwordResetDetails.email);

    await updateUserPassword(passwordResetDetails.email, hash);

    return res.status(200).send({
      message: 'Password reset successfully',
    });
  } catch (err) {
    console.error('Error in resetPassword:', err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const saveUserDetail = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      country,
      language,
      profilePicture,
      user_id,
    } = req.body;

    // Construct the INSERT query with ON DUPLICATE KEY UPDATE
    const query = `
        INSERT INTO users_detail (first_name, last_name, phone, country, language, profile_picture, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          first_name = VALUES(first_name),
          last_name = VALUES(last_name),
          phone = VALUES(phone),
          country = VALUES(country),
          language = VALUES(language),
          profile_picture = VALUES(profile_picture)
      `;

    // Define the parameter values for the query
    const params = [
      firstName,
      lastName,
      phone,
      country,
      language,
      profilePicture,
      user_id,
    ];

    // Execute the query using the executeQuery function
    await executeQuery(query, params);

    return res
      .status(200)
      .json({ message: 'User details saved or updated successfully' });
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const getUserDetail = async (req, res) => {
  const { user_id } = req.body;

  try {
    const query = `
      SELECT first_name, last_name, phone, country, language, profile_picture
      FROM users_detail
      WHERE user_id = ?
    `;

    const params = [user_id];

    const result = await executeQuery(query, params);

    // Check if a user with the given user_id was found
    if (result.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userDetail = result[0];

    return res.status(200).json(userDetail);
  } catch (err) {
    console.log(err);
    return res
      .status(500)
      .json({ message: 'An error occurred while processing the request' });
  }
};

const getUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER(${db.escape(email)});`,
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
};

const hashPassword = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
};

const insertUser = (userData) => {
  return new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO users (name, email, password, secret_key) VALUES ('${
        userData.name
      }', ${db.escape(userData.email)}, ${db.escape(userData.hash)}, '${
        userData.secretKey
      }');`,
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
};

const generateQRCode = (otpauthUrl) => {
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(otpauthUrl, (err, dataUrl) => {
      if (err) {
        reject(err);
      } else {
        resolve(dataUrl);
      }
    });
  });
};

const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    db.query(query, params, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const comparePassword = (plainPassword, hashedPassword) => {
  return new Promise((resolve, reject) => {
    bcrypt.compare(plainPassword, hashedPassword, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const updateLastLogin = (userId) => {
  const query = `UPDATE users SET last_login = now() WHERE id = ${db.escape(
    userId
  )}`;
  return executeQuery(query);
};

const deletePasswordReset = (email) => {
  const query = 'DELETE FROM password_resets WHERE email = ?';
  return executeQuery(query, [email]);
};

const insertPasswordReset = (email, token) => {
  const query = 'INSERT INTO password_resets (email, token) VALUES (?, ?)';
  return executeQuery(query, [email, token]);
};

const getPasswordResetByToken = (token) => {
  const query = 'SELECT * FROM password_resets WHERE token = ? LIMIT 1';
  return executeQuery(query, [token]).then((result) => result[0]);
};

const generateHash = (password) => {
  return new Promise((resolve, reject) => {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        reject(err);
      } else {
        resolve(hash);
      }
    });
  });
};

const deletePasswordResetByEmail = (email) => {
  const query = `DELETE FROM password_resets WHERE email = ?`;
  return executeQuery(query, [email]);
};

const updateUserPassword = (email, hash) => {
  const query = `UPDATE users SET password = ? WHERE email = ?`;
  return executeQuery(query, [hash, email]);
};

const encodeToBase32 = (hex) => {
  const base32Alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; // RFC 4648 (encoding scheme)
  let bits = '';
  let result = '';

  // Convert the hex string to a binary string
  for (let i = 0; i < hex.length; i++) {
    bits += ('0000' + parseInt(hex[i], 16).toString(2)).slice(-4);
  }

  // Pad the binary string with zeros to a multiple of 5
  bits += '0'.repeat(5 - (bits.length % 5));

  // Convert the binary string to a base32 string
  for (let i = 0; i < bits.length; i += 5) {
    let index = parseInt(bits.slice(i, i + 5), 2);
    result += base32Alphabet[index];
  }

  result = result.slice(0, 32);

  return result;
};

module.exports = {
  register,
  login,
  forgetPassword,
  resetPasswordLoad,
  resetPassword,
  enable2FA,
  getQRCode,
  saveUserDetail,
  getUserDetail,
};
