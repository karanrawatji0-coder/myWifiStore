import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "./api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function Navbar({ user, cartCount, logout }) {
  return (
    <header className="navbar">
      <Link className="brand" to="/">MyWiFi Store</Link>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/categories">Products</NavLink>
        {user && <NavLink to="/orders">My Orders</NavLink>}
        <NavLink to="/contact">Contact Us</NavLink>
        {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
        <NavLink to="/cart">Cart ({cartCount})</NavLink>
        {user ? (
          <button className="link-btn" onClick={logout}>Logout</button>
        ) : (
          <>
            <NavLink to="/login">Login</NavLink>
            <NavLink to="/register">Register</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

function Home() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">FAST • RELIABLE • INDIA-WIDE</p>
          <h1>WiFi products delivered across India.</h1>
          <p>Shop routers and connectivity products with simple ordering and Cash on Delivery.</p>
          <Link className="btn" to="/categories">Shop WiFi Products</Link>
        </div>
      </section>
      <section className="features">
        <div><b>🇮🇳 India-wide delivery</b><span>Ship to your address anywhere in India.</span></div>
        <div><b>📦 Easy ordering</b><span>Order online and track your status.</span></div>
        <div><b>💵 Cash on Delivery</b><span>Pay when your order arrives.</span></div>
      </section>
    </main>
  );
}

const CATEGORY_ICONS = {
  "WiFi Router": "📶",
  "4G Router": "📡",
  "5G Router": "🛰️",
  "Security Camera": "📷",
  "Broadband Connection": "🌐",
  "Lease Line": "🔌",
  "Accessories": "🧰",
  "Other": "📦"
};

function Categories() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api("/products").then(setProducts).catch(e => setError(e.message));
  }, []);

  const categories = {};
  products.forEach(p => {
    const cat = p.category || "Other";
    if (!categories[cat]) categories[cat] = { count: 0, image: p.image };
    categories[cat].count += 1;
  });

  return (
    <main className="container">
      <div className="page-head">
        <div><h2>Shop by Category</h2><p>Choose a category to see available products.</p></div>
      </div>
      {error && <div className="error">{error}</div>}
      {!Object.keys(categories).length ? <div className="empty">No products yet.</div> :
        <div className="category-grid">
          {Object.entries(categories).map(([cat, info]) => (
            <div key={cat} className="category-card" onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}>
              <h3>{cat}</h3>
              <div className="category-photo-wrap">
                {info.image ? (
                  <img src={info.image} alt={cat} className="category-photo-img" />
                ) : (
                  <div className="category-photo-fallback">{CATEGORY_ICONS[cat] || "📦"}</div>
                )}
              </div>
              <span className="category-see-more">See more <span className="arrow">→</span></span>
            </div>
          ))}
          <div className="category-card" onClick={() => navigate("/products")}>
            <h3>All Products</h3>
            <div className="category-photo-wrap">
              <div className="category-photo-fallback">🗂️</div>
            </div>
            <span className="category-see-more">See more <span className="arrow">→</span></span>
          </div>
        </div>
      }
    </main>
  );
}

