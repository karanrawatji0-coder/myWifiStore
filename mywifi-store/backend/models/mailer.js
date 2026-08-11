const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTPEmail(toEmail, name, otp) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("EMAIL_USER or EMAIL_PASS not set — cannot send OTP email");
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"MyWiFi Store" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Verify your MyWiFi Store account",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
          <h2>Hi ${name},</h2>
          <p>Thanks for registering at MyWiFi Store. Use the code below to verify your email address:</p>
          <div style="font-size:32px;font-weight:800;letter-spacing:6px;background:#f1f5f9;padding:16px 24px;border-radius:10px;text-align:center;margin:20px 0">${otp}</div>
          <p>This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `
    });
    return true;
  } catch (err) {
    console.error("Failed to send OTP email:", err.message);
    return false;
  }
}

module.exports = { sendOTPEmail };