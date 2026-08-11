const router = require("express").Router();

const STORE_CONTEXT = `You are a friendly, conversational customer support assistant for MyWiFi Store, an Indian online store selling WiFi routers (4G routers, 5G routers, AC1200 routers and similar networking products).

Known store facts:
- Payment method: Cash on Delivery (COD) only
- Delivery: across India, typically 3-7 business days
- Returns/replacement: customer should contact support within 7 days of delivery
- Warranty: standard manufacturer warranty applies per product

How to respond:
- Have a normal, helpful conversation. Answer questions about products, router types, delivery, payment, returns, warranty, general WiFi/networking advice, or anything else you can reasonably help with.
- If the customer greets you or makes small talk, respond naturally and warmly.
- If the customer describes a technical problem (like "my router isn't working" or "internet is slow"), actually try to help first — ask a clarifying question or give 1-2 real troubleshooting steps (e.g. restart the router, check cable connections, check if other devices are also affected).
- Only mention the customer care number 7248799598 when: the issue truly needs a human (account-specific/order-specific problem you can't look up), OR the customer explicitly asks for a phone number, OR troubleshooting steps didn't fully resolve a technical issue after you've already tried to help.
- Do NOT give out the phone number as your first response to every message. Only use it when genuinely needed, and mention it at most once every few messages.
- Keep replies short (2-4 sentences), friendly, and conversational — like a real support agent chatting, not a formal document.`;

router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    if (!process.env.GEMINI_API_KEY) {
      console.error("Chat error: GEMINI_API_KEY is not set");
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: STORE_CONTEXT }] },
          contents
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return res.json({ reply: "Sorry, I'm having trouble right now. Please call customer care at 7248799598." });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error("Gemini returned no text:", JSON.stringify(data));
    }

    res.json({ reply: text || "Sorry, I couldn't process that. Could you try rephrasing your question?" });
  } catch (err) {
    console.error("Chat error:", err.message);
    res.json({ reply: "Sorry, something went wrong. Please call customer care at 7248799598." });
  }
});

module.exports = router;