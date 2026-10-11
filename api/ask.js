// POST /api/ask  { messages: [{ role: "user"|"assistant", content: string }], today?: { date, title, gospel } }
//   -> { answer: string, sources: [{ n, kind, book, chapter, ref, text }] }
//
// Ask answers questions of faith from Ora's own library only: the Douay-Rheims Bible, the classics in the
// Library and the saints' entries. Claude searches that library with a tool, then answers, citing each claim.
// Needs ANTHROPIC_API_KEY in Vercel environment variables. ASK_MODEL overrides the model.

const INDEX = require("./_data/ask.json");

const MODEL = process.env.ASK_MODEL || "claude-sonnet-5";
const MAX_ROUNDS = 4;

// ---------------------------------------------------------------- search (BM25 over the passages)

const STOP = new Set(("a an and are as at be but by for from had has have he her his i if in into is it its me my " +
  "not of on or our she so that the their them then there these they this thou thee thy to was we were what when " +
  "which who whom why will with ye you your unto shall hath doth did do does him us all also o upon").split(" "));

const stem = (w) => w.replace(/(eth|est|ing|edst|ed|es|s)$/, (m) => (w.length - m.length >= 4 ? "" : m));
const tokens = (text) => (text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]+/g) || [])
  .filter((w) => w.length > 1 && !STOP.has(w)).map(stem);

let BM = null;
function bm25() {
  if (BM) return BM;
  const docs = INDEX.docs;
  const post = new Map();
  const len = new Float32Array(docs.length);
  let total = 0;
  docs.forEach((d, i) => {
    const t = tokens(d[3] + " " + d[4]);
    len[i] = t.length; total += t.length;
    const tf = new Map();
    t.forEach((w) => tf.set(w, (tf.get(w) || 0) + 1));
    tf.forEach((c, w) => { let p = post.get(w); if (!p) post.set(w, (p = [])); p.push(i, c); });
  });
  BM = { post, len, avg: total / docs.length, n: docs.length };
  return BM;
}

const GROUPS = {
  catechism: ["baltimore", "kinkead"],
  aquinas: ["summa1", "summa12", "summa22", "summa3"],
  fathers: ["apostolic", "cityofgod", "confessions", "desert"],
  classics: ["imitation", "presence", "julian", "teresa", "ignatius"],
};
function inGroup(d, kind) {
  if (kind === "bible" || kind === "saint") return d[0] === kind;
  return d[0] === "library" && (GROUPS[kind] || []).includes(d[1]);
}

function search(query, kind, k = 8) {
  const { post, len, avg, n } = bm25();
  const scores = new Map();
  const q = [...new Set(tokens(query))];
  for (const w of q) {
    const p = post.get(w);
    if (!p) continue;
    const df = p.length / 2;
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5));
    for (let j = 0; j < p.length; j += 2) {
      const i = p[j], tf = p[j + 1];
      if (kind && kind !== "any" && !inGroup(INDEX.docs[i], kind)) continue;
      const s = idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * len[i] / avg));
      scores.set(i, (scores.get(i) || 0) + s);
    }
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([i]) => i);
}

// ---------------------------------------------------------------- the conversation

const SYSTEM = `You are Ask, the question-and-answer companion inside Ora, a Catholic prayer app. You help people understand the Catholic faith and grow in it.

SOURCES
You may answer only from passages returned by the search_sources tool. They come from Ora's library:
- bible: the Douay-Rheims Bible (Challoner).
- catechism: the Baltimore Catechism (1885) and Kinkead's Explanation of it (1891).
- aquinas: the Summa Theologica of Saint Thomas Aquinas (his answers and replies; the objections he refutes are left out).
- fathers: the Apostolic Fathers (Clement, Ignatius of Antioch, Polycarp, the Epistle to Diognetus), Saint Augustine's City of God and Confessions, the Sayings of the Desert Fathers.
- classics: The Imitation of Christ, Brother Lawrence, Julian of Norwich, Saint Teresa of Ávila, Saint Ignatius of Loyola.
- saint: Ora's short lives of the saints.
- Search before you answer, usually two to four searches with different wordings and sources. For doctrine, search the catechism and aquinas as well as the bible; for prayer and the spiritual life, the classics and fathers. Psalms use the Douay (Vulgate) numbering, so Psalm 22 in a modern Bible is Psalm 21 here.
- Cite every claim drawn from a passage by putting its id in double square brackets straight after the sentence, like this [[b123]]. Only cite ids that a search actually returned. Never invent or alter a quotation; when you quote, quote exactly.
- You may explain, connect and summarise what the passages say in your own words, faithfully to Catholic teaching. When a question turns on the Church's formal teaching and the library has no passage on it, say plainly what the Church teaches in a sentence or two, mark it as Church teaching rather than a quoted source, and suggest the Catechism of the Catholic Church by paragraph number if you are sure of it. Do not cite a paragraph number you are unsure of.
- If the library does not cover the question, say so honestly rather than guess.

FIDELITY
- Be faithful to the teaching of the Catholic Church. Distinguish clearly what the Church has defined, what is common teaching, and what is left open for Catholics to hold different views on.
- Where Catholics legitimately disagree, including on political and prudential questions, present the positions fairly and do not take a side.
- Speak of other Christians and other faiths with charity and accuracy.

CARE
- You are not a priest. You cannot hear confession or give absolution, and you do not give spiritual direction in place of a priest or director; for those, gently point the person to a priest.
- If someone speaks of thoughts of suicide or self-harm, of abuse, or of being in danger, respond with warmth first, encourage them to contact emergency services or a crisis line (Samaritans 116 123 in the UK and Ireland; 988 in the US) and someone they trust, and remind them that God's mercy is greater than anything they carry.
- If someone seems burdened by scrupulosity or shame, be gentle, speak of God's mercy, and suggest speaking with a priest.
- Do not give medical, legal or financial advice beyond pointing to the right professional.
- Politely decline requests that have nothing to do with faith, prayer or the spiritual life, and offer to help with something that does.

STYLE
- Warm, clear and brief: usually 80 to 200 words, in two to four short paragraphs separated by a blank line. Plain English, British spelling. No headings, no bold labels at the start of paragraphs, no bullet lists unless the person asks for steps. Each paragraph should make sense on its own, because people save single paragraphs.
- Write for a thoughtful adult who may be new to the faith. Explain any technical term you use.
- You may end with one short line from Scripture or the saints, already found in the sources, only when it speaks directly to the question; otherwise end simply.
- The Baltimore Catechism is old: where its wording reflects 19th-century discipline that has since changed (for example on fasting rules), say so.`;

