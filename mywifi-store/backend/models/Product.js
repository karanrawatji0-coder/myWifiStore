const express = require("express");

const Product = require("../models/Product");

const {
authMiddleware,
adminMiddleware
} = require("../middleware/auth");

const router = express.Router();

// GET ALL PRODUCTS
router.get("/", async (req, res) => {
try {
const products = await Product.find().sort({
createdAt: -1
});


    res.json(products);

} catch (error) {
    res.status(500).json({
        message: "Failed to fetch products"
    });
}


});

// GET SINGLE PRODUCT
router.get("/:id", async (req, res) => {
try {
const product = await Product.findById(req.params.id);


    if (!product) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    res.json(product);

} catch (error) {
    res.status(500).json({
        message: "Failed to fetch product"
    });
}


});

// ADMIN - ADD PRODUCT
router.post(
"/",
authMiddleware,
adminMiddleware,
async (req, res) => {
try {
const {
name,
description,
price,
image,
stock
} = req.body;


        const product = await Product.create({
            name,
            description,
            price,
            image,
            stock: Number(stock),
            isAvailable: Number(stock) > 0
        });

        res.status(201).json({
            message: "Product added successfully",
            product
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to add product"
        });
    }
}


);

// ADMIN - UPDATE STOCK
router.put(
"/:id/stock",
authMiddleware,
adminMiddleware,
async (req, res) => {
try {
const stock = Number(req.body.stock);


        if (stock < 0) {
            return res.status(400).json({
                message: "Stock cannot be negative"
            });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                stock,
                isAvailable: stock > 0
            },
            {
                new: true
            }
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Stock updated successfully",
            product
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update stock"
        });
    }
}


);

// ADMIN - REMOVE PRODUCT
router.delete(
"/:id",
authMiddleware,
adminMiddleware,
async (req, res) => {
try {
const product = await Product.findByIdAndDelete(
req.params.id
);
 
        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({
            message: "Product removed successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to remove product"
        });
    }
}


);

module.exports = router;
