// POST /api/waitlist  { email, platform }  -> adds a row to the Ora Airtable base.
// Needs AIRTABLE_TOKEN in Vercel environment variables (scopes: data.records:read, data.records:write; access: Ora base).
const BASE = process.env.AIRTABLE_BASE_ID || "appmo9mMg82nuLlzL";
const TABLE = process.env.AIRTABLE_TABLE_ID || "tblohYq748SRz0zBW";
const PLATFORMS = ["iPhone", "Android", "Not sure"];

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST." }); }
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (body.website) return res.status(200).json({ ok: true }); // honeypot: bots fill the hidden field

  const email = String(body.email || "").trim().toLowerCase();
  const platform = PLATFORMS.includes(body.platform) ? body.platform : "Not sure";
  if (email.length > 254 || !/^[^\s@'"\\]+@[^\s@'"\\]+\.[^\s@'"\\]{2,}$/.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) return res.status(503).json({ error: "The waitlist isn't switched on yet. Please try again later." });

  const api = `https://api.airtable.com/v0/${BASE}/${TABLE}`;
  const auth = { Authorization: `Bearer ${token}` };
  try {
    const formula = encodeURIComponent(`LOWER({Email})='${email}'`);
    const existing = await fetch(`${api}?maxRecords=1&filterByFormula=${formula}`, { headers: auth });
    if (existing.ok) {
      const j = await existing.json();
      if (j.records && j.records.length) return res.status(200).json({ ok: true, existing: true });
    }
    const r = await fetch(api, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ typecast: true, records: [{ fields: {
        Email: email, Platform: platform, "Signed up": new Date().toISOString(),
        Source: String(body.source || "prayora.co").slice(0, 100)
      } }] })
    });
    if (!r.ok) { console.error("Airtable error", r.status, await r.text()); return res.status(502).json({ error: "We couldn't save that just now. Please try again in a minute." }); }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "We couldn't save that just now. Please try again in a minute." });
  }
};
