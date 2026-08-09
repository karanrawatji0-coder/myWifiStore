const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Product = require("./models/Product");

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@mywifi.in";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@12345";

  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const password = await bcrypt.hash(adminPassword, 10);
    await User.create({
      name: "MyWiFi Admin",
      email: adminEmail,
      phone: "9999999999",
      password,
      role: "admin"
    });
    console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log("Admin already exists");
  }

  if (await Product.countDocuments() === 0) {
    await Product.insertMany([
      {
        name: "MyWiFi 4G LTE Router",
        description: "Fast 4G LTE WiFi router for home and office use.",
        category: "4G Router",
        price: 2499,
        stock: 20,
        image: "https://placehold.co/600x400?text=4G+Router"
      },
      {
        name: "MyWiFi Dual Band AC1200",
        description: "Dual-band AC1200 router for high-speed home networking.",
        category: "WiFi Router",
        price: 3299,
        stock: 15,
        image: "https://placehold.co/600x400?text=AC1200"
      },
      {
        name: "MyWiFi 5G CPE",
        description: "5G CPE router with high-speed wireless connectivity.",
        category: "5G Router",
        price: 8999,
        stock: 8,
        image: "https://placehold.co/600x400?text=5G+CPE"
      }
    ]);
    console.log("Sample products added");
  }

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
