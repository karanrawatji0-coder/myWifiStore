const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function resetAdmin() {
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@mywifi.in";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  const hashed = await bcrypt.hash(adminPassword, 10);

  const admin = await User.findOneAndUpdate(
    { email: adminEmail.toLowerCase() },
    { password: hashed, role: "admin" },
    { new: true }
  );

  if (admin) {
    console.log(`Password reset for: ${adminEmail}`);
  } else {
    console.log(`No user found with email ${adminEmail}. Creating new admin...`);
    await User.create({
      name: "MyWiFi Admin",
      email: adminEmail.toLowerCase(),
      phone: "9999999999",
      password: hashed,
      role: "admin"
    });
    console.log(`Admin created: ${adminEmail}`);
  }

  await mongoose.disconnect();
}

resetAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});