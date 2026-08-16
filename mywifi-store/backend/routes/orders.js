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
      if (!product || !product.isAvailable) {
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

    const now = new Date();
    const estimatedDelivery = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress,
      totalAmount: total,
      paymentMethod: "COD",
      status: "Accepted",
      deliveryDate: estimatedDelivery,
      statusHistory: [{ status: "Accepted", date: now }]
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

// Customer can cancel any time before the order is Delivered, Cancelled, or Rejected
const CUSTOMER_CANCELLABLE_STATUSES = ["Accepted", "Processing", "Shipped", "Out for Delivery"];

router.patch("/:id/cancel", protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only cancel your own orders" });
    }

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.status)) {
      return res.status(400).json({ message: `This order can no longer be cancelled (current status: ${order.status})` });
    }

    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
    }

    order.status = "Cancelled";
    order.statusHistory.push({ status: "Cancelled", date: new Date() });
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Customer can request a replacement once the order is Delivered
router.patch("/:id/request-replacement", protect, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please describe the issue with the product" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (String(order.user) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only request replacement for your own orders" });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ message: "Replacement can only be requested after the order is delivered" });
    }

    if (order.replacementRequested) {
      return res.status(400).json({ message: "A replacement has already been requested for this order" });
    }

    order.replacementRequested = true;
    order.replacementReason = reason.trim();
    order.replacementStatus = "Requested";
    order.statusHistory.push({ status: "Replacement Requested", date: new Date() });
    await order.save();

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin approves/rejects a replacement request
router.patch("/:id/replacement-status", protect, adminOnly, async (req, res) => {
  const allowed = ["Approved", "Rejected"];
  const { replacementStatus } = req.body;
  if (!allowed.includes(replacementStatus)) {
    return res.status(400).json({ message: "Invalid replacement status" });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: "Order not found" });

  order.replacementStatus = replacementStatus;
  order.statusHistory.push({ status: `Replacement ${replacementStatus}`, date: new Date() });
  await order.save();

  res.json(order);
});

router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  const allowed = ["Pending", "Accepted", "Processing", "Shipped", "Out for Delivery", "Delivered", "Rejected", "Cancelled"];
  const { status, deliveryDate } = req.body;

  const update = {};
  const push = {};

  if (status !== undefined) {
    if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid status" });
    update.status = status;
    push.statusHistory = { status, date: new Date() };
  }
  if (deliveryDate !== undefined) {
    update.deliveryDate = deliveryDate;
  }

  const query = { $set: update };
  if (push.statusHistory) query.$push = { statusHistory: push.statusHistory };

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    query,
    { new: true }
  ).populate("user", "name email phone");

  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

module.exports = router;
