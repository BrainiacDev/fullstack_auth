const bcrypt = require("bcryptjs");
const User = require("../models/user");
const crypto = require("crypto");
const {Resend} = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY); // Initialize Resend with your API key
const querystring = require("querystring");
require("dotenv").config();

// Auth Controllers

exports.getRegister = (req, res) => res.render("register", { alert: null });

exports.postRegister = async (req, res) => {
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    await User.create({ name, email, password: hashed });
    res.redirect("/login");
  } catch (err) {
    res.render("register", { alert: "Email already exists." });
  }
};

exports.getLogin = (req, res) => res.render("login", { alert: null });

exports.postLogin = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render("login", { alert: "Invalid credentials" });
  }
  req.session.userId = user._id;
  res.redirect("/dashboard");
};

exports.getDashboard = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  const user = await User.findById(req.session.userId);
  res.render("dashboard", { name: user.name });
};

exports.postLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

// Forgot Password (no email/token flow)
exports.getForgotPassword = (req, res) => {
  res.render("forgotPassword", { alert: null });
};

exports.postForgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.render("forgotPassword", { alert: "Email not found" });

  const token = crypto.randomBytes(20).toString("hex"); // Generate a reset token
  user.resetToken = token;
  user.resetTokenExpire = Date.now() + 3600000; // Token expires in 1 hour
  await user.save();

  const encodedToken = Buffer.from(token).toString("base64url"); // URL-safe base64

  const resetLink = `${req.protocol}://${req.get("host")}/reset-password/${encodedToken}`; // Generate reset link with token

  try {
    await resend.emails.send({
      from: "Password Reset <onboarding@resend.dev>",
      to: [user.email],
      subject: "Reset your password",
      html: `<p>Hi ${user.name},</p>
             <p>Click the link below to reset your password:</p>
             <a href="${resetLink}">${resetLink}</a>
             <p>This link will expire in 1 hour.</p>`,
    });

    console.log(
      `Password reset link: http://localhost:3000/reset-password/${token}`
    ); // Log the link for debugging

    // Redirect with link as query parameter
    res.redirect(
      "/password-reset-confirmation?" +
        querystring.stringify({ link: resetLink })
    );
  } catch (error) {
    console.error("Email sending failed:", error);
    res.render("forgotPassword", {
      alert: "Failed to send email. Please try again.",
    });
  }
};


exports.getResetPassword = async (req, res) => {
    //   const token = req.params.token; // Get the token from the URL
    const encodedToken = req.params.token;
    const token = Buffer.from(encodedToken, "base64url").toString("utf8");

  console.log("Received token:", token); // Log the token for debugging

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() }, // Check if token is still valid
  });

  if (!user) {
    return res.send("Token expired or invalid");
  }

  res.render("resetPassword", { token: encodedToken }); // Pass the token to the view
};


exports.postResetPassword = async (req, res) => {
  const encodedToken = req.body.token;
  const token = Buffer.from(encodedToken, "base64url").toString("utf8");
  const { password, confirmPassword } = req.body; // Get the token and new password from the form submission

  // Check if passwords match
  if (password !== confirmPassword) {
    return res.render("resetPassword", {
        alert: "Passwords do not match.",
        token: encodedToken, // Pass the token back to the view
    });
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpire: { $gt: Date.now() }, // Check if token is still valid
  });

  if (!user) {
    return res.send("Token expired or invalid");
  }

  // Hash the new password and update the user
  user.password = await bcrypt.hash(password, 10);
  user.resetToken = undefined; // Clear the reset token and expiration
  user.resetTokenExpire = undefined;
  await user.save();

  res.redirect("/reset-success"); // Redirect to login after resetting the password
};

