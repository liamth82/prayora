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
  green: { bg: '#2F4A33', fg: '#F5EDD6', accent: '#C9A84C' },
  violet: { bg: '#43294F', fg: '#F5EDD6', accent: '#C9A84C' },
  red: { bg: '#6E1C1A', fg: '#F5EDD6', accent: '#E0C277' },
  rose: { bg: '#9C5A68', fg: '#FBF3E6', accent: '#F1D9A0' },
  black: { bg: '#1E1A17', fg: '#EDE4CF', accent: '#C9A84C' },
  white: { bg: '#EFE3C2', fg: '#2C1810', accent: '#8F6D1F' },
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
