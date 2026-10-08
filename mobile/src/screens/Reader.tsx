import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../theme';
import { useKeepable } from '../keep';
import { load, save } from '../storage';
import { Illumination } from '../components/ui';
import { DEFAULT_PREFS, ReaderPrefs, Tone, TONES } from '../reading';

export type ReaderUnit = { n?: number | string; text: string };
export type ReaderChapter = {
  key: string;            // stable id for remembering scroll position
  heading: string;        // e.g. "Luke" or "The Imitation of Christ"
  title: string;          // e.g. "Chapter 10" or "Of the Imitation of Christ"
  section?: string;       // e.g. "Book I · Admonitions profitable for the spiritual life"
  units: ReaderUnit[];    // verses or paragraphs
  mode: 'verses' | 'prose';
  sourceFor: (u: ReaderUnit) => string; // label saved with kept passages
  illumination?: { color: string; emblem: 'sun' | 'harp' | 'star' | 'lily' | 'cross'; initial: string; name: string };
  position: string;       // e.g. "Chapter 10 of 24"
};

export default function Reader({ chapter, loading, onClose, onPrev, onNext }: {
  chapter: ReaderChapter | null; loading: boolean; onClose: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const kp = useKeepable();
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [showPrefs, setShowPrefs] = useState(false);
  const [progress, setProgress] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const lastSave = useRef(0);
  const T = TONES[prefs.tone];

  useEffect(() => { load<ReaderPrefs>('reader:prefs', DEFAULT_PREFS).then(setPrefs); }, []);
  const setP = (p: Partial<ReaderPrefs>) => { const n = { ...prefs, ...p }; setPrefs(n); save('reader:prefs', n); };

  // Restore the reading position for this chapter.
  useEffect(() => {
    if (!chapter) return;
    setProgress(0);
    load<number>('reader:pos:' + chapter.key, 0).then((y) => {
      setTimeout(() => scroll.current?.scrollTo({ y, animated: false }), 60);
    });
  }, [chapter?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const max = Math.max(1, contentSize.height - layoutMeasurement.height);
    setProgress(Math.min(1, Math.max(0, contentOffset.y / max)));
    const now = Date.now();
    if (chapter && now - lastSave.current > 800) { lastSave.current = now; save('reader:pos:' + chapter.key, contentOffset.y); }
  };

  const size = prefs.size, line = Math.round(size * 1.65);

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style={prefs.tone === 'night' ? 'light' : 'dark'} />
      <View style={[st.root, { backgroundColor: T.bg, paddingTop: insets.top || 28 }]}>
        <View style={[st.bar, { borderColor: T.rule }]}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close reader"><Text style={[st.barBtn, { color: T.soft }]}>‹ Close</Text></Pressable>
          <Text style={[st.barTitle, { color: T.soft }]} numberOfLines={1}>{chapter?.heading ?? ''}</Text>
          <Pressable onPress={() => setShowPrefs(!showPrefs)} hitSlop={12} accessibilityLabel="Text size and page tone"><Text style={[st.aa, { color: T.soft }]}>Aa</Text></Pressable>
        </View>
        {showPrefs ? (
          <View style={[st.prefs, { backgroundColor: T.bar, borderColor: T.rule }]}>
            <View style={st.prefRow}>
              <Pressable onPress={() => setP({ size: Math.max(14, size - 1) })} style={[st.sizeBtn, { borderColor: T.soft }]}><Text style={{ color: T.ink, fontFamily: F.body, fontSize: 14 }}>A</Text></Pressable>
              <Text style={{ color: T.soft, fontFamily: F.body, fontSize: 13 }}>{size}</Text>
              <Pressable onPress={() => setP({ size: Math.min(28, size + 1) })} style={[st.sizeBtn, { borderColor: T.soft }]}><Text style={{ color: T.ink, fontFamily: F.body, fontSize: 20 }}>A</Text></Pressable>
            </View>
            <View style={st.prefRow}>
              {(['vellum', 'sepia', 'night'] as Tone[]).map((t) => (
                <Pressable key={t} onPress={() => setP({ tone: t })} style={[st.tone, { backgroundColor: TONES[t].bg, borderColor: prefs.tone === t ? T.accent : T.rule }]}>
                  <Text style={{ color: TONES[t].ink, fontFamily: F.body, fontSize: 13 }}>{t[0].toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {loading || !chapter ? (
          <ActivityIndicator color={T.soft} style={{ marginTop: 60 }} />
        ) : (
          <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={64} contentContainerStyle={st.page}>
            {chapter.section ? <Text style={[st.chSection, { color: T.soft }]}>{chapter.section}</Text> : null}
            <Text style={[st.chTitle, { color: T.ink }]}>{chapter.title}</Text>
            <Text style={[st.chPos, { color: T.accent }]}>{chapter.position.toUpperCase()}</Text>
            {chapter.illumination ? (
              <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 6 }}>
                <Illumination width={84} book={{ id: chapter.key, name: chapter.illumination.name, ref: '', note: '', verses: [],
                  color: chapter.illumination.color, emblem: chapter.illumination.emblem, initial: chapter.illumination.initial }} />
              </View>
            ) : <View style={[st.ornament, { backgroundColor: T.rule }]} />}
            <View style={{ marginTop: 16 }}>
              {chapter.mode === 'verses' ? (
                <Text style={{ fontFamily: F.body, fontSize: size, lineHeight: line, color: T.ink }}>
                  {chapter.units.map((u, i) => (
                    <Text key={i} {...kp(u.text, chapter.sourceFor(u))}>
                      <Text style={{ fontFamily: F.body, fontSize: size * 0.6, color: T.accent }}>{u.n} </Text>
                      {u.text}{'  '}
                    </Text>
                  ))}
                </Text>
              ) : (
                chapter.units.map((u, i) => (
                  <Text key={i} {...kp(u.text, chapter.sourceFor(u))}
                    style={{ fontFamily: F.body, fontSize: size, lineHeight: line, color: T.ink, marginBottom: line * 0.6, textIndent: undefined } as any}>
                    {i === 0 ? (() => {
                      const k = u.text.search(/[A-Za-z]/);
                      if (k < 0) return u.text;
                      return (<>{u.text.slice(0, k)}<Text style={{ fontFamily: F.display, fontSize: size * 1.9, color: T.accent }}>{u.text[k]}</Text>{u.text.slice(k + 1)}</>);
                    })() : u.text}
                  </Text>
                ))
              )}
            </View>
            <View style={[st.endRow, { borderColor: T.rule }]}>
              {onPrev ? <Pressable onPress={onPrev} style={st.navBtn}><Text style={[st.navText, { color: T.soft }]}>‹ Previous</Text></Pressable> : <View />}
              {onNext ? <Pressable onPress={onNext} style={st.navBtn}><Text style={[st.navText, { color: T.accent }]}>Next chapter ›</Text></Pressable> : <View />}
            </View>
            <Text style={[st.hint, { color: T.soft }]}>Press and hold any passage to keep it in My Wisdom.</Text>
          </ScrollView>
        )}

        <View style={[st.foot, { borderColor: T.rule, backgroundColor: T.bg, paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={[st.track, { backgroundColor: T.rule }]}><View style={[st.fill, { width: `${progress * 100}%`, backgroundColor: T.accent }]} /></View>
          <View style={st.footRow}>
            <Pressable onPress={onPrev} disabled={!onPrev} hitSlop={10}><Text style={[st.footBtn, { color: onPrev ? T.soft : 'transparent' }]}>‹</Text></Pressable>
            <Text style={[st.footText, { color: T.soft }]}>{chapter?.position ?? ''}</Text>
            <Pressable onPress={onNext} disabled={!onNext} hitSlop={10}><Text style={[st.footBtn, { color: onNext ? T.soft : 'transparent' }]}>›</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  barBtn: { fontFamily: F.sc, fontSize: 14, letterSpacing: 1 },
  barTitle: { flex: 1, textAlign: 'center', fontFamily: F.sc, fontSize: 13.5, letterSpacing: 1.4 },
  aa: { fontFamily: F.display, fontSize: 20 },
  prefs: { paddingHorizontal: 18, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  sizeBtn: { borderWidth: 1, borderRadius: 999, width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  tone: { borderWidth: 1.5, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 8 },
  page: { paddingHorizontal: 26, paddingTop: 26, paddingBottom: 40 },
  chSection: { fontFamily: F.bodyItalic, fontSize: 13.5, textAlign: 'center', marginBottom: 8 },
  chTitle: { fontFamily: F.display, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  chPos: { fontFamily: F.sc, fontSize: 12, letterSpacing: 2, textAlign: 'center', marginTop: 6 },
  ornament: { height: 1, width: 80, alignSelf: 'center', marginTop: 18 },
  endRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 30, paddingTop: 16 },
  navBtn: { paddingVertical: 8 },
  navText: { fontFamily: F.sc, fontSize: 15, letterSpacing: 1.2 },
  hint: { fontFamily: F.bodyItalic, fontSize: 12.5, textAlign: 'center', marginTop: 18, opacity: 0.8 },
  foot: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 8 },
  track: { height: 2, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 2 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6 },
  footBtn: { fontFamily: F.display, fontSize: 24, paddingHorizontal: 10 },
  footText: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1.2 },
});
