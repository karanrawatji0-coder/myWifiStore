const router = require("express").Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");

router.post("/", protect, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    if (!items?.length) return res.status(400).json({ message: "Cart is empty" });

    const orderItems = [];
    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.active) {
        return res.status(400).json({ message: "A product is unavailable" });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `${product.name} has only ${product.stock} left` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image
      });
      total += product.price * item.quantity;
    }

    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      totalAmount: total,
      paymentMethod: "COD"
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/my", protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

router.get("/all", protect, adminOnly, async (req, res) => {
  const orders = await Order.find().populate("user", "name email phone").sort({ createdAt: -1 });
  res.json(orders);
});

router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  const allowed = ["Pending", "Accepted", "Processing", "Shipped", "Out for Delivery", "Delivered", "Rejected", "Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid status" });

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { orderStatus: req.body.status },
    { new: true }
  ).populate("user", "name email phone");

  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

module.exports = router;
