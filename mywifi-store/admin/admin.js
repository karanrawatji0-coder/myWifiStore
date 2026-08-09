const express = require("express");

const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const {
    authMiddleware,
    adminMiddleware
} = require("../middleware/auth");

const router = express.Router();

router.get(
    "/stats",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
        try {
            const totalUsers = await User.countDocuments({
                role: "user"
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
                message: "Failed to load admin statistics"
            });
        }
    }
);

module.exports = router;