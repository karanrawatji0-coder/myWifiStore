const express = require("express");

const Order = require("../models/Order");
const Product = require("../models/Product");

const {
authMiddleware,
adminMiddleware
} = require("../middleware/auth");

const router = express.Router();

// USER - CREATE ORDER
router.post("/", authMiddleware, async (req, res) => {
try {
const {
items,
shippingAddress
} = req.body;


    if (!items || items.length === 0) {
        return res.status(400).json({
            message: "Cart is empty"
        });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {

        const product = await Product.findById(
            item.product
        );

        if (!product) {
            return res.status(404).json({
                message: `Product not found`
            });
        }

        if (product.stock < item.quantity) {
            return res.status(400).json({
                message: `${product.name} is out of stock`
            });
        }

        orderItems.push({
            product: product._id,
            name: product.name,
            quantity: item.quantity,
            price: product.price
        });

        totalAmount +=
            product.price * item.quantity;
    }


    // REDUCE STOCK
    for (const item of items) {

        const product = await Product.findById(
            item.product
        );

        product.stock -= item.quantity;

        product.isAvailable =
            product.stock > 0;

        await product.save();
    }


    const order = await Order.create({
        user: req.user.id,
        items: orderItems,
        totalAmount,
        shippingAddress
    });

    const populatedOrder =
        await Order.findById(order._id)
            .populate("user", "name email");

    res.status(201).json({
        message: "Order placed successfully",
        order: populatedOrder
    });

} catch (error) {

    console.error(error);

    res.status(500).json({
        message: "Failed to create order"
    });
}

});

// USER - MY ORDERS
router.get("/my", authMiddleware, async (req, res) => {
try {


    const orders = await Order.find({
        user: req.user.id
    })
    .populate("items.product")
    .sort({
        createdAt: -1
    });

    res.json(orders);

} catch (error) {

    res.status(500).json({
        message: "Failed to fetch orders"
    });
}


});

// ADMIN - ALL ORDERS
router.get(
"/admin/all",
authMiddleware,
adminMiddleware,
async (req, res) => {

    try {

        const orders = await Order.find()
            .populate(
                "user",
                "name email"
            )
            .populate(
                "items.product"
            )
            .sort({
                createdAt: -1
            });

        res.json(orders);

    } catch (error) {

        res.status(500).json({
            message: "Failed to fetch orders"
        });
    }
}


);

// ADMIN - UPDATE ORDER STATUS
router.put(
"/admin/:id/status",
authMiddleware,
adminMiddleware,
async (req, res) => {


    try {

        const {
            status,
            deliveryDate
        } = req.body;

        const allowedStatuses = [
            "Pending",
            "Accepted",
            "Shipped",
            "Out for Delivery",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const updateData = {
            status
        };

        if (deliveryDate) {
            updateData.deliveryDate =
                new Date(deliveryDate);
        }

        const order =
            await Order.findByIdAndUpdate(
                req.params.id,
                updateData,
                {
                    new: true
                }
            )
            .populate(
                "user",
                "name email"
            )
            .populate(
                "items.product"
            );

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        res.json({
            message: "Order updated successfully",
            order
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to update order"
        });
    }
}


);

module.exports = router;
