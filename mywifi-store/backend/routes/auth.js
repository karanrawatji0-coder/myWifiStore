const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { sendOTPEmail } = require("../mailer");

function tokenFor(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists && exists.isVerified) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let user;
    if (exists && !exists.isVerified) {
      exists.name = name;
      exists.phone = phone;
      exists.password = hashed;
      exists.otp = otp;
      exists.otpExpires = otpExpires;
      user = await exists.save();
    } else {
      user = await User.create({
        name, email: email.toLowerCase(), phone, password: hashed, role: "customer",
        isVerified: false, otp, otpExpires
      });
    }

    const emailSent = await sendOTPEmail(user.email, user.name, otp);

    res.status(201).json({
      message: emailSent
        ? "We've sent a 6-digit verification code to your email."
        : "Account created, but the verification email could not be sent. Please try resending the code.",
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: "Email and code are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Incorrect code" });
    }
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Code has expired. Please request a new one." });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (user.isVerified) return res.status(400).json({ message: "Account already verified" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    const emailSent = await sendOTPEmail(user.email, user.name, otp);
    res.json({ message: emailSent ? "A new code has been sent to your email." : "Could not send email right now, please try again shortly." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || !(await bcrypt.compare(password || "", user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in.", needsVerification: true, email: user.email });
    }

    res.json({
      token: tokenFor(user),
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;