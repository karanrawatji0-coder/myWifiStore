import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { api } from "./api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function Navbar({ user, cartCount, logout }) {
  return (
    <header className="navbar">
      <Link className="brand" to="/">MyWiFi Store</Link>
      <nav>
        <NavLink to="/">Home</NavLink>
        <NavLink to="/products">Products</NavLink>
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
          <Link className="btn" to="/products">Shop WiFi Products</Link>
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

function Products({ addToCart }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/products").then(setProducts).catch(e => setError(e.message));
  }, []);

  const filtered = products.filter(p =>
    `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="container">
      <div className="page-head">
        <div><h2>WiFi Products</h2><p>Choose a product for your home or office.</p></div>
        <input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {error && <div className="error">{error}</div>}
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

  async function placeOrder(e) {
    e.preventDefault();
    try {
      const order = await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map(i => ({ product: i._id, quantity: i.quantity })),
          shippingAddress: position ? { ...form, lat: position[0], lng: position[1] } : form
        })
      });
      clearCart();
      alert(`Order placed successfully. Order ID: ${order._id}`);
      navigate("/orders");
    } catch (e) { setError(e.message); }
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
        <div className="cod">💵 Payment: Cash on Delivery</div>
        {error && <div className="error">{error}</div>}
        <button className="btn full">Place Order</button>
      </form>
    </main>
  );
}

function Orders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api("/orders/my").then(setOrders).catch(console.error); }, []);

  return <main className="container">
    <h2>My Orders</h2>
    {!orders.length ? <div className="empty">No orders yet.</div> :
      orders.map(o => (
        <div className="order" key={o._id}>
          <div><b>Order #{o._id.slice(-8).toUpperCase()}</b><span>{new Date(o.createdAt).toLocaleString("en-IN")}</span></div>
          <p>{o.items.map(i => `${i.name} × ${i.quantity}`).join(", ")}</p>
          <div><b>₹{o.totalAmount.toLocaleString("en-IN")}</b><span className="status">{o.status}</span></div>
          {o.deliveryDate && <p><b>Expected delivery:</b> {new Date(o.deliveryDate).toLocaleDateString("en-IN")}</p>}
          <small>{o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.pincode}</small>
        </div>
      ))
    }
  </main>;
}

function Admin() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [tab, setTab] = useState("orders");
  const [form, setForm] = useState({ name:"", description:"", category:"WiFi Router", price:"", stock:"", image:"https://placehold.co/600x400?text=WiFi+Product" });
  const [message, setMessage] = useState("");
  const [dateInputs, setDateInputs] = useState({});

  async function load() {
    const [o, p, i] = await Promise.all([api("/orders/all"), api("/products/all"), api("/inquiries/all")]);
    setOrders(o); setProducts(p); setInquiries(i);
  }
  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);

  async function status(id, value) {
    try { await api(`/orders/${id}/status`, { method:"PATCH", body:JSON.stringify({status:value}) }); load(); }
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
      </div>
    </div>
    {message && <div className="notice">{message}</div>}

    {tab === "orders" ? <div>
      {orders.map(o => <div className="order admin-order" key={o._id}>
        <div><b>#{o._id.slice(-8).toUpperCase()}</b><span>{o.user?.name} • {o.user?.phone}</span><span className="status">{o.status}</span></div>
        <p>{o.items.map(i => `${i.name} × ${i.quantity}`).join(", ")} — ₹{o.totalAmount.toLocaleString("en-IN")}</p>
        <p><b>Ship to:</b> {o.shippingAddress.fullName}, {o.shippingAddress.addressLine}, {o.shippingAddress.city}, {o.shippingAddress.state} - {o.shippingAddress.pincode}</p>
        {o.deliveryDate && <p><b>Expected delivery:</b> {new Date(o.deliveryDate).toLocaleDateString("en-IN")}</p>}
        <div className="status-buttons">
          {["Accepted","Processing","Shipped","Out for Delivery","Delivered","Rejected"].map(s =>
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
      </div>)}
    </div> : tab === "products" ?
    <div className="admin-grid">
      <form className="form-card" onSubmit={addProduct}>
        <h3>Add Product</h3>
        {Object.entries(form).map(([key,value]) => <input key={key} required={["name","price","stock"].includes(key)} placeholder={key} value={value} onChange={e=>setForm({...form,[key]:e.target.value})} />)}
        <button className="btn full">Add Product</button>
      </form>
      <div>{products.map(p => <div className="mini-product" key={p._id}><img src={p.image} alt="" /><div><b>{p.name}</b><p>₹{p.price} • Stock: {p.stock}</p></div><button className="danger-text" onClick={()=>removeProduct(p._id)}>Remove</button></div>)}</div>
    </div> :
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
    </div>}
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
