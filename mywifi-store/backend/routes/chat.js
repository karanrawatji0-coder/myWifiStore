const router = require("express").Router();

const STORE_CONTEXT = `You are a friendly customer support assistant for MyWiFi Store, an Indian online store selling WiFi routers (4G, 5G, AC1200 and similar products).

Known store facts:
- Payment method: Cash on Delivery (COD) only
- Delivery: across India, typically 3-7 business days
- Returns/replacement: customer should contact support within 7 days of delivery
- Warranty: standard manufacturer warranty applies per product

Instructions:
- Answer product, delivery, payment, order, and general WiFi/router questions helpfully and briefly (2-4 sentences).
- If the customer describes a technical problem you cannot diagnose remotely (e.g. "my internet isn't working", "my router won't connect"), give 1-2 quick troubleshooting tips if you genuinely know some (like power-cycling the router, checking cable connections), then say: "If this doesn't fix it, please call our customer care at 7248799598 for further help."
- If the question needs specific order details you don't have access to (like tracking a specific order), politely say: "For order-specific help, please call our customer care at 7248799598."
- Never invent order numbers, prices, or policies you're unsure about.
- Keep replies short and conversational, like a helpful support agent, not a formal document.`;

router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    if (!process.env.GEMINI_API_KEY) {
      return res.json({ reply: "Sorry, our chat assistant is temporarily unavailable. Please call customer care at 7248799598." });
    }

    const contents = [];

    if (Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === "assistant" ? "model" : "user",
          parts: [{ text: turn.text }]
        });
      }
    }

    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: STORE_CONTEXT }] },
          contents
        })
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    res.json({ reply: text || "Sorry, I couldn't process that. Please call customer care at 7248799598." });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.json({ reply: "Sorry, something went wrong. Please call customer care at 7248799598." });
  }
});

module.exports = router;