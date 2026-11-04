// POST /api/feedback  { rating: "up"|"down", note?, question, answer, sources?: string[] }  -> { ok: true }
// Feedback on an Ask answer, saved to the Ora Airtable base (table "Ask feedback"). Sent only when the person
// taps to send it; nothing identifies them (no name, email, device id or address is stored).
// Uses the same AIRTABLE_TOKEN as the waitlist.
const BASE = process.env.AIRTABLE_BASE_ID || "appmo9mMg82nuLlzL";
const TABLE = process.env.AIRTABLE_FEEDBACK_TABLE_ID || "tblexsEOu3vgP0kiD";

const recent = new Map(); // address -> timestamps, a brake on floods
function flooding(key) {
  const now = Date.now();
  const t = (recent.get(key) || []).filter((x) => now - x < 3600e3);
  t.push(now); recent.set(key, t);
  if (recent.size > 5000) recent.clear();
  return t.length > 30;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST." }); }
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const rating = body.rating === "up" ? "Helpful" : body.rating === "down" ? "Not helpful" : null;
  const question = String(body.question || "").slice(0, 2000).trim();
  if (!rating || !question) return res.status(400).json({ error: "Nothing to send." });
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(503).json({ error: "Feedback isn't switched on yet." });
  if (flooding(String(req.headers["x-forwarded-for"] || "").split(",")[0].trim())) return res.status(429).json({ error: "Thank you — that's plenty for now." });

  const sources = Array.isArray(body.sources) ? body.sources.slice(0, 20).map((x) => String(x).slice(0, 200)).join("\n") : "";
  try {
    const r = await fetch(`https://api.airtable.com/v0/${BASE}/${TABLE}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ typecast: true, records: [{ fields: {
        Question: question, Rating: rating, Note: String(body.note || "").slice(0, 2000),
        Answer: String(body.answer || "").slice(0, 8000), Sources: sources,
        Sent: new Date().toISOString(), Status: "New",
      } }] }),
    });
    if (!r.ok) { console.error("Airtable error", r.status, await r.text()); return res.status(502).json({ error: "We couldn't send that just now." }); }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "We couldn't send that just now." });
  }
};
