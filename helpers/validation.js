const { check } = require("express-validator");

exports.signUpValidation = [
  check("name", "Name is required").not().isEmpty(),
  check("email", "Please enter a valid email")
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: true }),
  check("password", "Password is required").isLength({ min: 6 }),
];

exports.loginValidation = [
  check("email", "Please enter a valid email")
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: true }),
  check("password", "Password should be of minimum length 6").isLength({
    min: 6,
  }),
];

exports.forgetValidation = [
  check("email", "Please enter a valid email")
    .isEmail()
    .normalizeEmail({ gmail_remove_dots: true }),
];
