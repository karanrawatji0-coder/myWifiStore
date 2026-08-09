const express = require("express");

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const { protect, adminOnly } = require("../middleware/auth");

const router = express.Router();


// ==========================================
// ADMIN DASHBOARD STATISTICS
// ==========================================

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({
      role: "customer"
    });

    const totalProducts = await Product.countDocuments();

    const pendingOrders = await Order.countDocuments({
      status: "Pending"
    });

    const deliveredOrders = await Order.countDocuments({
      status: "Delivered"
    });

    res.json({
      totalUsers,
      totalProducts,
      pendingOrders,
      deliveredOrders
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load dashboard"
    });
  }
});


// ==========================================
// SEE ALL ORDERS
// ==========================================

router.get("/orders", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(orders);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load orders"
    });
  }
});


// ==========================================
// ACCEPT ORDER
// ==========================================

router.put("/orders/:id/accept", protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    order.status = "Accepted";

    await order.save();

    res.json({
      message: "Order accepted",
      order
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to accept order"
    });
  }
});


// ==========================================
// REJECT ORDER
// ==========================================

router.put("/orders/:id/reject", protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    order.status = "Rejected";

    await order.save();

    res.json({
      message: "Order rejected",
      order
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to reject order"
    });
  }
});


// ==========================================
// UPDATE DELIVERY STATUS
// ==========================================

router.put("/orders/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Accepted",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Rejected",
      "Cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status"
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    order.status = status;

    await order.save();

    res.json({
      message: "Order status updated",
      order
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update status"
    });
  }
});


// ==========================================
// SET DELIVERY DATE
// ==========================================

router.put("/orders/:id/delivery", protect, adminOnly, async (req, res) => {
  try {
    const { deliveryDate } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    order.deliveryDate = deliveryDate;

    await order.save();

    res.json({
      message: "Delivery date updated",
      order
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update delivery date"
    });
  }
});


// ==========================================
// SEE ALL PRODUCTS
// ==========================================

router.get("/products", protect, adminOnly, async (req, res) => {
  try {
    const products = await Product.find()
      .sort({ createdAt: -1 });

    res.json(products);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to load products"
    });
  }
});


// ==========================================
// MARK PRODUCT OUT OF STOCK
// ==========================================

router.put("/products/:id/out-of-stock", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    product.stock = 0;
    product.isAvailable = false;

    await product.save();

    res.json({
      message: "Product marked out of stock",
      product
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update product"
    });
  }
});


// ==========================================
// MAKE PRODUCT AVAILABLE AGAIN
// ==========================================

router.put("/products/:id/available", protect, adminOnly, async (req, res) => {
  try {
    const { stock } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    product.stock = Number(stock);

    product.isAvailable = Number(stock) > 0;

    await product.save();

    res.json({
      message: "Product availability updated",
      product
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to update product"
    });
  }
});


// ==========================================
// REMOVE PRODUCT
// ==========================================

router.delete("/products/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      message: "Product removed successfully"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to remove product"
    });
  }
});


module.exports = router;