const TOOLS = [{
  name: "search_sources",
  description: "Search Ora's library (Douay-Rheims Bible, Baltimore Catechism, Aquinas, the Fathers, spiritual classics, saints' lives) for passages relevant to a question. Returns up to 8 passages, each with an id to cite. Use plain keywords in the language of the old translations where helpful (e.g. 'charity' as well as 'love', 'thee' forms are handled).",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Keywords or a short phrase to search for." },
      source: { type: "string", enum: ["any", "bible", "catechism", "aquinas", "fathers", "classics", "saint"], description: "Limit to one part of the library. Default any." },
    },
    required: ["query"],
  },
}];

const idOf = (i) => "b" + i;

async function claude(body) {
  // One quiet retry when the service is busy or a request goes astray.
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return j;
      const msg = (j.error && j.error.message) || `HTTP ${r.status}`;
      if (attempt >= 1 || !(r.status === 429 || r.status >= 500)) throw new Error(msg);
      console.warn("ask retry", r.status, msg);
    } catch (e) {
      if (attempt >= 1) throw e;
      console.warn("ask retry", e && e.message);
    }
    await new Promise((res) => setTimeout(res, 1200));
  }
}

function clean(messages) {
  if (!Array.isArray(messages)) return null;
  const m = messages.slice(-8).map((x) => ({ role: x && x.role === "assistant" ? "assistant" : "user", content: String((x && x.content) || "").slice(0, 2000) }))
    .filter((x) => x.content.trim());
  while (m.length && m[0].role !== "user") m.shift();
  if (!m.length || m[m.length - 1].role !== "user") return null;
  if (m[m.length - 1].content.length > 600) m[m.length - 1].content = m[m.length - 1].content.slice(0, 600);
  return m;
}

module.exports = async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "Ask isn't switched on yet." });
  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Use POST." }); }
  const messages = clean(body.messages);
  if (!messages) return res.status(400).json({ error: "Please ask a question." });

  const today = body.today && typeof body.today === "object"
    ? `\n\nToday is ${String(body.today.date || "").slice(0, 40)}: ${String(body.today.title || "").slice(0, 120)}.${body.today.gospel ? ` Today's Gospel is ${String(body.today.gospel).slice(0, 60)}.` : ""}`
    : "";

  const seen = new Map(); // passage index -> true, for everything shown to the model
  const convo = messages.map((m) => ({ role: m.role, content: m.content }));
  try {
    let final = null;
    for (let round = 0; round <= MAX_ROUNDS; round++) {
      const out = await claude({
        model: MODEL, max_tokens: 1200,
        system: [{ type: "text", text: SYSTEM + today, cache_control: { type: "ephemeral" } }],
        tools: TOOLS,
        tool_choice: round === MAX_ROUNDS ? { type: "none" } : { type: "auto" },
        messages: convo,
      });
      const uses = out.content.filter((c) => c.type === "tool_use");
      if (out.stop_reason !== "tool_use" || !uses.length) { final = out; break; }
      convo.push({ role: "assistant", content: out.content });
      convo.push({
        role: "user",
        content: uses.map((u) => {
          const hits = search(String((u.input && u.input.query) || ""), u.input && u.input.source);
          hits.forEach((i) => seen.set(i, true));
          const text = hits.length
            ? hits.map((i) => { const d = INDEX.docs[i]; return `[[${idOf(i)}]] ${d[3]}\n${d[4]}`; }).join("\n\n")
            : "No passages found. Try other words.";
          return { type: "tool_result", tool_use_id: u.id, content: text };
        }),
      });
    }
    const raw = (final ? final.content : []).filter((c) => c.type === "text").map((c) => c.text).join("\n").trim();

    // Number the citations in order of first use, dropping any id the model was never shown.
    const order = [];
    const answer = raw.replace(/\s*\[\[b(\d+)\]\]/g, (_, d) => {
      const i = Number(d);
      if (!seen.has(i)) return "";
      let n = order.indexOf(i);
      if (n < 0) { order.push(i); n = order.length - 1; }
      return ` [${n + 1}]`;
    }).replace(/(\[\d+\])(\s*\1)+/g, "$1");
    const sources = order.map((i, n) => {
      const d = INDEX.docs[i];
      return { n: n + 1, kind: d[0], book: d[1], chapter: d[2], ref: d[3], text: d[4].slice(0, 600) };
    });
    return res.status(200).json({ answer: answer || "I couldn't find an answer to that in Ora's library.", sources });
  } catch (e) {
    console.error("ask failed", e && e.message, e && e.stack);
    return res.status(502).json({ error: "Ask couldn't answer just now. Please try again in a moment." });
  }
};

module.exports.search = search; // for local testing
module.exports.INDEX = INDEX;
