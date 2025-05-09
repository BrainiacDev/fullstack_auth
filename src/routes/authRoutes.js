const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/register", authController.getRegister);
router.post("/register", authController.postRegister);

router.get("/login", authController.getLogin);
router.post("/login", authController.postLogin);

router.get("/dashboard", authController.getDashboard);
router.post("/logout", authController.postLogout);

// Updated Forgot Password Flow
router.get("/forgot-password", authController.getForgotPassword);
router.post("/forgot-password", authController.postForgotPassword);

// Reset Password Flow (Token-based)
router.get("/reset-password/:token", authController.getResetPassword); // Token passed in URL
router.post("/reset-password", authController.postResetPassword); // Handle reset form submission

router.get("/password-reset-confirmation", (req, res) => {
  const { link } = req.query;
  res.render("passwordResetConfirmation", { link });
});

router.get("/reset-success", (req, res) => {
  res.render("resetSuccess");
});


module.exports = router;
