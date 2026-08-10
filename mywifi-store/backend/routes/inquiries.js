const router = require("express").Router();
const Inquiry = require("../models/Inquiry");
const { protect, adminOnly } = require("../middleware/auth");

async function generateAIReply(customerMessage) {
  if (!process.env.GEMINI_API_KEY) return null;

  const systemContext = `You are a helpful customer support assistant for MyWiFi Store, an Indian online store selling WiFi routers (4G, 5G, AC1200 and similar).
Known store facts:
- Payment method: Cash on Delivery (COD) only
- Delivery: across India, typically 3-7 business days
- Returns/replacement: customer should contact support within 7 days of delivery
- Warranty: standard manufacturer warranty applies per product

Reply warmly and briefly (2-4 sentences) to the customer's message below.
If the question needs specific order details you don't have access to (like a specific order's tracking status), politely say our support team will follow up with those details shortly. Never invent order numbers, prices, or policies you are not sure about.

Customer message: "${customerMessage}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: systemContext }]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.error("AI reply generation failed:", err.message);
    return null;
  }
}

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }

    const aiReply = await generateAIReply(message);

    const inquiry = await Inquiry.create({
      name,
      email,
      phone,
      message,
      aiReply: aiReply || ""
    });

    res.status(201).json(inquiry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/all", protect, adminOnly, async (req, res) => {
  const inquiries = await Inquiry.find().sort({ createdAt: -1 });
  res.json(inquiries);
});

router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  const allowed = ["New", "Resolved"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });

  const inquiry = await Inquiry.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  res.json(inquiry);
});

module.exports = router;