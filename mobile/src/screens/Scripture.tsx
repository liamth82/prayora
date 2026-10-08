import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import { Back, Eyebrow, H2, Lede, Proto } from '../components/ui';
import Reader, { ReaderChapter } from './Reader';
import {
  BibleBook, BibleText, getBibleBook, getBibleIndex, getLibraryBook, getLibraryIndex, illuminationFor,
  LibraryBook, LibraryText, loadPlace, Place, savePlace,
} from '../reading';

type Open = { kind: 'bible' | 'library'; id: string; chapter: number };

export default function Scripture({ scrollTop }: { scrollTop: () => void }) {
  const [shelf, setShelf] = useState<'bible' | 'library'>('bible');
  const [testament, setTestament] = useState<'OT' | 'NT'>('NT');
  const [index, setIndex] = useState<BibleBook[]>([]);
  const [library, setLibrary] = useState<LibraryBook[] | null>(null);
  const [book, setBook] = useState<BibleBook | null>(null);
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

  // Chapter grid for a chosen book
  if (book) {
    return (
      <View>
        <Back label="All books" onPress={() => { setBook(null); scrollTop(); }} />
        <Eyebrow>{book.group}</Eyebrow>
        <H2>{book.name}</H2>
        {book.modern !== book.name ? <Text style={st.modern}>Called {book.modern} in most modern Bibles</Text> : null}
        <View style={st.grid}>
          {Array.from({ length: book.chapters }, (_, i) => (
            <Pressable key={i} onPress={() => openAt({ kind: 'bible', id: book.id, chapter: i })} style={({ pressed }) => [st.cell, pressed && { backgroundColor: C.vellum2 }]}>
              <Text style={st.cellText}>{i + 1}</Text>
            </Pressable>
          ))}
        </View>
        {reader}
      </View>
    );
  }

  const groups = index.filter((b) => b.testament === testament).reduce<Record<string, BibleBook[]>>((acc, b) => {
    (acc[b.group] ??= []).push(b); return acc;
  }, {});

  return (
    <View>
      <Eyebrow>Sacred Scripture and spiritual classics</Eyebrow>
      <H2>Take up and read</H2>
      <View style={st.seg}>
        {(['bible', 'library'] as const).map((s) => (
          <Pressable key={s} onPress={() => setShelf(s)} style={[st.segBtn, shelf === s && st.segOn]}>
            <Text style={[st.segText, shelf === s && { color: C.vellum }]}>{s === 'bible' ? 'The Bible' : 'The Library'}</Text>
          </Pressable>
        ))}
      </View>

      {place ? (
        <Pressable onPress={() => openAt({ kind: place.kind, id: place.id, chapter: place.chapter })} style={st.continue}>
          <Text style={st.contSmall}>CONTINUE READING</Text>
          <Text style={st.contTitle} numberOfLines={1}>{place.title}</Text>
        </Pressable>
      ) : null}

      {shelf === 'bible' ? (
        <>
          <View style={[st.seg, { marginTop: 4 }]}>
            {(['OT', 'NT'] as const).map((t) => (
              <Pressable key={t} onPress={() => setTestament(t)} style={[st.tBtn, testament === t && st.tOn]}>
                <Text style={[st.tText, testament === t && { color: C.rubric }]}>{t === 'OT' ? 'Old Testament' : 'New Testament'}</Text>
              </Pressable>
            ))}
          </View>
          {!index.length ? <ActivityIndicator color={C.goldDeep} style={{ marginTop: 30 }} /> : null}
          {Object.entries(groups).map(([g, books]) => (
            <View key={g} style={{ marginTop: 14 }}>
              <Text style={st.group}>{g.toUpperCase()}</Text>
              {books.map((b) => (
                <Pressable key={b.id} onPress={() => (b.chapters === 1 ? openAt({ kind: 'bible', id: b.id, chapter: 0 }) : (setBook(b), scrollTop()))}
                  style={({ pressed }) => [st.row, pressed && { backgroundColor: C.vellum2 }]}>
                  <Text style={st.bookName}>{b.name}</Text>
                  {b.modern !== b.name ? <Text style={st.bookModern}>{b.modern}</Text> : null}
                  <Text style={st.count}>{b.chapters}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <Proto>The Douay-Rheims Bible, Challoner revision (1749–52). Public domain.</Proto>
        </>
      ) : (
        <>
          <Lede>Classics of the spiritual life, in translations old enough to be free for everyone.</Lede>
          {library === null ? <ActivityIndicator color={C.goldDeep} /> : null}
          {library && !library.length ? <Text style={st.modern}>The first shelf of classics is being prepared.</Text> : null}
          {(library ?? []).map((b) => (
            <Pressable key={b.id} onPress={() => openAt({ kind: 'library', id: b.id, chapter: 0 })} style={({ pressed }) => [st.lib, pressed && { backgroundColor: C.vellum2 }]}>
              <Text style={st.libTitle}>{b.title}</Text>
              <Text style={st.libAuthor}>{b.author}{b.translator ? ` · translated by ${b.translator}` : ''}</Text>
              {b.blurb ? <Text style={st.libBlurb}>{b.blurb}</Text> : null}
              <Text style={st.libCount}>{b.chapters} {b.chapters === 1 ? 'part' : 'chapters'}</Text>
            </Pressable>
          ))}
        </>
      )}
      {reader}
    </View>
  );
}

const st = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 12 },
  segBtn: { flex: 1, borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingVertical: 9, alignItems: 'center' },
  segOn: { backgroundColor: C.ink },
  segText: { fontFamily: F.sc, fontSize: 14.5, letterSpacing: 1.2, color: C.ink },
  tBtn: { paddingVertical: 6, paddingHorizontal: 4, marginRight: 14, borderBottomWidth: 2, borderColor: 'transparent' },
  tOn: { borderColor: C.rubric },
  tText: { fontFamily: F.sc, fontSize: 14.5, letterSpacing: 1, color: C.inkSoft },
  continue: { backgroundColor: '#0E0B0A', borderRadius: 4, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.gold },
  contSmall: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 2, color: C.gold },
  contTitle: { fontFamily: F.display, fontSize: 22, color: C.vellum, marginTop: 2 },
  group: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1.8, color: C.rubric, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: C.vellum3 },
  bookName: { fontFamily: F.display, fontSize: 20, color: C.ink },
  bookModern: { flex: 1, fontFamily: F.bodyItalic, fontSize: 13, color: C.inkFaint },
  count: { marginLeft: 'auto', fontFamily: F.body, fontSize: 13, color: C.inkFaint },
  modern: { fontFamily: F.bodyItalic, fontSize: 14, color: C.inkSoft, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cell: { width: 52, height: 46, borderWidth: 1, borderColor: C.vellum3, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontFamily: F.body, fontSize: 16, color: C.ink },
  lib: { borderTopWidth: 1, borderColor: C.vellum3, paddingVertical: 14 },
  libTitle: { fontFamily: F.display, fontSize: 23, lineHeight: 27, color: C.ink },
  libAuthor: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 0.8, color: C.rubric, marginTop: 3 },
  libBlurb: { fontFamily: F.body, fontSize: 14.5, lineHeight: 22, color: C.inkSoft, marginTop: 6 },
  libCount: { fontFamily: F.bodyItalic, fontSize: 12.5, color: C.inkFaint, marginTop: 4 },
});
