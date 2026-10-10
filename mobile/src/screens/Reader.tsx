import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, LayoutChangeEvent, Modal, NativeSyntheticEvent, PanResponder, Pressable,
  StyleSheet, Text, TextLayoutEventData, useWindowDimensions, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { F } from '../theme';
import { useKeepable } from '../keep';
import { load, save } from '../storage';
import { DEFAULT_PREFS, ReaderPrefs, Tone, TONE_LABEL, TONES } from '../reading';

export type ReaderUnit = { n?: number | string; text: string };
export type ReaderChapter = {
  key: string;            // stable id for remembering the reading position
  heading: string;        // e.g. "Luke" or "The Imitation of Christ"
  title: string;          // e.g. "Chapter 10" or "Of the Imitation of Christ"
  section?: string;       // e.g. "Book I · Admonitions profitable for the spiritual life"
  units: ReaderUnit[];    // verses or paragraphs
  mode: 'verses' | 'prose';
  sourceFor: (u: ReaderUnit) => string; // label saved with kept passages
  illumination?: { color: string; emblem: 'sun' | 'harp' | 'star' | 'lily' | 'cross'; initial: string; name: string };
  position: string;       // e.g. "Chapter 10 of 24"
};

const PAD_X = 28, PAD_TOP = 26, PAD_BOTTOM = 14;
type Box = { top: number; bottom: number };
type Page = { start: number; end: number };

/**
 * A paginated, page-turning reader. The chapter is laid out once off screen at the page width; every
 * line's position is measured, and pages are cut on line boundaries so no line is ever split. Each page
 * then shows its own window onto that same layout, so verse numbers, drop caps and press-and-hold to
 * keep a passage all work exactly as they do in the flowing text.
 */
