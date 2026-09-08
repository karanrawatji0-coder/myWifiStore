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

const PHONE_PATTERN = /^[6-9]\d{9}$/;

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

    if (!PHONE_PATTERN.test(phone)) {
      return res.status(400).json({ message: "Please enter a valid 10-digit mobile number" });
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

    res.status(201).json({
      message: "We're sending a 6-digit verification code to your email — it should arrive shortly.",
      email: user.email
    });

    // Send the email after responding, so the request doesn't wait on it
    sendOTPEmail(user.email, user.name, otp, "verify").catch(err => {
      console.error("Failed to send verification email:", err.message);
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

    res.json({ message: "A new code is on its way to your email." });

    sendOTPEmail(user.email, user.name, otp, "verify").catch(err => {
      console.error("Failed to resend verification email:", err.message);
    });
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

// Forgot password: send a reset code
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    // Don't reveal whether the account exists
    if (!user) {
      return res.json({ message: "If an account exists for this email, a reset code has been sent." });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    res.json({ message: "If an account exists for this email, a reset code has been sent.", email: user.email });

    sendOTPEmail(user.email, user.name, otp, "reset").catch(err => {
      console.error("Failed to send reset email:", err.message);
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Reset password using the code
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, code and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "Account not found" });

    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ message: "Incorrect code" });
    }
    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "Code has expired. Please request a new one." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
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

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;