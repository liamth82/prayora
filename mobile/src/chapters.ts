import type { ReaderChapter } from './screens/Reader';
import { getBibleBook, getBibleIndex, getLibraryBook } from './reading';

/** A chapter of the Bible or the Library, ready for the reader. */
export async function chapterFor(kind: 'bible' | 'library', id: string, chapter: number): Promise<ReaderChapter | null> {
  if (kind === 'bible') {
    const [t, index] = await Promise.all([getBibleBook(id), getBibleIndex()]);
    if (!t) return null;
    const verses = t.chapters[chapter] ?? [];
    const total = t.chapters.length;
    const isPs = t.id === 'psa';
    void index;
    return {
      key: `bible:${id}:${chapter}`, heading: t.name,
      title: isPs ? `Psalm ${chapter + 1}` : total > 1 ? `${t.name} ${chapter + 1}` : t.name,
      units: verses.map(([n, text]) => ({ n, text })), mode: 'verses',
      sourceFor: (u) => `${isPs ? 'Psalm' : t.name} ${chapter + 1}:${u.n} · Douay-Rheims`,
      position: total > 1 ? `Chapter ${chapter + 1} of ${total}` : 'One chapter',
    };
  }
  const t = await getLibraryBook(id);
  if (!t) return null;
  const ch = t.chapters[chapter];
  return {
    key: `library:${id}:${chapter}`, heading: t.title, title: ch?.title ?? '', section: ch?.section,
    units: (ch?.paras ?? []).map((text) => ({ text })), mode: 'prose',
    sourceFor: () => `${t.title}, ${t.author} · ${ch?.title ?? ''}`,
    position: `${chapter + 1} of ${t.chapters.length}`,
  };
}
