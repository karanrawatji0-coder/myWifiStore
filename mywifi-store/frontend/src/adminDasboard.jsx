import React, { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

function AdminDashboard() {


const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    deliveredOrders: 0
});

const [orders, setOrders] = useState([]);
const [products, setProducts] = useState([]);

const [activeTab, setActiveTab] =
    useState("dashboard");

const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    image: "",
    stock: ""
});


const token =
    localStorage.getItem("token");


const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
};


// LOAD DASHBOARD
const loadDashboard = async () => {

    const response = await fetch(
        `${API}/admin/stats`,
        {
            headers
        }
    );

    if (response.ok) {
        const data = await response.json();
        setStats(data);
    }
};


// LOAD ORDERS
const loadOrders = async () => {

    const response = await fetch(
        `${API}/orders/admin/all`,
        {
            headers
        }
    );

    if (response.ok) {

        const data =
            await response.json();

        setOrders(data);
    }
};


// LOAD PRODUCTS
const loadProducts = async () => {

    const response = await fetch(
        `${API}/products`
    );

    if (response.ok) {

        const data =
            await response.json();

        setProducts(data);
    }
};


useEffect(() => {

    loadDashboard();
    loadOrders();
    loadProducts();

}, []);


// UPDATE ORDER
const updateOrder = async (
    id,
    status,
    deliveryDate = null
) => {

    const response = await fetch(
        `${API}/orders/admin/${id}/status`,
        {
            method: "PUT",
            headers,
            body: JSON.stringify({
                status,
                deliveryDate
            })
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    alert("Order updated");

    loadOrders();
    loadDashboard();
};


// CHANGE STOCK
const updateStock = async (
    id,
    stock
) => {

    const response = await fetch(
        `${API}/products/${id}/stock`,
        {
            method: "PUT",
            headers,
            body: JSON.stringify({
                stock: Number(stock)
            })
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    loadProducts();
    loadDashboard();
};


// DELETE PRODUCT
const deleteProduct = async (id) => {

    if (
        !window.confirm(
            "Remove this product?"
        )
    ) {
        return;
    }

    const response = await fetch(
        `${API}/products/${id}`,
        {
            method: "DELETE",
            headers
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    loadProducts();
    loadDashboard();
};


// ADD PRODUCT
const addProduct = async (e) => {

    e.preventDefault();

    const response = await fetch(
        `${API}/products`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                ...newProduct,
                price: Number(
                    newProduct.price
                ),
                stock: Number(
                    newProduct.stock
                )
            })
        }
    );

    const data =
        await response.json();

    if (!response.ok) {
        alert(data.message);
        return;
    }

    alert(
        "Product added successfully"
    );

    setNewProduct({
        name: "",
        description: "",
        price: "",
        image: "",
        stock: ""
    });

    loadProducts();
    loadDashboard();
};


return (

    <div style={{
        padding: "30px",
        fontFamily: "Arial"
    }}>

        <h1>MyWiFi Admin Dashboard</h1>


        {/* NAVIGATION */}

        <div style={{
            display: "flex",
            gap: "10px",
            marginBottom: "30px"
        }}>

            <button
                onClick={() =>
                    setActiveTab(
                        "dashboard"
                    )
                }
            >
                Dashboard
            </button>

            <button
                onClick={() =>
                    setActiveTab("orders")
                }
            >
                Orders
            </button>

            <button
                onClick={() =>
                    setActiveTab(
                        "products"
                    )
                }
            >
                Products
            </button>

        </div>


        {/* DASHBOARD */}

        {activeTab === "dashboard" && (

            <div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(4, 1fr)",
                    gap: "20px"
                }}>

                    <div>
                        <h2>
                            {stats.totalUsers}
                        </h2>
                        <p>Total Users</p>
                    </div>

                    <div>
                        <h2>
                            {stats.totalProducts}
                        </h2>
                        <p>Total Products</p>
                    </div>

                    <div>
                        <h2>
                            {stats.pendingOrders}
                        </h2>
                        <p>Pending Orders</p>
                    </div>

                    <div>
                        <h2>
                            {stats.deliveredOrders}
                        </h2>
                        <p>Delivered Orders</p>
                    </div>

                </div>

            </div>
        )}


        {/* ORDERS */}

        {activeTab === "orders" && (

            <div>

                <h2>Orders</h2>

                {orders.length === 0 && (
                    <p>No orders found.</p>
                )}

                {orders.map(order => (

                    <div
                        key={order._id}
                        style={{
                            border:
                                "1px solid #ccc",
                            padding: "20px",
                            marginBottom:
                                "20px"
                        }}
                    >

                        <h3>
                            Order #
                            {order._id.slice(-6)}
                        </h3>

                        <p>
                            Customer:{" "}
                            <b>
                                {
                                    order.user
                                        ?.name
                                }
                            </b>
                        </p>

                        <p>
                            Email:{" "}
                            {
                                order.user
                                    ?.email
                            }
                        </p>

                        <h4>
                            Purchased Items
                        </h4>

                        {order.items.map(
                            (item, index) => (

                                <p
                                    key={index}
                                >
                                    {item.name}
                                    {" × "}
                                    {item.quantity}
                                    {" — ₹"}
                                    {item.price}
                                </p>

                            )
                        )}

                        <p>
                            Total:
                            <b>
                                {" ₹"}
                                {
                                    order.totalAmount
                                }
                            </b>
                        </p>

                        <p>
                            Status:
                            {" "}
                            <b>
                                {order.status}
                            </b>
                        </p>


                        <p>
                            Delivery Date:
                            {" "}
                            {order.deliveryDate
                                ? new Date(
                                    order.deliveryDate
                                ).toLocaleDateString()
                                : "Not set"}
                        </p>


                        {/* ACCEPT */}

                        {order.status ===
                            "Pending" && (

                            <button
                                onClick={() =>
                                    updateOrder(
                                        order._id,
                                        "Accepted"
                                    )
                                }
                            >
                                Accept Order
                            </button>

                        )}


                        {/* DELIVERY DATE */}

                        {order.status !==
                            "Delivered" &&
                            order.status !==
                            "Cancelled" && (

                            <div style={{
                                marginTop:
                                    "10px"
                            }}>

                                <input
                                    type="date"
                                    id={`date-${order._id}`}
                                />

                                <button
                                    onClick={() => {

                                        const date =
                                            document
                                                .getElementById(
                                                    `date-${order._id}`
                                                )
                                                .value;

                                        if (!date) {
                                            alert(
                                                "Select delivery date"
                                            );
                                            return;
                                        }

                                        updateOrder(
                                            order._id,
                                            order.status,
                                            date
                                        );

                                    }}
                                >
                                    Set Delivery Date
                                </button>

                            </div>

                        )}


                        {/* SHIPPED */}

                        {order.status ===
                            "Accepted" && (

                            <button
                                onClick={() =>
                                    updateOrder(
                                        order._id,
                                        "Shipped"
                                    )
                                }
                            >
                                Mark Shipped
                            </button>

                        )}


                        {/* OUT FOR DELIVERY */}

                        {order.status ===
                            "Shipped" && (

                            <button
                                onClick={() =>
                                    updateOrder(
                                        order._id,
                                        "Out for Delivery"
                                    )
                                }
                            >
                                Out for Delivery
                            </button>

                        )}


                        {/* DELIVERED */}

                        {order.status ===
                            "Out for Delivery" && (

                            <button
                                onClick={() =>
                                    updateOrder(
                                        order._id,
                                        "Delivered"
                                    )
                                }
                            >
                                Mark Delivered
                            </button>

                        )}

                    </div>

                ))}

            </div>

        )}


        {/* PRODUCTS */}

        {activeTab === "products" && (

            <div>

                <h2>Products</h2>


                {/* ADD PRODUCT */}

                <form
                    onSubmit={addProduct}
                    style={{
                        border:
                            "1px solid #ccc",
                        padding: "20px",
                        marginBottom:
                            "30px"
                    }}
                >

                    <h3>
                        Add Product
                    </h3>

                    <input
                        placeholder="Product name"
                        value={
                            newProduct.name
                        }
                        onChange={e =>
                            setNewProduct({
                                ...newProduct,
                                name:
                                    e.target.value
                            })
                        }
                        required
                    />

                    <br /><br />

                    <input
                        placeholder="Description"
                        value={
                            newProduct.description
                        }
                        onChange={e =>
                            setNewProduct({
                                ...newProduct,
                                description:
                                    e.target.value
                            })
                        }
                    />

                    <br /><br />

                    <input
                        type="number"
                        placeholder="Price"
                        value={
                            newProduct.price
                        }
                        onChange={e =>
                            setNewProduct({
                                ...newProduct,
                                price:
                                    e.target.value
                            })
                        }
                        required
                    />

                    <br /><br />

                    <input
                        placeholder="Image URL"
                        value={
                            newProduct.image
                        }
                        onChange={e =>
                            setNewProduct({
                                ...newProduct,
                                image:
                                    e.target.value
                            })
                        }
                    />

                    <br /><br />

                    <input
                        type="number"
                        placeholder="Stock"
                        value={
                            newProduct.stock
                        }
                        onChange={e =>
                            setNewProduct({
                                ...newProduct,
                                stock:
                                    e.target.value
                            })
                        }
                        required
                    />

                    <br /><br />

                    <button type="submit">
                        Add Product
                    </button>

                </form>


                {/* PRODUCT LIST */}

                {products.map(product => (

                    <div
                        key={product._id}
                        style={{
                            border:
                                "1px solid #ccc",
                            padding: "15px",
                            marginBottom:
                                "15px"
                        }}
                    >

                        <h3>
                            {product.name}
                        </h3>

                        <p>
                            ₹{product.price}
                        </p>

                        <p>
                            Stock:
                            {" "}
                            {product.stock}
                        </p>


                        {product.stock === 0 && (

                            <strong>
                                OUT OF STOCK
                            </strong>

                        )}


                        <br /><br />


                        <input
                            type="number"
                            min="0"
                            defaultValue={
                                product.stock
                            }
                            onChange={e =>
                                updateStock(
                                    product._id,
                                    e.target.value
                                )
                            }
                        />


                        <button
                            onClick={() =>
                                deleteProduct(
                                    product._id
                                )
                            }
                        >
                            Remove Product
                        </button>

                    </div>

                ))}

            </div>

        )}

    </div>
);


}

export default AdminDashboard;
