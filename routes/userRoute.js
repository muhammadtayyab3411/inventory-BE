const express = require("express");
const router = express.Router();
const {
  signUpValidation,
  loginValidation,
  forgetValidation,
} = require("../helpers/validation");
const userController = require("../controllers/userController");

router.post("/register", signUpValidation, userController.register);

router.post("/login", loginValidation, userController.login);

router.post(
  "/forget-password",
  forgetValidation,
  userController.forgetPassword
);

router.post("/enable-2fa", userController.enable2FA);

module.exports = router;
