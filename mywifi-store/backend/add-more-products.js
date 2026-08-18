const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");

const newProducts = [
  {
    name: "MyWiFi Smart Dome Camera",
    description: "1080p indoor smart dome camera with night vision and motion alerts.",
    category: "Security Camera",
    price: 1799,
    stock: 25,
    image: "https://placehold.co/600x600/dc2626/ffffff?text=Dome+Camera"
  },
  {
    name: "MyWiFi Outdoor Bullet Camera",
    description: "Weatherproof outdoor bullet camera with 2K resolution and IR night vision.",
    category: "Security Camera",
    price: 2999,
    stock: 18,
    image: "https://placehold.co/600x600/b91c1c/ffffff?text=Bullet+Camera"
  },
  {
    name: "MyWiFi Home Broadband — 100 Mbps",
    description: "Unlimited home broadband connection, 100 Mbps, with free installation.",
    category: "Broadband Connection",
    price: 799,
    stock: 999,
    image: "https://placehold.co/600x600/059669/ffffff?text=Broadband+100Mbps"
  },
  {
    name: "MyWiFi Home Broadband — 300 Mbps",
    description: "Unlimited home broadband connection, 300 Mbps, ideal for streaming and gaming.",
    category: "Broadband Connection",
    price: 1299,
    stock: 999,
    image: "https://placehold.co/600x600/047857/ffffff?text=Broadband+300Mbps"
  },
  {
    name: "MyWiFi Business Lease Line — 50 Mbps",
    description: "Dedicated 1:1 leased line for businesses, 50 Mbps symmetric, 99.9% uptime SLA.",
    category: "Lease Line",
    price: 12999,
    stock: 50,
    image: "https://placehold.co/600x600/ea580c/ffffff?text=Lease+Line+50Mbps"
  },
  {
    name: "MyWiFi Business Lease Line — 100 Mbps",
    description: "Dedicated 1:1 leased line for businesses, 100 Mbps symmetric, priority support.",
    category: "Lease Line",
    price: 21999,
    stock: 50,
    image: "https://placehold.co/600x600/c2410c/ffffff?text=Lease+Line+100Mbps"
  }
];

async function addProducts() {
  await mongoose.connect(process.env.MONGO_URI);

  let addedCount = 0;
  for (const p of newProducts) {
    const exists = await Product.findOne({ name: p.name });
    if (!exists) {
      await Product.create(p);
      addedCount++;
      console.log(`Added: ${p.name}`);
    } else {
      console.log(`Already exists, skipped: ${p.name}`);
    }
  }

  console.log(`Done. ${addedCount} new product(s) added.`);
  await mongoose.disconnect();
}

addProducts().catch(err => {
  console.error(err);
  process.exit(1);
});
