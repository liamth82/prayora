import React, { useState } from 'react';
import {
  LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, UIManager, View, ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try { UIManager.setLayoutAnimationEnabledExperimental(true); } catch { /* new architecture: not needed */ }
}

/** Animate the next layout change (a panel growing or shrinking). */
export const smooth = () => LayoutAnimation.configureNext(LayoutAnimation.create(260, 'easeInEaseOut', 'opacity'));

/** A rounded surface. Pressable when given onPress. */
export function Panel({ children, onPress, onLongPress, style, accent, label }: {
  children: React.ReactNode; onPress?: () => void; onLongPress?: () => void; style?: StyleProp<ViewStyle>; accent?: boolean; label?: string;
}) {
  const base = [p.panel, accent && p.accent, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [base, pressed && { opacity: 0.86, transform: [{ scale: 0.992 }] }]}>
      {children}
    </Pressable>
  );
}

export const Small = ({ children, style }: { children: React.ReactNode; style?: any }) => <Text style={[p.small, style]}>{children}</Text>;
export const Title = ({ children, style, lines }: { children: React.ReactNode; style?: any; lines?: number }) => (
  <Text style={[p.title, style]} numberOfLines={lines}>{children}</Text>
);
export const Sub = ({ children, style, lines }: { children: React.ReactNode; style?: any; lines?: number }) => (
  <Text style={[p.sub, style]} numberOfLines={lines}>{children}</Text>
);

/** Segmented control. */
export function Segments<T extends string>({ value, options, onChange, style }: {
  value: T; options: [T, string][]; onChange: (v: T) => void; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[p.seg, style]}>
      {options.map(([v, label]) => (
        <Pressable key={v} onPress={() => { smooth(); onChange(v); }} style={[p.segBtn, value === v && p.segOn]}
          accessibilityRole="tab" accessibilityState={{ selected: value === v }}>
          <Text style={[p.segText, value === v && { color: C.deep }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A bottom sheet for short, focused content (a prayer, a list). */
export function Sheet({ visible, onClose, eyebrow, title, children }: {
  visible: boolean; onClose: () => void; eyebrow?: string; title?: string; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={p.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[p.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        <View style={p.grab} />
        <View style={p.sheetHead}>
          <View style={{ flex: 1 }}>
            {eyebrow ? <Small>{eyebrow}</Small> : null}
            {title ? <Title style={{ fontSize: 28 }}>{title}</Title> : null}
          </View>
          <Pressable onPress={onClose} hitSlop={12}><Text style={p.close}>Close</Text></Pressable>
        </View>
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 6 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

/** Best grid for n cells in a w×h box: as large as possible, never needing to scroll. */
export function fitGrid(n: number, w: number, h: number, gap = 6, minCols = 3, maxCols = 12) {
  let best = { cols: minCols, size: 0, rowH: 0 };
  for (let cols = minCols; cols <= maxCols; cols++) {
    const rows = Math.ceil(n / cols);
    const cw = (w - gap * (cols - 1)) / cols;
    const rh = Math.min(cw * 0.8, (h - gap * (rows - 1)) / rows);
    if (rh > best.rowH) best = { cols, size: cw, rowH: rh };
  }
  return best;
}

/** A list that shows as many rows as fit and turns pages, rather than scrolling. */
export function PagedList<T>({ items, rowH = 50, render, empty }: {
  items: T[]; rowH?: number; render: (item: T, i: number) => React.ReactNode; empty?: string;
}) {
  const [h, setH] = useState(0);
  const [page, setPage] = useState(0);
  const per = Math.max(1, Math.floor((h - 40) / rowH));
  const pages = Math.max(1, Math.ceil(items.length / per));
  const pg = Math.min(page, pages - 1);
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setH(e.nativeEvent.layout.height)}>
      {h ? (
        <>
          <View style={{ flex: 1 }}>
            {items.length ? items.slice(pg * per, pg * per + per).map((it, i) => (
              <View key={pg * per + i} style={{ height: rowH, justifyContent: 'center' }}>{render(it, pg * per + i)}</View>
            )) : <Sub style={{ marginTop: 12 }}>{empty ?? ''}</Sub>}
          </View>
          {pages > 1 ? (
            <View style={p.pager}>
              <Pressable onPress={() => setPage(Math.max(0, pg - 1))} hitSlop={10} disabled={pg === 0}><Text style={[p.pagerBtn, pg === 0 && { opacity: 0.25 }]}>‹</Text></Pressable>
              <Text style={p.pagerText}>{pg + 1} of {pages}</Text>
              <Pressable onPress={() => setPage(Math.min(pages - 1, pg + 1))} hitSlop={10} disabled={pg >= pages - 1}><Text style={[p.pagerBtn, pg >= pages - 1 && { opacity: 0.25 }]}>›</Text></Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export const p = StyleSheet.create({
  panel: { backgroundColor: C.vellum2, borderRadius: 18, padding: 16, overflow: 'hidden' },
  accent: { backgroundColor: '#241F29', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(196,168,112,0.45)' },
  small: { fontFamily: F.sc, fontSize: 9.5, letterSpacing: 1.8, color: C.gold, textTransform: 'uppercase' },
  title: { fontFamily: F.display, fontSize: 25, lineHeight: 29, color: C.ink, marginTop: 2 },
  sub: { fontFamily: F.bodyItalic, fontSize: 13, lineHeight: 18, color: C.inkSoft, marginTop: 2 },
  seg: { flexDirection: 'row', backgroundColor: C.vellum2, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  segOn: { backgroundColor: C.ink },
  segText: { fontFamily: F.sc, fontSize: 12.5, color: C.inkSoft },
  scrim: { flex: 1, backgroundColor: 'rgba(8,7,10,0.6)' },
  sheet: { backgroundColor: C.vellum, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 22, paddingTop: 10, maxHeight: '86%',
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3 },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: C.vellum3, marginBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  close: { fontFamily: F.sc, fontSize: 13, color: C.inkSoft, marginTop: 2 },
  pager: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22 },
  pagerBtn: { fontFamily: F.display, fontSize: 28, color: C.gold, paddingHorizontal: 8 },
  pagerText: { fontFamily: F.sc, fontSize: 11, color: C.inkSoft, letterSpacing: 0.6 },
});