export default function Reader({ chapter, loading, onClose, onPrev, onNext }: {
  chapter: ReaderChapter | null; loading: boolean; onClose: () => void; onPrev?: () => void; onNext?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const kp = useKeepable();
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [showPrefs, setShowPrefs] = useState(false);
  const [areaH, setAreaH] = useState(0);
  const [page, setPage] = useState(0);
  // `pos` is the reading position in pages, continuous while a leaf is mid-turn (2.4 = page 3 lifted 40%)
  const pos = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const T = TONES[prefs.tone];
  const size = prefs.size, line = Math.round(size * 1.6);
  const contentW = W - PAD_X * 2;
  const pageH = Math.max(0, areaH - PAD_TOP - PAD_BOTTOM);

  useEffect(() => { load<ReaderPrefs>('reader:prefs', DEFAULT_PREFS).then(setPrefs); }, []);
  const setP = (p: Partial<ReaderPrefs>) => { const n = { ...prefs, ...p }; setPrefs(n); save('reader:prefs', n); };

  // ---- measurement -------------------------------------------------------------------------------
  const measureKey = chapter && pageH > 0 ? `${chapter.key}|${size}|${contentW}|${pageH}` : '';
  const [paged, setPaged] = useState<{ key: string; pages: Page[] } | null>(null);
  const pages = paged && paged.key === measureKey ? paged.pages : null;

  const measure = useMemo(() => {
    const layouts: Record<string, { y: number; h: number }> = {};
    const lines: Record<string, Box[]> = {};
    let total = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const key = measureKey, chapterKey = chapter?.key ?? '', ph = pageH, step = line;

    const paginate = async () => {
      if (!key || ph <= 0) return;
      const boxes: Box[] = [];
      for (const [id, l] of Object.entries(layouts)) {
        const ls = lines[id];
        if (ls && ls.length) ls.forEach((b) => boxes.push({ top: l.y + b.top, bottom: l.y + b.bottom }));
        else if (l.h <= ph) boxes.push({ top: l.y, bottom: l.y + l.h });
        else for (let y = 0; y < l.h; y += step) boxes.push({ top: l.y + y, bottom: l.y + Math.min(l.h, y + step) }); // no line metrics: step by line height
      }
      boxes.sort((x, y) => x.top - y.top);
      const starts = [0];
      let cur = 0;
      for (const b of boxes) if (b.bottom - cur > ph + 0.5 && b.top > cur) { cur = b.top; starts.push(cur); }
      const end = Math.max(total, boxes.length ? boxes[boxes.length - 1].bottom : 0);
      const ps = starts.map((st0, i) => ({ start: st0, end: i + 1 < starts.length ? starts[i + 1] : end }));
      const saved = await load<number>('reader:pos:' + chapterKey, 0);
      let p = 0;
      ps.forEach((pg, i) => { if (saved >= pg.start - 1) p = i; });
      pos.setValue(p); setPage(p); setPaged({ key, pages: ps });
    };
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(paginate, 140); };
    return {
      layout: (id: string) => (e: LayoutChangeEvent) => { layouts[id] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height }; schedule(); },
      text: (id: string) => (e: NativeSyntheticEvent<TextLayoutEventData>) => {
        lines[id] = e.nativeEvent.lines.map((l) => ({ top: l.y, bottom: l.y + l.height })); schedule();
      },
      root: (e: LayoutChangeEvent) => { total = e.nativeEvent.layout.height; schedule(); },
    };
  }, [measureKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- turning: each page is a leaf hinged at the spine (its left edge) --------------------------
  const count = pages?.length ?? 0;
  const pageRef = useRef(0); pageRef.current = page;
  const countRef = useRef(0); countRef.current = count;
  const land = (p: number) => {
    const from = pageRef.current;
    busy.current = true;
    Animated.timing(pos, { toValue: p, duration: Math.abs(p - from) ? 520 : 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => {
      busy.current = false;
      if (p !== from) {
        Haptics.selectionAsync().catch(() => {});
        setPage(p);
        if (chapter && pages?.[p]) save('reader:pos:' + chapter.key, pages[p].start);
      }
    });
  };
  const goTo = (p: number) => {
    if (busy.current) return;
    if (p < 0) { onPrev?.(); return; }
    if (p >= count) { onNext?.(); return; }
    land(p);
  };
  const nav = useRef({ onPrev, onNext }); nav.current = { onPrev, onNext };
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, g) => !busy.current && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3,
    onPanResponderMove: (_, g) => {
      const p0 = pageRef.current, max = countRef.current - 1;
      pos.setValue(Math.max(Math.max(0, p0 - 1), Math.min(Math.min(max, p0 + 1), p0 - g.dx / (W * 0.85))));
    },
    onPanResponderRelease: (_, g) => {
      const p0 = pageRef.current, max = countRef.current - 1;
      let t = p0;
      if (g.dx < -W * 0.22 || g.vx < -0.35) t = p0 + 1;
      else if (g.dx > W * 0.22 || g.vx > 0.35) t = p0 - 1;
      if (t > max) { land(p0); if (g.dx < -W * 0.3) nav.current.onNext?.(); return; }
      if (t < 0) { land(p0); if (g.dx > W * 0.3) nav.current.onPrev?.(); return; }
      land(t);
    },
    onPanResponderTerminate: () => land(pageRef.current),
  }), [W]); // eslint-disable-line react-hooks/exhaustive-deps

  const tapAt = (x: number) => {
    if (showPrefs) { setShowPrefs(false); return; }
    if (x < W * 0.3) goTo(page - 1);
    else if (x > W * 0.7) goTo(page + 1);
  };
  const turnable = { onPress: (e: any) => tapAt(e?.nativeEvent?.pageX ?? 0) };

  // ---- the chapter itself, rendered identically for measuring and for every page ------------------
  const renderContent = (m: typeof measure | null) => {
    if (!chapter) return null;
    const L = (id: string) => (m ? { onLayout: m.layout(id) } : {});
    const TL = (id: string) => (m ? { onLayout: m.layout(id), onTextLayout: m.text(id) } : {});
    return (
      <View onLayout={m ? m.root : undefined}>
        <View {...L('head')} style={st.head}>
          {chapter.section ? <Text style={[st.chSection, { color: T.soft }]}>{chapter.section}</Text> : null}
          <Text style={[st.chTitle, { color: T.ink }]}>{chapter.title}</Text>
          <Text style={[st.chPos, { color: T.accent }]}>{chapter.position.toUpperCase()}</Text>
          <View style={[st.ornament, { backgroundColor: T.accent }]} />
        </View>
        {chapter.mode === 'verses' ? (
          <Text {...TL('v')} style={{ fontFamily: F.body, fontSize: size, lineHeight: line, color: T.ink }}>
            {chapter.units.map((u, i) => (
              <Text key={i} {...kp(u.text, chapter.sourceFor(u))} {...turnable}>
                <Text style={{ fontFamily: F.sc, fontSize: size * 0.55, color: T.accent }}>{u.n}{' '}</Text>
                {i === 0 ? <DropCap text={u.text} size={size} color={T.accent} /> : u.text}{'  '}
              </Text>
            ))}
          </Text>
        ) : (
          chapter.units.map((u, i) => (
            <Text key={i} {...TL('p' + i)} {...kp(u.text, chapter.sourceFor(u))} {...turnable}
              style={{ fontFamily: F.body, fontSize: size, lineHeight: line, color: T.ink, marginBottom: Math.round(line * 0.55) }}>
              {i === 0 ? <DropCap text={u.text} size={size} color={T.accent} /> : u.text}
            </Text>
          ))
        )}
        <View {...L('end')} style={st.end}>
          <Text style={[st.endMark, { color: T.accent }]}>✠</Text>
          {onNext ? (
            <Pressable onPress={onNext} style={[st.nextBtn, { borderColor: T.rule }]}><Text style={[st.nextText, { color: T.ink }]}>Next chapter</Text></Pressable>
          ) : <Text style={[st.hint, { color: T.soft }]}>The end</Text>}
        </View>
      </View>
    );
  };

  // ---- a leaf: a clipped window onto the laid-out chapter, turning about its left edge ------------
  const renderLeaf = (index: number) => {
    const item = pages![index];
    const turn = pos.interpolate({ inputRange: [index, index + 1], outputRange: ['0deg', '-100deg'], extrapolate: 'clamp' });
    const lift = pos.interpolate({ inputRange: [index, index + 0.5, index + 1], outputRange: [0, 0.22, 0.55], extrapolate: 'clamp' });
    const covered = pos.interpolate({ inputRange: [index - 1, index], outputRange: [0.5, 0], extrapolate: 'clamp' });
    return (
      <Animated.View key={index} style={[st.leaf, { width: W, height: areaH, transformOrigin: 'left center', transform: [{ perspective: 2200 }, { rotateY: turn }] } as any]}>
        <Pressable onPress={(e) => tapAt(e.nativeEvent.pageX)} style={[st.page, { backgroundColor: T.bg }]}>
          <View style={{ height: item.end - item.start, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', top: -item.start, left: 0, width: contentW }}>{renderContent(null)}</View>
          </View>
        </Pressable>
        {/* the page beneath darkens while a leaf lies over it; the turning leaf shades as it lifts */}
        <Animated.View pointerEvents="none" style={[st.shade, { opacity: covered }]} />
        <Animated.View pointerEvents="none" style={[st.overlay, { opacity: lift }]}>
          <Svg width="100%" height="100%"><Defs><LinearGradient id={'lf' + index} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#000" stopOpacity="0.15" /><Stop offset="1" stopColor="#000" stopOpacity="1" /></LinearGradient></Defs><Rect x={0} y={0} width="100%" height="100%" fill={`url(#lf${index})`} /></Svg>
        </Animated.View>
        <View pointerEvents="none" style={[st.spine, { backgroundColor: T.rule }]} />
      </Animated.View>
    );
  };
  // draw the next page first and earlier pages on top, so a leaf always lies over the one after it
  const leaves = pages ? [page + 1, page, page - 1].filter((i) => i >= 0 && i < pages.length) : [];

  const progress = count ? (page + 1) / count : 0;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <StatusBar style={prefs.tone === 'night' ? 'light' : 'dark'} />
      <View style={[st.root, { backgroundColor: T.bg, paddingTop: insets.top || 28 }]}>
        <View style={st.bar}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close reader"><Text style={[st.barBtn, { color: T.soft }]}>Close</Text></Pressable>
          <Text style={[st.barTitle, { color: T.soft }]} numberOfLines={1}>{chapter?.heading ?? ''}</Text>
          <Pressable onPress={() => setShowPrefs(!showPrefs)} hitSlop={12} accessibilityLabel="Text size and page tone"><Text style={[st.aa, { color: T.soft }]}>Aa</Text></Pressable>
        </View>
        {showPrefs ? (
          <View style={[st.prefs, { backgroundColor: T.bar }]}>
            <View style={st.prefRow}>
              <Pressable onPress={() => setP({ size: Math.max(14, size - 1) })} style={[st.sizeBtn, { borderColor: T.rule }]}><Text style={{ color: T.ink, fontFamily: F.body, fontSize: 14 }}>A</Text></Pressable>
              <Text style={{ color: T.soft, fontFamily: F.ui, fontSize: 13, width: 28, textAlign: 'center' }}>{size}</Text>
              <Pressable onPress={() => setP({ size: Math.min(28, size + 1) })} style={[st.sizeBtn, { borderColor: T.rule }]}><Text style={{ color: T.ink, fontFamily: F.body, fontSize: 21 }}>A</Text></Pressable>
            </View>
            <View style={st.prefRow}>
              {(['vellum', 'sepia', 'night'] as Tone[]).map((t) => (
                <Pressable key={t} onPress={() => setP({ tone: t })} style={[st.tone, { backgroundColor: TONES[t].bg, borderColor: prefs.tone === t ? T.accent : T.rule }]}>
                  <Text style={{ color: TONES[t].ink, fontFamily: F.ui, fontSize: 13 }}>{TONE_LABEL[t]}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setAreaH(Math.floor(e.nativeEvent.layout.height))}>
          {chapter && measureKey && !pages ? (
            <View key={measureKey} pointerEvents="none" style={{ position: 'absolute', opacity: 0, left: PAD_X, top: PAD_TOP, width: contentW }}>
              {renderContent(measure)}
            </View>
          ) : null}
          {loading || !chapter || !pages ? (
            <ActivityIndicator color={T.soft} style={{ marginTop: 60 }} />
          ) : (
            <View style={{ flex: 1 }} {...pan.panHandlers}>
              {leaves.map(renderLeaf)}
            </View>
          )}
        </View>

        <View style={[st.foot, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[st.track, { backgroundColor: T.rule }]}><View style={[st.fill, { width: `${progress * 100}%`, backgroundColor: T.accent }]} /></View>
          <View style={st.footRow}>
            <Text style={[st.footText, { color: T.soft }]}>{chapter?.position ?? ''}</Text>
            <Text style={[st.footText, { color: T.soft }]}>{count ? `${page + 1} of ${count}` : ''}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DropCap({ text, size, color }: { text: string; size: number; color: string }) {
  const k = text.search(/[A-Za-z]/);
  if (k < 0) return <>{text}</>;
  return (<>{text.slice(0, k)}<Text style={{ fontFamily: F.display, fontSize: size * 1.9, color }}>{text[k]}</Text>{text.slice(k + 1)}</>);
}

const st = StyleSheet.create({
  root: { flex: 1 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  barBtn: { fontFamily: F.sc, fontSize: 13, letterSpacing: 0.4 },
  barTitle: { flex: 1, textAlign: 'center', fontFamily: F.sc, fontSize: 10.5, letterSpacing: 1.8, textTransform: 'uppercase' },
  aa: { fontFamily: F.display, fontSize: 22 },
  prefs: { paddingHorizontal: 18, paddingVertical: 14, gap: 12 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center' },
  sizeBtn: { borderWidth: 1, borderRadius: 999, width: 46, height: 36, alignItems: 'center', justifyContent: 'center' },
  tone: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  page: { flex: 1, paddingHorizontal: PAD_X, paddingTop: PAD_TOP },
  leaf: { position: 'absolute', top: 0, left: 0, backfaceVisibility: 'hidden' },
  shade: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  spine: { position: 'absolute', top: 0, bottom: 0, left: 0, width: StyleSheet.hairlineWidth },
  head: { alignItems: 'center', paddingBottom: 26 },
  chSection: { fontFamily: F.bodyItalic, fontSize: 13.5, lineHeight: 19, textAlign: 'center', marginBottom: 10 },
  chTitle: { fontFamily: F.display, fontSize: 34, lineHeight: 40, textAlign: 'center' },
  chPos: { fontFamily: F.sc, fontSize: 9.5, letterSpacing: 2.2, textAlign: 'center', marginTop: 8 },
  ornament: { height: 1, width: 36, marginTop: 18, opacity: 0.7 },
  end: { alignItems: 'center', paddingTop: 18, paddingBottom: 10, gap: 16 },
  endMark: { fontSize: 13, opacity: 0.8 },
  nextBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 26, paddingVertical: 11 },
  nextText: { fontFamily: F.sc, fontSize: 13, letterSpacing: 0.4 },
  hint: { fontFamily: F.bodyItalic, fontSize: 13 },
  foot: { paddingHorizontal: 24, paddingTop: 6 },
  track: { height: 1.5, borderRadius: 1, overflow: 'hidden' },
  fill: { height: 1.5 },
  footRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  footText: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1 },
});
