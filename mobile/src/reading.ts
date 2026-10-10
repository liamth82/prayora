import { load, save } from './storage';
import { BASE } from './today';

export type BibleBook = { id: string; name: string; modern: string; testament: 'OT' | 'NT'; group: string; chapters: number };
export type BibleText = { id: string; name: string; modern: string; chapters: [number, string][][] };
export type LibraryBook = { id: string; title: string; author: string; translator?: string; year?: string; blurb?: string; chapters: number };
export type LibraryText = { id: string; title: string; author: string; translator?: string; source?: string; chapters: { title: string; section?: string; paras: string[] }[] };

async function cached<T>(key: string, url: string, lru?: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    const j = (await r.json()) as T;
    await save(key, j);
    if (lru) {
      const list = (await load<string[]>(lru, [])).filter((k) => k !== key);
      list.unshift(key);
      for (const old of list.slice(8)) await save(old, null);
      await save(lru, list.slice(0, 8));
    }
    return j;
  } catch {
    return load<T | null>(key, null);
  }
}

export const getBibleIndex = () => cached<BibleBook[]>('bible:index', `${BASE}/bible/index.json`);
export const getBibleBook = (id: string) => cached<BibleText>('bible:' + id, `${BASE}/bible/${id}.json`, 'bible:lru');
export const getLibraryIndex = () => cached<LibraryBook[]>('library:index', `${BASE}/library/index.json`);
export const getLibraryBook = (id: string) => cached<LibraryText>('library:' + id, `${BASE}/library/${id}.json`, 'library:lru');

export type Place = { kind: 'bible' | 'library'; id: string; chapter: number; title: string };
export const loadPlace = () => load<Place | null>('reader:place', null);
export const savePlace = (p: Place) => save('reader:place', p);

export type Tone = 'vellum' | 'sepia' | 'night';
export type ReaderPrefs = { size: number; tone: Tone };
export const DEFAULT_PREFS: ReaderPrefs = { size: 18, tone: 'night' };
export const TONE_LABEL: Record<Tone, string> = { vellum: 'Paper', sepia: 'Sepia', night: 'Night' };
export const TONES: Record<Tone, { bg: string; ink: string; soft: string; accent: string; rule: string; bar: string }> = {
  vellum: { bg: '#F4EFE6', ink: '#221E26', soft: '#6D6672', accent: '#8C6A3A', rule: '#E0D9CC', bar: '#EBE5DA' },
  sepia: { bg: '#E9DFCB', ink: '#33281C', soft: '#6E5D49', accent: '#8A5A2E', rule: '#D6C9B0', bar: '#E0D4BD' },
  night: { bg: '#15131A', ink: '#E6DFD2', soft: '#8F8898', accent: '#C4A870', rule: '#2A2630', bar: '#1C1922' },
};

/** Colour and emblem for an illuminated initial, by section of the Bible. */
export function illuminationFor(group: string): { color: string; emblem: 'sun' | 'harp' | 'star' | 'lily' | 'cross' } {
  switch (group) {
    case 'The Law': return { color: '#2F5D50', emblem: 'sun' };
    case 'History': return { color: '#5A3E1E', emblem: 'star' };
    case 'Wisdom': return { color: '#6B2D3A', emblem: 'harp' };
    case 'The Prophets': return { color: '#2E4A7A', emblem: 'star' };
    case 'The Gospels': return { color: '#1F4A6B', emblem: 'cross' };
    case 'Acts': return { color: '#7A3B1E', emblem: 'sun' };
    case 'Letters of Saint Paul': return { color: '#4B2E5A', emblem: 'cross' };
    case 'Catholic Letters': return { color: '#3E5A2E', emblem: 'lily' };
    default: return { color: '#6E1C1A', emblem: 'star' };
  }
}
