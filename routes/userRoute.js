const express = require('express');
const router = express.Router();
const {
  signUpValidation,
  loginValidation,
  forgetValidation,
} = require('../helpers/validation');
const userController = require('../controllers/userController');
const auth = require('../middlewares/auth');

router.post('/register', signUpValidation, userController.register);

router.post('/login', loginValidation, userController.login);

router.post(
  '/forget-password',
  forgetValidation,
  userController.forgetPassword
);

router.post('/enable-2fa', userController.enable2FA);

router.post('/getQrCode', userController.getQRCode);

router.post('/validateResetPasswordToken', userController.resetPasswordLoad);

router.post('/resetPassword', userController.resetPassword);

router.get('/isUserLoggedIn', auth, (req, res) =>
  res.status(200).json({ message: 'user logged in' })
);

router.get('/userDetail', auth, (req, res) =>
  userController.getUserDetail(req, res)
);

router.post('/userDetail', auth, (req, res) =>
  userController.saveUserDetail(req, res)
);

module.exports = router;
