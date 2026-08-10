const router = require("express").Router();
const Inquiry = require("../models/Inquiry");
const { protect, adminOnly } = require("../middleware/auth");

router.post("/", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Name, email and message are required" });
    }
    const inquiry = await Inquiry.create({ name, email, phone, message });
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