function Products({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "";

  useEffect(() => {
    api("/products").then(setProducts).catch(e => setError(e.message));
  }, []);

  const filtered = products.filter(p => {
    const matchesCategory = !activeCategory || p.category === activeCategory;
    const matchesSearch = `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="container">
      <div className="page-head">
        <div>
          <h2>{activeCategory || "All Products"}</h2>
          <p>{activeCategory ? `Browsing ${activeCategory}` : "Choose a product for your home or office."} <Link to="/categories">Change category</Link></p>
        </div>
        <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
      {!filtered.length ? <div className="empty">No products found.</div> :
        <div className="grid">
          {filtered.map(p => (
            <article className="card" key={p._id}>
              <img src={p.image} alt={p.name} />
              <div className="card-body">
                <small>{p.category}</small>
                <h3>{p.name}</h3>
                <p>{p.description}</p>
                <div className="price">₹{p.price.toLocaleString("en-IN")}</div>
                <p className={p.stock ? "stock" : "out"}>{p.stock ? `${p.stock} in stock` : "Out of stock"}</p>
                <button className="btn full" disabled={!p.stock} onClick={() => addToCart(p)}>Add to Cart</button>
              </div>
            </article>
          ))}
        </div>
      }
    </main>
  );
}

function Login({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [needsVerification, setNeedsVerification] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      navigate(data.user.role === "admin" ? "/admin" : "/products");
    } catch (e) {
      if (e.message && e.message.toLowerCase().includes("verify")) {
        setNeedsVerification(form.email);
      } else {
        setError(e.message);
      }
    }
  }

  if (needsVerification) {
    return <VerifyOTP email={needsVerification} setUser={setUser} onVerified={() => navigate("/products")} autoSend />;
  }

  return <AuthForm title="Login" submit={submit} form={form} setForm={setForm} error={error} button="Login" />;
}

function Register({ setUser }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const data = await api("/auth/register", { method: "POST", body: JSON.stringify(form) });
      setPendingEmail(data.email);
    } catch (e) { setError(e.message); }
  }

  if (pendingEmail) {
    return <VerifyOTP email={pendingEmail} setUser={setUser} onVerified={() => navigate("/products")} />;
  }

  return <AuthForm title="Create Account" submit={submit} form={form} setForm={setForm} error={error} button="Register" register />;
}

function VerifyOTP({ email, setUser, onVerified, autoSend }) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(autoSend ? "Sending a verification code to your email..." : `We've sent a 6-digit code to ${email}. Enter it below to verify your account.`);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!autoSend) return;
    api("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) })
      .then(data => setNotice(data.message))
      .catch(e => setError(e.message));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      onVerified();
    } catch (e) { setError(e.message); }
    setBusy(false);
  }

  async function resend() {
    setError("");
    setNotice("");
    try {
      const data = await api("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email }) });
      setNotice(data.message);
    } catch (e) { setError(e.message); }
  }

  return (
    <main className="auth">
      <form className="form-card" onSubmit={submit}>
        <h2>Verify Your Email</h2>
        {notice && <div className="notice">{notice}</div>}
        <input required maxLength={6} placeholder="6-digit code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
        {error && <div className="error">{error}</div>}
        <button className="btn full" disabled={busy}>{busy ? "Verifying..." : "Verify & Continue"}</button>
        <button type="button" className="link-btn" onClick={resend}>Resend code</button>
      </form>
    </main>
  );
}

function AuthForm({ title, submit, form, setForm, error, button, register }) {
  return (
    <main className="auth">
      <form className="form-card" onSubmit={submit}>
        <h2>{title}</h2>
        {register && <input required placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />}
        {register && <input required placeholder="Mobile number" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} />}
        <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
        <input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} />
        {error && <div className="error">{error}</div>}
        <button className="btn full">{button}</button>
      </form>
    </main>
  );
}

function Contact() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [reply, setReply] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      const inquiry = await api("/inquiries", { method: "POST", body: JSON.stringify(form) });
      setReply(inquiry);
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (e) { setError(e.message); }
    setSending(false);
  }

  return (
    <main className="container narrow">
      <h2>Contact Us</h2>
      <p>Have a question about a product or an order? Send us a message.</p>
      {reply ? (
        <div className="form-card">
          <div className="notice">Thanks! Your message has been received.</div>
          {reply.aiReply ? (
            <>
              <p><b>Here's a quick answer:</b></p>
              <p>{reply.aiReply}</p>
              <small>Our support team may also follow up if needed.</small>
            </>
          ) : (
            <p>Our support team will get back to you soon.</p>
          )}
          <button className="btn full" onClick={() => setReply(null)}>Send another message</button>
        </div>
      ) : (
        <form className="form-card" onSubmit={submit}>
          <input required placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
          <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} />
          <input placeholder="Mobile number (optional)" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} />
          <textarea required rows="5" placeholder="How can we help?" value={form.message} onChange={e => setForm({...form, message:e.target.value})} />
          {error && <div className="error">{error}</div>}
          <button className="btn full" disabled={sending}>{sending ? "Sending..." : "Send Message"}</button>
        </form>
      )}
    </main>
  );
}

