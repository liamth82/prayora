import { load, save } from './storage';

export const BASE = 'https://prayora.co';

export type Form = 'OF' | 'EF';

export type OFDay = {
  form: 'OF'; date: string; title: string; rank: string; season: string; color: string;
  readings: { key: string; label: string; ref: string; drBook: string | null; verses: [string, string][] }[];
};
export type EFSection = { id: string; label: string; en: string[]; la: string[] };
export type EFDay = {
  form: 'EF'; date: string; title: string; tempora: string; rank: number; color: string; id: string;
  commemorations: string[]; sections: EFSection[];
};
export type Day = OFDay | EFDay;

export type ArtItem = { file: string; title: string; description: string; artist: string; credit: string; license: string; source: string; w: number; h: number };
export type ArtManifest = Record<string, ArtItem>;

export const isoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (await r.json()) as T;
}

/** Fetch a day's liturgy for the chosen form, falling back to the cached copy when offline. */
export async function getDay(form: Form, date: string): Promise<Day | null> {
  const key = `day:${form}:${date}`;
  try {
    const d = await fetchJson<Day>(`${BASE}/data/${form.toLowerCase()}/${date}.json`);
    save(key, d);
    return d;
  } catch {
    return load<Day | null>(key, null);
  }
}

export async function getArtManifest(): Promise<ArtManifest> {
  try {
    const m = await fetchJson<ArtManifest>(`${BASE}/art/manifest.json`);
    save('art:manifest', m);
    return m;
  } catch {
    return load<ArtManifest>('art:manifest', {});
  }
}

/** Choose a manuscript image for the day from its title and season. */
export function artKeyFor(day: Day | null, date: Date): string {
  const t = (day?.title ?? '').toLowerCase();
  const s = (day && day.form === 'OF' ? day.season : day?.tempora ?? '').toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  if (has('nativity of our lord', 'nativity of the lord', 'christmas')) return 'christmas';
  if (has('epiphany')) return 'epiphany';
  if (has('ascension')) return 'ascension';
  if (has('pentecost') && !t.includes('after pentecost')) return 'pentecost';
  if (has('all saints')) return 'allsaints';
  if (has('all souls', 'faithful departed')) return 'souls';
  if (has('angel', 'michael', 'gabriel', 'raphael')) return 'angels';
  if (has('good friday', 'palm sunday', 'passion', 'holy cross')) return 'holyweek';
  if (has('easter', 'resurrection')) return 'easter';
  if (has('mary', 'virgin', 'our lady', 'rosary', 'immaculate', 'assumption')) return 'marian';
  if (has('apostle')) return 'apostles';
  if (has('martyr')) return 'martyr';
  if (s.includes('holy week')) return 'holyweek';
  if (s.includes('lent') || s.includes('quadragesima') || s.includes('passion')) return 'lent';
  if (s.includes('advent')) return 'advent';
  if (s.includes('christmas') || s.includes('nativity')) return 'christmas';
  if (s.includes('easter') || s.includes('pasch')) return 'easter';
  return 'm' + String(date.getMonth() + 1).padStart(2, '0');
}

export const LIT_COLORS: Record<string, { bg: string; fg: string; accent: string }> = {
  green: { bg: '#1D2A23', fg: '#EEE7DA', accent: '#C4A870' },
  violet: { bg: '#261C30', fg: '#EEE7DA', accent: '#C4A870' },
  red: { bg: '#341818', fg: '#F2E9DC', accent: '#D8BF8A' },
  rose: { bg: '#3A222A', fg: '#F4ECE2', accent: '#E3C9A0' },
  black: { bg: '#121014', fg: '#E8E1D4', accent: '#B9A274' },
  white: { bg: '#2A2621', fg: '#F4EFE6', accent: '#D8BF8A' },
};

const EF_ORDER = ['Introitus', 'Oratio', 'Commemoratio Oratio', 'Lectio', 'Graduale', 'Tractus', 'Sequentia', 'Evangelium',
  'Offertorium', 'Secreta', 'Commemoratio Secreta', 'Prefatio', 'Communio', 'Postcommunio', 'Commemoratio Postcommunio', 'Super populum'];

export function orderedEF(sections: EFSection[]): EFSection[] {
  const idx = (id: string) => { const i = EF_ORDER.indexOf(id); return i < 0 ? 50 : i; };
  return [...sections].sort((a, b) => idx(a.id) - idx(b.id));
}

export function rankLabelEF(rank: number) {
  return ['', 'I class', 'II class', 'III class', 'IV class'][rank] ?? '';
}
export function rankLabelOF(rank: string) {
  return ({ SOLEMNITY: 'Solemnity', FEAST: 'Feast', MEMORIAL: 'Memorial', OPT_MEMORIAL: 'Optional memorial', SUNDAY: 'Sunday', FERIA: 'Weekday', COMMEMORATION: 'Commemoration', TRIDUUM: 'Sacred Triduum', HOLY_WEEK: 'Holy Week' } as Record<string, string>)[rank] ?? '';
}

export type Saint = {
  name: string; dates?: string; history: string; life?: string; prayer?: string; prayerSource?: string; prayerTo?: string;
  fast?: string; penance?: string; meditation?: string; image?: string; imageCredit?: string; imageRatio?: number;
  match?: string[]; always?: boolean;
};

