import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import { fitGrid, PagedList, Panel, Segments, Small, smooth, Title } from '../components/panels';
import Reader, { ReaderChapter } from './Reader';
import {
  BibleBook, BibleText, getBibleBook, getBibleIndex, getLibraryBook, getLibraryIndex, illuminationFor,
  LibraryBook, LibraryText, loadPlace, Place, savePlace,
} from '../reading';

type Open = { kind: 'bible' | 'library'; id: string; chapter: number };

export default function Scripture() {
  const [area, setArea] = useState({ w: 300, h: 300 });
  const [shelf, setShelf] = useState<'bible' | 'library'>('bible');
  const [testament, setTestament] = useState<'OT' | 'NT'>('NT');
  const [index, setIndex] = useState<BibleBook[]>([]);
  const [library, setLibrary] = useState<LibraryBook[] | null>(null);
  const [book, setBook] = useState<BibleBook | null>(null);
  const [libBook, setLibBook] = useState<LibraryBook | null>(null);
  const [contents, setContents] = useState<LibraryText | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [open, setOpen] = useState<Open | null>(null);
  const [bibleText, setBibleText] = useState<BibleText | null>(null);
  const [libText, setLibText] = useState<LibraryText | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getBibleIndex().then((i) => setIndex(i ?? []));
    getLibraryIndex().then((l) => setLibrary(l ?? []));
    loadPlace().then(setPlace);
  }, []);

  const openAt = useCallback(async (o: Open) => {
    setOpen(o);
    setLoading(true);
    if (o.kind === 'bible') {
      const t = bibleText?.id === o.id ? bibleText : await getBibleBook(o.id);
      setBibleText(t);
      const meta = index.find((b) => b.id === o.id);
      const p: Place = { kind: 'bible', id: o.id, chapter: o.chapter, title: `${meta?.name ?? t?.name ?? ''} ${o.chapter + 1}` };
      setPlace(p); savePlace(p);
    } else {
      const t = libText?.id === o.id ? libText : await getLibraryBook(o.id);
      setLibText(t);
      const p: Place = { kind: 'library', id: o.id, chapter: o.chapter, title: `${t?.title ?? ''} · ${t?.chapters[o.chapter]?.title ?? ''}` };
      setPlace(p); savePlace(p);
    }
    setLoading(false);
  }, [bibleText, libText, index]);

  // Build the chapter for the reader.
  let chapter: ReaderChapter | null = null;
  let total = 0;
  if (open?.kind === 'bible' && bibleText && bibleText.id === open.id) {
    const meta = index.find((b) => b.id === open.id);
    const verses = bibleText.chapters[open.chapter] ?? [];
    total = bibleText.chapters.length;
    const ill = illuminationFor(meta?.group ?? '');
    const isPs = bibleText.id === 'psa';
    chapter = {
      key: `bible:${open.id}:${open.chapter}`,
      heading: bibleText.name,
      title: isPs ? `Psalm ${open.chapter + 1}` : total > 1 ? `${bibleText.name} ${open.chapter + 1}` : bibleText.name,
      units: verses.map(([n, text]) => ({ n, text })),
      mode: 'verses',
      sourceFor: (u) => `${isPs ? 'Psalm' : bibleText!.name} ${open.chapter + 1}:${u.n} · Douay-Rheims`,
      illumination: { ...ill, initial: (verses[0]?.[1] ?? 'A').replace(/^[^A-Za-z]+/, '')[0]?.toUpperCase() ?? 'A', name: bibleText.name },
      position: total > 1 ? `Chapter ${open.chapter + 1} of ${total}` : 'One chapter',
    };
  } else if (open?.kind === 'library' && libText && libText.id === open.id) {
    const ch = libText.chapters[open.chapter];
    total = libText.chapters.length;
    chapter = {
      key: `library:${open.id}:${open.chapter}`,
      heading: libText.title,
      title: ch?.title ?? '',
      section: ch?.section,
      units: (ch?.paras ?? []).map((text) => ({ text })),
      mode: 'prose',
      sourceFor: () => `${libText!.title}, ${libText!.author} · ${ch?.title ?? ''}`,
      position: `${open.chapter + 1} of ${total}`,
    };
  }

  const go = (delta: number) => open && openAt({ ...open, chapter: open.chapter + delta });
  const reader = open ? (
    <Reader chapter={chapter} loading={loading} onClose={() => setOpen(null)}
      onPrev={open.chapter > 0 ? () => go(-1) : undefined}
      onNext={total && open.chapter < total - 1 ? () => go(1) : undefined} />
  ) : null;

  const pickLib = (b: LibraryBook) => {
    smooth(); setLibBook(b); setContents(null);
    getLibraryBook(b.id).then((t) => { setContents(t); if (t) setLibText(t); });
  };
  const books = index.filter((b) => b.testament === testament);
  const abbr = abbreviations(index);
  const grid = (n: number, minCols = 4) => fitGrid(n, area.w, area.h - 4, 6, minCols, 10);

  let body: React.ReactNode = null;
  if (shelf === 'bible' && book) {
    const g = grid(book.chapters, 5);
    body = (
      <>
        <View style={st.bodyHead}>
          <Pressable onPress={() => { smooth(); setBook(null); }} hitSlop={10}><Text style={st.back}>‹ Books</Text></Pressable>
          <Text style={st.bodyTitle} numberOfLines={1}>{book.name}</Text>
          <Text style={st.bodyNote} numberOfLines={1}>{book.modern !== book.name ? book.modern : `${book.chapters} chapters`}</Text>
        </View>
        <View style={st.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          <View style={st.grid}>
            {Array.from({ length: book.chapters }, (_, i) => (
              <Pressable key={i} onPress={() => openAt({ kind: 'bible', id: book.id, chapter: i })}
                style={({ pressed }) => [st.cell, { width: g.size, height: g.rowH }, pressed && { backgroundColor: C.vellum3 }]}>
                <Text style={[st.cellText, { fontSize: Math.min(17, g.rowH * 0.45) }]}>{i + 1}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </>
    );
  } else if (shelf === 'bible') {
    const g = grid(books.length, 4);
    body = (
      <>
        <Segments value={testament} onChange={setTestament} options={[['OT', 'Old Testament'], ['NT', 'New Testament']]} style={{ marginBottom: 10 }} />
        <View style={st.area} onLayout={(e) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {!index.length ? <ActivityIndicator color={C.goldDeep} style={{ marginTop: 30 }} /> : null}
          <View style={st.grid}>
            {books.map((b) => (
              <Pressable key={b.id} onPress={() => (b.chapters === 1 ? openAt({ kind: 'bible', id: b.id, chapter: 0 }) : (smooth(), setBook(b)))}
                accessibilityLabel={b.name} style={({ pressed }) => [st.cell, { width: g.size, height: g.rowH }, pressed && { backgroundColor: C.vellum3 }]}>
                <Text style={[st.bookAbbr, { fontSize: Math.min(17, g.rowH * 0.42) }]} numberOfLines={1}>{abbr[b.id]}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </>
    );
  } else if (libBook) {
    const chs = contents?.chapters ?? [];
    body = (
      <>
        <View style={st.bodyHead}>
          <Pressable onPress={() => { smooth(); setLibBook(null); }} hitSlop={10}><Text style={st.back}>‹ Library</Text></Pressable>
          <Text style={st.bodyTitle} numberOfLines={1}>{libBook.title}</Text>
          <Pressable onPress={() => openAt({ kind: 'library', id: libBook.id, chapter: 0 })} hitSlop={10}><Text style={st.begin}>Begin ›</Text></Pressable>
        </View>
        {!contents ? <ActivityIndicator color={C.goldDeep} style={{ marginTop: 20 }} /> : (
          <PagedList items={chs} rowH={50} render={(c, i) => (
            <Pressable onPress={() => openAt({ kind: 'library', id: libBook.id, chapter: i })} style={st.chRow}>
              <Text style={st.chNum}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                {c.section && c.section !== chs[i - 1]?.section ? <Text style={st.chSection} numberOfLines={1}>{c.section}</Text> : null}
                <Text style={st.chTitle} numberOfLines={1}>{c.title}</Text>
              </View>
            </Pressable>
          )} />
        )}
      </>
    );
  } else {
    body = (
      <PagedList items={library ?? []} rowH={62} empty={library === null ? '' : 'The first shelf of classics is being prepared.'} render={(b) => (
        <Pressable onPress={() => pickLib(b)} style={st.libRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.libTitle} numberOfLines={1}>{b.title}</Text>
            <Text style={st.libAuthor} numberOfLines={1}>{b.author}{b.translator ? ` · tr. ${b.translator}` : ''}</Text>
          </View>
          <Text style={st.chev}>›</Text>
        </Pressable>
      )} />
    );
  }

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Panel accent label="Continue reading" style={st.cont}
        onPress={() => (place ? openAt({ kind: place.kind, id: place.id, chapter: place.chapter }) : openAt({ kind: 'bible', id: 'jhn', chapter: 0 }))}>
        <View style={{ flex: 1 }}>
          <Small>{place ? 'Continue reading' : 'Begin here'}</Small>
          <Title lines={1}>{place ? place.title : 'The Gospel of John'}</Title>
        </View>
        <Text style={st.contArrow}>›</Text>
      </Panel>
      <Segments value={shelf} onChange={(v) => { setShelf(v); }} options={[['bible', 'The Bible'], ['library', 'The Library']]} />
      <Panel style={{ flex: 1, paddingBottom: 10 }}>{body}</Panel>
      {reader}
    </View>
  );
}

/** Short names for the book grid: a number prefix and three letters, more where two would clash. */
function abbreviations(books: BibleBook[]): Record<string, string> {
  const make = (name: string, n: number) => {
    const m = name.match(/^(\d)\s+(.*)$/);
    const base = (m ? m[2] : name).replace(/^(The|Book of|Canticle of) /i, '');
    return (m ? m[1] + ' ' : '') + base.slice(0, n);
  };
  const fixed: Record<string, string> = { Ecclesiasticus: 'Sir', Ecclesiastes: 'Eccl', 'Canticle of Canticles': 'Cant', Apocalypse: 'Apoc',
    Philippians: 'Phil', Philemon: 'Phlm', Judith: 'Jdt', Judges: 'Judg', Lamentations: 'Lam' };
  const out: Record<string, string> = {};
  books.forEach((b) => { out[b.id] = fixed[b.name] ?? make(b.name, 3); });
  for (let n = 4; n <= 6; n++) {
    const seen: Record<string, number> = {};
    Object.values(out).forEach((v) => { seen[v] = (seen[v] ?? 0) + 1; });
    books.forEach((b) => { if (seen[out[b.id]] > 1 && !fixed[b.name]) out[b.id] = make(b.name, n); });
  }
  return out;
}

const st = StyleSheet.create({
  cont: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  contArrow: { fontFamily: F.display, fontSize: 32, color: C.gold, marginLeft: 8 },
  area: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cell: { borderRadius: 10, backgroundColor: C.vellum, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: F.body, color: C.ink },
  bookAbbr: { fontFamily: F.display, color: C.ink },
  bodyHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  back: { fontFamily: F.sc, fontSize: 12.5, color: C.inkSoft },
  bodyTitle: { flex: 1, fontFamily: F.display, fontSize: 24, color: C.ink },
  bodyNote: { fontFamily: F.bodyItalic, fontSize: 12, color: C.inkFaint, maxWidth: 110 },
  begin: { fontFamily: F.sc, fontSize: 12.5, color: C.gold },
  chRow: { flexDirection: 'row', alignItems: 'center', gap: 12, height: '100%', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3 },
  chNum: { width: 26, fontFamily: F.sc, fontSize: 11, color: C.inkFaint, textAlign: 'right' },
  chSection: { fontFamily: F.sc, fontSize: 8.5, letterSpacing: 1, color: C.gold, textTransform: 'uppercase' },
  chTitle: { fontFamily: F.body, fontSize: 15, color: C.ink },
  libRow: { flexDirection: 'row', alignItems: 'center', height: '100%', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3 },
  libTitle: { fontFamily: F.display, fontSize: 21, color: C.ink },
  libAuthor: { fontFamily: F.ui, fontSize: 11.5, color: C.inkSoft, marginTop: 1 },
  chev: { fontFamily: F.display, fontSize: 22, color: C.goldDeep, marginLeft: 8 },
});