function Cart({ cart, changeQty, removeItem }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return (
    <main className="container">
      <h2>Your Cart</h2>
      {!cart.length ? <div className="empty">Your cart is empty. <Link to="/products">Shop now</Link></div> :
        <>
          <div className="cart-list">
            {cart.map(item => (
              <div className="cart-item" key={item._id}>
                <img src={item.image} alt="" />
                <div><h3>{item.name}</h3><p>₹{item.price.toLocaleString("en-IN")}</p></div>
                <div className="qty">
                  <button onClick={() => changeQty(item._id, item.quantity - 1)}>-</button>
                  <b>{item.quantity}</b>
                  <button onClick={() => changeQty(item._id, item.quantity + 1)}>+</button>
                </div>
                <button className="danger-text" onClick={() => removeItem(item._id)}>Remove</button>
              </div>
            ))}
          </div>
          <div className="summary"><b>Total: ₹{total.toLocaleString("en-IN")}</b><Link className="btn" to="/checkout">Checkout</Link></div>
        </>
      }
    </main>
  );
}

function DeliveryMap({ position, setPosition, onAddressResolved }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (mapInstance.current) return;
    const center = position || [22.9734, 78.6569];
    const map = L.map(mapRef.current).setView(center, position ? 15 : 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);

    const marker = L.marker(center, { draggable: true }).addTo(map);
    marker.on("dragend", async () => {
      const { lat, lng } = marker.getLatLng();
      setPosition([lat, lng]);
      const address = await reverseGeocode(lat, lng);
      if (address) onAddressResolved(address, lat, lng);
    });

    map.on("click", async (e) => {
      marker.setLatLng(e.latlng);
      setPosition([e.latlng.lat, e.latlng.lng]);
      const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      if (address) onAddressResolved(address, e.latlng.lat, e.latlng.lng);
    });

    mapInstance.current = map;
    markerRef.current = marker;
  }, []);

  useEffect(() => {
    if (mapInstance.current && markerRef.current && position) {
      markerRef.current.setLatLng(position);
      mapInstance.current.setView(position, 15);
    }
  }, [position]);

  return <div ref={mapRef} className="delivery-map" />;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`);
    const data = await res.json();
    const a = data.address || {};
    return {
      addressLine: [a.house_number, a.road, a.suburb].filter(Boolean).join(", ") || data.display_name || "",
      city: a.city || a.town || a.village || a.county || "",
      state: a.state || "",
      pincode: a.postcode || ""
    };
  } catch (err) {
    return null;
  }
}

function Checkout({ cart, clearCart }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName:"", phone:"", addressLine:"", city:"", state:"", pincode:"" });
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");
  const [error, setError] = useState("");
  const [paymentOption, setPaymentOption] = useState("COD");
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api("/settings/payment/public").then(d => setOnlineAvailable(d.onlinePaymentEnabled)).catch(() => {});
  }, []);

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  function useCurrentLocation() {
    setLocError("");
    if (!navigator.geolocation) {
      setLocError("Location is not supported on this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        const address = await reverseGeocode(latitude, longitude);
        if (address) {
          setForm(f => ({ ...f, addressLine: address.addressLine, city: address.city, state: address.state, pincode: address.pincode }));
        } else {
          setLocError("Found your location, but couldn't fetch the address. Please fill it in manually.");
        }
        setLocating(false);
      },
      () => {
        setLocError("Couldn't access your location. Please allow location access or enter your address manually.");
        setLocating(false);
      }
    );
  }

  function onMapAddressResolved(address, lat, lng) {
    setForm(f => ({ ...f, addressLine: address.addressLine, city: address.city, state: address.state, pincode: address.pincode }));
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function finalizeOrder(paymentFields) {
    const order = await api("/orders", {
      method: "POST",
      body: JSON.stringify({
        items: cart.map(i => ({ product: i._id, quantity: i.quantity })),
        shippingAddress: position ? { ...form, lat: position[0], lng: position[1] } : form,
        paymentMethod: paymentOption === "Online" ? "Online" : "COD",
        ...paymentFields
      })
    });
    clearCart();
    alert(`Order placed successfully. Order ID: ${order._id}`);
    navigate("/orders");
  }

  async function placeOrder(e) {
    e.preventDefault();
    setError("");

    if (paymentOption !== "Online") {
      try { await finalizeOrder({}); }
      catch (e) { setError(e.message); }
      return;
    }

    setPaying(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) { setError("Could not load payment gateway. Try Cash on Delivery instead."); setPaying(false); return; }

      const paymentOrder = await api("/orders/create-payment", { method: "POST", body: JSON.stringify({ amount: total }) });

      const rzp = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "MyWiFi Store",
        description: "Order payment",
        order_id: paymentOrder.razorpayOrderId,
        prefill: { name: form.fullName, contact: form.phone },
        handler: async function (response) {
          try {
            await finalizeOrder({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            });
          } catch (e) { setError(e.message); }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) }
      });
      rzp.open();
    } catch (e) { setError(e.message); setPaying(false); }
  }

  if (!cart.length) return <main className="container"><div className="empty">Cart is empty.</div></main>;

  return (
    <main className="container narrow">
      <h2>Checkout</h2>
      <p>Cash on Delivery • Delivery available across India</p>

      <button type="button" className="btn full locate-btn" onClick={useCurrentLocation} disabled={locating}>
        📍 {locating ? "Finding your location..." : "Use my current location"}
      </button>
      {locError && <div className="error">{locError}</div>}

      <DeliveryMap position={position} setPosition={setPosition} onAddressResolved={onMapAddressResolved} />
      <small className="map-hint">Tap or drag the pin on the map to fine-tune your delivery location.</small>

      <form className="form-card" onSubmit={placeOrder}>
        {Object.entries(form).map(([key, value]) => (
          <input key={key} required placeholder={key === "addressLine" ? "House / Street Address" : key[0].toUpperCase()+key.slice(1)}
            value={value} onChange={e => setForm({...form, [key]:e.target.value})} />
        ))}
        <div className="payment-options">
          <label className={`payment-option ${paymentOption === "COD" ? "selected" : ""}`}>
            <input type="radio" name="payment" checked={paymentOption === "COD"} onChange={() => setPaymentOption("COD")} />
            💵 Cash on Delivery
          </label>
          {onlineAvailable && (
            <label className={`payment-option ${paymentOption === "Online" ? "selected" : ""}`}>
              <input type="radio" name="payment" checked={paymentOption === "Online"} onChange={() => setPaymentOption("Online")} />
              💳 Pay Online (UPI / Card / Netbanking)
            </label>
          )}
        </div>
        {error && <div className="error">{error}</div>}
        <button className="btn full" disabled={paying}>{paying ? "Processing..." : `Place Order — ₹${total.toLocaleString("en-IN")}`}</button>
      </form>
    </main>
  );
}

function OrderTracker({ history }) {
  if (!history || !history.length) return null;
  return (
    <div className="tracker">
      {history.map((h, i) => (
        <div className="tracker-step" key={i}>
          <div className="tracker-dot" />
          <div>
            <b>{h.status}</b>
            <div className="tracker-time">{new Date(h.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const CUSTOMER_CANCELLABLE = ["Accepted", "Processing", "Shipped", "Out for Delivery"];

function Orders() {
  const [orders, setOrders] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [replaceFormFor, setReplaceFormFor] = useState(null);
  const [replaceReason, setReplaceReason] = useState("");
  const [message, setMessage] = useState("");

  function load() {
    api("/orders/my").then(setOrders).catch(console.error);
  }
  useEffect(() => { load(); }, []);

  async function cancelOrder(id) {
    if (!confirm("Cancel this order?")) return;
    try {
      await api(`/orders/${id}/cancel`, { method: "PATCH" });
      setMessage("Order cancelled.");
      load();
    } catch (e) { setMessage(e.message); }
  }

  async function submitReplacement(id) {
    if (!replaceReason.trim()) { setMessage("Please describe the issue."); return; }
    try {
      await api(`/orders/${id}/request-replacement`, { method: "PATCH", body: JSON.stringify({ reason: replaceReason }) });
      setMessage("Replacement requested. Our team will review it shortly.");
      setReplaceFormFor(null);
      setReplaceReason("");
      load();
    } catch (e) { setMessage(e.message); }
  }

  return <main className="container">
    <h2>My Orders</h2>
    {message && <div className="notice">{message}</div>}
    {!orders.length ? <div className="empty">No orders yet.</div> :
      orders.map(o => (
        <div className="order" key={o._id}>
          <div><b>Order #{o._id.slice(-8).toUpperCase()}</b><span>{new Date(o.createdAt).toLocaleString("en-IN")}</span></div>
          <p>{o.items.map(i => `${i.name} × ${i.quantity}`).join(", ")}</p>
          <div><b>₹{o.totalAmount.toLocaleString("en-IN")}</b><span className="status">{o.status}</span></div>
          {o.deliveryDate && o.status !== "Cancelled" && <p><b>Expected delivery:</b> {new Date(o.deliveryDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>}
          {o.replacementRequested && <p><b>Replacement:</b> {o.replacementStatus} — {o.replacementReason}</p>}
          <small>{o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.pincode}</small>
          <div className="order-actions">
            <button type="button" className="link-btn track-toggle" onClick={() => setExpanded({...expanded, [o._id]: !expanded[o._id]})}>
              {expanded[o._id] ? "Hide tracking" : "Track order"}
            </button>
            {CUSTOMER_CANCELLABLE.includes(o.status) && (
              <button type="button" className="danger-text" onClick={() => cancelOrder(o._id)}>Cancel Order</button>
            )}
            {o.status === "Delivered" && !o.replacementRequested && (
              <button type="button" className="link-btn" onClick={() => setReplaceFormFor(replaceFormFor === o._id ? null : o._id)}>
                {replaceFormFor === o._id ? "Close" : "Request Replacement"}
              </button>
            )}
          </div>
          {replaceFormFor === o._id && (
            <div className="replace-form">
              <textarea rows="3" placeholder="What's wrong with the product?" value={replaceReason} onChange={e => setReplaceReason(e.target.value)} />
              <button type="button" className="btn" onClick={() => submitReplacement(o._id)}>Submit Request</button>
            </div>
          )}
          {expanded[o._id] && <OrderTracker history={o.statusHistory} />}
        </div>
      ))
    }
  </main>;
}

function PaymentSettings() {
  const [settings, setSettings] = useState({ razorpayKeyId: "", razorpayKeySecretSet: false, onlinePaymentEnabled: false });
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");

  function load() {
    api("/settings/payment").then(d => {
      setSettings(d);
      setKeyId(d.razorpayKeyId || "");
      setEnabled(d.onlinePaymentEnabled);
    }).catch(e => setMessage(e.message));
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    try {
      await api("/settings/payment", {
        method: "PUT",
        body: JSON.stringify({ razorpayKeyId: keyId, razorpayKeySecret: keySecret, onlinePaymentEnabled: enabled })
      });
      setKeySecret("");
      setMessage("Payment settings saved.");
      load();
    } catch (e) { setMessage(e.message); }
  }

  const [cloudName, setCloudName] = useState("");
  const [uploadPreset, setUploadPreset] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    api("/settings/upload").then(d => {
      setCloudName(d.cloudinaryCloudName || "");
      setUploadPreset(d.cloudinaryUploadPreset || "");
    }).catch(() => {});
  }, []);

  async function saveUploadSettings(e) {
    e.preventDefault();
    try {
      await api("/settings/upload", { method: "PUT", body: JSON.stringify({ cloudinaryCloudName: cloudName, cloudinaryUploadPreset: uploadPreset }) });
      setUploadMessage("Image upload settings saved.");
    } catch (e) { setUploadMessage(e.message); }
  }

  return (
    <div className="admin-grid">
      <form className="form-card" onSubmit={save}>
        <h3>Payment Settings (Razorpay)</h3>
        {message && <div className="notice">{message}</div>}
        <label>Razorpay Key ID</label>
        <input placeholder="rzp_test_xxxxxxxx" value={keyId} onChange={e => setKeyId(e.target.value)} />
        <label>Razorpay Key Secret {settings.razorpayKeySecretSet && <small>(already set — leave blank to keep it)</small>}</label>
        <input type="password" placeholder={settings.razorpayKeySecretSet ? "•••••••• (leave blank to keep current)" : "Enter key secret"} value={keySecret} onChange={e => setKeySecret(e.target.value)} />
        <label className="checkbox-row">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          Enable online payments on checkout
        </label>
        <button className="btn full">Save Payment Settings</button>
      </form>
      <div className="form-card">
        <h3>How to get these</h3>
        <p>1. Create a free account at razorpay.com</p>
        <p>2. Go to Settings → API Keys → Generate Test Key (or Live Key after KYC)</p>
        <p>3. Copy the Key ID and Key Secret here</p>
        <p>4. Toggle "Enable online payments" and save</p>
      </div>

      <form className="form-card" onSubmit={saveUploadSettings}>
        <h3>Product Image Upload (Cloudinary)</h3>
        {uploadMessage && <div className="notice">{uploadMessage}</div>}
        <label>Cloud Name</label>
        <input placeholder="e.g. dxyz1234" value={cloudName} onChange={e => setCloudName(e.target.value)} />
        <label>Upload Preset</label>
        <input placeholder="e.g. mywifi_unsigned" value={uploadPreset} onChange={e => setUploadPreset(e.target.value)} />
        <button className="btn full">Save Upload Settings</button>
      </form>
      <div className="form-card">
        <h3>How to get these</h3>
        <p>1. Create a free account at cloudinary.com</p>
        <p>2. Your Cloud Name is shown on the Dashboard home page</p>
        <p>3. Go to Settings → Upload → Upload presets → Add upload preset</p>
        <p>4. Set Signing Mode to "Unsigned", save, and copy its name here</p>
      </div>
    </div>
  );
}

function Admin() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [tab, setTab] = useState("orders");
  const [form, setForm] = useState({ name:"", description:"", category:"WiFi Router", price:"", stock:"", image:"https://placehold.co/600x400?text=WiFi+Product" });
  const [message, setMessage] = useState("");
  const [dateInputs, setDateInputs] = useState({});
  const [uploadConfig, setUploadConfig] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [o, p, i] = await Promise.all([api("/orders/all"), api("/products/all"), api("/inquiries/all")]);
    setOrders(o); setProducts(p); setInquiries(i);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);
  useEffect(() => { api("/settings/upload/public").then(setUploadConfig).catch(() => {}); }, []);

  async function uploadImage(file) {
    if (!uploadConfig?.configured) {
      setMessage("Image upload isn't set up yet. Go to Payment Settings tab to add your Cloudinary details, or paste an image URL below instead.");
      return;
    }
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", uploadConfig.cloudinaryUploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${uploadConfig.cloudinaryCloudName}/image/upload`, {
        method: "POST",
        body: data
      });
      const result = await res.json();
      if (result.secure_url) {
        setForm(f => ({ ...f, image: result.secure_url }));
        setMessage("Image uploaded.");
      } else {
        setMessage(result.error?.message || "Upload failed.");
      }
    } catch (e) {
      setMessage("Upload failed: " + e.message);
    }
    setUploading(false);
  }

  async function status(id, value) {
    try { await api(`/orders/${id}/status`, { method:"PATCH", body:JSON.stringify({status:value}) }); load(); }
    catch(e) { setMessage(e.message); }
  }

  async function replacementDecision(id, decision) {
    try { await api(`/orders/${id}/replacement-status`, { method:"PATCH", body:JSON.stringify({replacementStatus:decision}) }); load(); }
    catch(e) { setMessage(e.message); }
  }

  async function saveDeliveryDate(id) {
    const value = dateInputs[id];
    if (!value) return;
    try {
      await api(`/orders/${id}/status`, { method:"PATCH", body:JSON.stringify({ deliveryDate: value }) });
      setMessage("Delivery date updated");
      load();
    } catch(e) { setMessage(e.message); }
  }

  async function addProduct(e) {
    e.preventDefault();
    try {
      await api("/products", { method:"POST", body:JSON.stringify({...form, price:Number(form.price), stock:Number(form.stock)}) });
      setForm({ name:"", description:"", category:"WiFi Router", price:"", stock:"", image:"https://placehold.co/600x400?text=WiFi+Product" });
      setMessage("Product added");
      load();
    } catch(e) { setMessage(e.message); }
  }

  async function removeProduct(id) {
    if (!confirm("Remove this product?")) return;
    await api(`/products/${id}`, { method:"DELETE" });
    load();
  }

  async function resolveInquiry(id) {
    try {
      await api(`/inquiries/${id}/status`, { method:"PATCH", body:JSON.stringify({status:"Resolved"}) });
      load();
    } catch(e) { setMessage(e.message); }
  }

  return <main className="container">
    <div className="admin-head"><div><h2>Admin Dashboard</h2><p>Manage orders, products and inquiries.</p></div>
      <div>
        <button className="tab" onClick={()=>setTab("orders")}>Orders ({orders.length})</button>
        <button className="tab" onClick={()=>setTab("products")}>Products ({products.length})</button>
        <button className="tab" onClick={()=>setTab("inquiries")}>Inquiries ({inquiries.filter(i=>i.status==="New").length} new)</button>
        <button className="tab" onClick={()=>setTab("payment")}>Payment Settings</button>
      </div>
    </div>
    {message && <div className="notice">{message}</div>}

    {tab === "orders" ? <div>
      {orders.map(o => <div className="order admin-order" key={o._id}>
        <div><b>#{o._id.slice(-8).toUpperCase()}</b><span>{o.user?.name} • {o.user?.phone}</span><span className="status">{o.status}</span></div>
        <p>{o.items.map(i => `${i.name} × ${i.quantity}`).join(", ")} — ₹{o.totalAmount.toLocaleString("en-IN")}</p>
        <p><b>Ship to:</b> {o.shippingAddress.fullName}, {o.shippingAddress.addressLine}, {o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.pincode}</p>
        {o.deliveryDate && <p><b>Expected delivery:</b> {new Date(o.deliveryDate).toLocaleDateString("en-IN")}</p>}
        {o.replacementRequested && (
          <p className="replacement-flag"><b>⚠ Replacement requested ({o.replacementStatus}):</b> {o.replacementReason}</p>
        )}
        <div className="status-buttons">
          {["Processing","Shipped","Out for Delivery","Delivered","Rejected"].map(s =>
            <button key={s} className="small-btn" onClick={()=>status(o._id,s)}>{s}</button>
          )}
        </div>
        <div className="status-buttons" style={{marginTop:"8px"}}>
          <input
            type="date"
            value={dateInputs[o._id] ?? (o.deliveryDate ? o.deliveryDate.slice(0,10) : "")}
            onChange={e => setDateInputs({...dateInputs, [o._id]: e.target.value})}
          />
          <button className="small-btn" onClick={()=>saveDeliveryDate(o._id)}>Set Delivery Date</button>
        </div>
        {o.replacementRequested && o.replacementStatus === "Requested" && (
          <div className="status-buttons" style={{marginTop:"8px"}}>
            <button className="small-btn" onClick={()=>replacementDecision(o._id,"Approved")}>Approve Replacement</button>
            <button className="small-btn" onClick={()=>replacementDecision(o._id,"Rejected")}>Reject Replacement</button>
          </div>
        )}
      </div>)}
    </div> : tab === "products" ?
    <div className="admin-grid">
      <form className="form-card" onSubmit={addProduct}>
        <h3>Add Product</h3>
        {Object.entries(form).filter(([key]) => key !== "image" && key !== "category").map(([key,value]) => <input key={key} required={["name","price","stock"].includes(key)} placeholder={key} value={value} onChange={e=>setForm({...form,[key]:e.target.value})} />)}

        <label className="upload-label">Category</label>
        <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
          <option>WiFi Router</option>
          <option>4G Router</option>
          <option>5G Router</option>
          <option>Security Camera</option>
          <option>Broadband Connection</option>
          <option>Lease Line</option>
          <option>Accessories</option>
          <option>Other</option>
        </select>

        <label className="upload-label">Product Image</label>
        {form.image && <img src={form.image} alt="preview" className="image-preview" />}
        <input type="file" accept="image/*" onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} disabled={uploading} />
        {uploading && <small>Uploading...</small>}
        <input placeholder="or paste an image URL" value={form.image} onChange={e=>setForm({...form,image:e.target.value})} />

        <button className="btn full" disabled={uploading}>Add Product</button>
      </form>
      <div>{products.map(p => <div className="mini-product" key={p._id}><img src={p.image} alt="" /><div><b>{p.name}</b><p>₹{p.price} • Stock: {p.stock}</p></div><button className="danger-text" onClick={()=>removeProduct(p._id)}>Remove</button></div>)}</div>
    </div> : tab === "inquiries" ?
    <div>
      {!inquiries.length ? <div className="empty">No inquiries yet.</div> :
        inquiries.map(i => <div className="order admin-order" key={i._id}>
          <div><b>{i.name}</b><span>{i.email} • {i.phone || "No phone"}</span><span className="status">{i.status}</span></div>
          <p><b>Customer:</b> {i.message}</p>
          {i.aiReply && <p><b>AI reply sent:</b> {i.aiReply}</p>}
          <small>{new Date(i.createdAt).toLocaleString("en-IN")}</small>
          {i.status === "New" && <div className="status-buttons" style={{marginTop:"8px"}}>
            <button className="small-btn" onClick={()=>resolveInquiry(i._id)}>Mark Resolved</button>
          </div>}
        </div>)
      }
    </div> :
    <PaymentSettings />}
  </main>;
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm MyWiFi Store's assistant. Ask me anything about our products, orders, or delivery." }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch((import.meta.env.VITE_API_URL || "http://localhost:5000/api") + "/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newMessages.map(m => ({ role: m.role, text: m.text }))
        })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply || "Sorry, please call customer care at 7248799598." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please call customer care at 7248799598." }]);
    }
    setSending(false);
  }

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <b>MyWiFi Support</b>
            <button className="link-btn" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "chat-msg user" : "chat-msg bot"}>{m.text}</div>
            ))}
            {sending && <div className="chat-msg bot">Typing...</div>}
          </div>
          <form className="chat-input" onSubmit={send}>
            <input placeholder="Type your question..." value={input} onChange={e => setInput(e.target.value)} disabled={sending} />
            <button className="btn" disabled={sending}>Send</button>
          </form>
        </div>
      )}
      <button className="chat-toggle" onClick={() => setOpen(o => !o)}>{open ? "✕" : "💬 Chat"}</button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("cart") || "[]"));

  useEffect(() => localStorage.setItem("cart", JSON.stringify(cart)), [cart]);

  function addToCart(product) {
    setCart(prev => {
      const found = prev.find(x => x._id === product._id);
      if (found) return prev.map(x => x._id === product._id ? {...x, quantity: Math.min(x.quantity+1, product.stock)} : x);
      return [...prev, {...product, quantity:1}];
    });
  }

  function changeQty(id, qty) {
    if (qty <= 0) return setCart(prev => prev.filter(x => x._id !== id));
    setCart(prev => prev.map(x => x._id === id ? {...x, quantity:qty} : x));
  }

  function removeItem(id) { setCart(prev => prev.filter(x => x._id !== id)); }
  function clearCart() { setCart([]); }
  function logout() { localStorage.removeItem("token"); localStorage.removeItem("user"); setUser(null); }

  const count = cart.reduce((s,x)=>s+x.quantity,0);

  return <>
    <Navbar user={user} cartCount={count} logout={logout} />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/categories" element={<Categories />} />
      <Route path="/products" element={<Products addToCart={addToCart} />} />
      <Route path="/login" element={<Login setUser={setUser} />} />
      <Route path="/register" element={<Register setUser={setUser} />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/cart" element={<Cart cart={cart} changeQty={changeQty} removeItem={removeItem} />} />
      <Route path="/checkout" element={user ? <Checkout cart={cart} clearCart={clearCart} /> : <Login setUser={setUser} />} />
      <Route path="/orders" element={user ? <Orders /> : <Login setUser={setUser} />} />
      <Route path="/admin" element={user?.role === "admin" ? <Admin /> : <Login setUser={setUser} />} />
    </Routes>
    <footer>© 2026 MyWiFi Store • India-wide WiFi products</footer>
    <ChatWidget />
  </>;
}
