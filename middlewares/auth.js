const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).send('Access Denied!. No token provided');

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).send('Invalid token');
  }
};