export async function getSaint(md: string): Promise<Saint | null> {
  try {
    const r = await fetch(`${BASE}/saints/${md}.json`, { headers: { 'Cache-Control': 'no-cache' } });
    if (r.status === 404) { save('saint:' + md, null); return null; }
    if (!r.ok) throw new Error(String(r.status));
    const s = (await r.json()) as Saint;
    save('saint:' + md, s);
    return s;
  } catch {
    return load<Saint | null>('saint:' + md, null);
  }
}

export async function getSaintIndex(): Promise<{ md: string; name: string }[]> {
  try {
    const r = await fetchJson<{ md: string; name: string }[]>(`${BASE}/saints/index.json`);
    save('saint:index', r);
    return r;
  } catch {
    return load('saint:index', []);
  }
}

/** True when this saint is actually kept today in the chosen calendar. */
export function saintKept(s: Saint | null, day: Day | null): boolean {
  if (!s) return false;
  if (s.always || !day) return true;
  const t = day.title.toLowerCase();
  return (s.match ?? []).some((m) => t.includes(m));
}

/** True when the day is a saint's day or feast rather than a plain weekday or Sunday. */
export function isSanctoral(day: Day | null): boolean {
  if (!day) return false;
  if (day.form === 'OF') return ['MEMORIAL', 'OPT_MEMORIAL', 'FEAST', 'SOLEMNITY', 'COMMEMORATION'].includes(day.rank);
  return day.title !== day.tempora && !/sunday|feria|week|octave|ember|vigil/i.test(day.title);
}

// ---- the sacred art library: a different painting each day, chosen for the season -----------------

export type LibArt = {
  id: string; file: string; title: string; artist: string; year: string; collection: string; tags: string[];
  w: number; h: number; source: string; license: string;
};
export type DayArt = { uri: string; title: string; credit: string; ratio: number };

export async function getArtLibrary(): Promise<LibArt[]> {
  try {
    const r = await fetchJson<LibArt[]>(`${BASE}/art/library.json`);
    save('art:library', r);
    return r;
  } catch {
    return load<LibArt[]>('art:library', []);
  }
}

const SEASONAL = ['advent', 'christmas', 'epiphany', 'holyweek', 'easter', 'ascension', 'pentecost'];
const POOLS: Record<string, (a: LibArt) => boolean> = {
  advent: (a) => a.tags.includes('advent'),
  epiphany: (a) => a.tags.includes('epiphany'),
  lent: (a) => a.tags.includes('lent') || a.tags.includes('holyweek'),
  holyweek: (a) => a.tags.includes('holyweek'),
  easter: (a) => ['easter', 'ascension', 'pentecost'].some((t) => a.tags.includes(t)),
  ascension: (a) => ['ascension', 'easter'].some((t) => a.tags.includes(t)),
  pentecost: (a) => ['pentecost', 'ascension'].some((t) => a.tags.includes(t)),
  christmas: (a) => a.tags.includes('christmas') || a.tags.includes('epiphany'),
  allsaints: (a) => a.tags.includes('allsaints') || (a.tags.includes('saints') && !a.tags.some((t) => SEASONAL.includes(t))),
  souls: (a) => /lament|entomb|piet|deposition/i.test(a.title),
  angels: (a) => a.tags.includes('angels') && !a.tags.some((t) => SEASONAL.includes(t)),
  marian: (a) => a.tags.includes('marian') && !a.tags.some((t) => ['holyweek', 'easter'].includes(t)),
  martyr: (a) => a.tags.includes('saints') && !a.tags.some((t) => SEASONAL.includes(t)),
  apostles: (a) => a.tags.includes('saints') && !a.tags.some((t) => SEASONAL.includes(t)),
};
const ordinary = (a: LibArt) => !a.tags.some((t) => SEASONAL.includes(t));

function seeded(seed: number) {
  let x = seed >>> 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; };
}
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** The day's painting: drawn from the season's pool, without repeating until the pool is used up. */
export function artForDay(key: string, date: Date, lib: LibArt[], manifest: ArtManifest): DayArt | null {
  const legacy = manifest[key] ?? manifest.default;
  const fromLegacy = (m: ArtItem): DayArt => ({
    uri: `${BASE}/art/${m.file}`, title: m.title.replace(/\.jpe?g$/i, '').replace(/_/g, ' '),
    credit: `${m.title.replace(/\.jpe?g$/i, '')}. ${m.license || 'Public domain'}, via Wikimedia Commons.`, ratio: m.w && m.h ? m.w / m.h : 0.75,
  });
  const test = POOLS[key] ?? ordinary;
  const pool = lib.filter(test).sort((a, b) => a.id.localeCompare(b.id));
  if (!pool.length) return legacy ? fromLegacy(legacy) : null;
  const n = pool.length + (legacy ? 1 : 0);
  const dayNo = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const order = Array.from({ length: n }, (_, i) => i);
  const rnd = seeded(Math.floor(dayNo / n) * 7919 + hash(key));
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const k = order[dayNo % n];
  if (k >= pool.length && legacy) return fromLegacy(legacy);
  return libArt(pool[k]);
}

export function libArt(a: LibArt): DayArt {
  const by = [a.artist, a.year].filter(Boolean).join(', ');
  return {
    uri: `${BASE}/art/${a.file}`, title: a.title, ratio: a.w / a.h,
    credit: `${a.title}${by ? ` — ${by}` : ''}${a.collection ? `. ${a.collection}` : ''}. Public domain, via Wikimedia Commons.`,
  };
}
