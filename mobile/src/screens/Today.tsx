import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { C, F } from '../theme';
import { currentHour } from '../content';
import { useSettings } from '../settings';
import {
  artForDay, artKeyFor, ArtManifest, BASE, Day, getArtLibrary, getArtManifest, getDay, getSaint, isoDate, LibArt, LIT_COLORS,
  orderedEF, rankLabelEF, rankLabelOF, Saint, saintKept,
} from '../today';
import { load, save } from '../storage';
import { Panel, Small, smooth, Sub, Title } from '../components/panels';
import Reader, { ReaderChapter } from './Reader';

/** Today: one screen of panels. The day's painting fills what space is left. */
export default function Today({ openHours, openSaints }: { openHours: () => void; openSaints: () => void }) {
  const { form, latin } = useSettings();
  const [day, setDay] = useState<Day | null>(null);
  const [art, setArt] = useState<ArtManifest>({});
  const [lib, setLib] = useState<LibArt[]>([]);
  const [saint, setSaint] = useState<Saint | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [zoom, setZoom] = useState(false);
  const [readDays, setReadDays] = useState<string[]>([]);
  const [reading, setReading] = useState<number | null>(null);
  const [saintOpen, setSaintOpen] = useState(false);
  useEffect(() => { load<string[]>('readDays', []).then(setReadDays); getArtLibrary().then(setLib); }, []);
  const now = new Date();
  const date = isoDate(now);

  const refresh = useCallback(async () => {
    setState('loading');
    const [d, m, s] = await Promise.all([getDay(form, date), getArtManifest(), getSaint(date.slice(5))]);
    setDay(d); setArt(m); setSaint(saintKept(s, d) ? s : null);
    setState(d ? 'ready' : 'missing');
  }, [form, date]);
  useEffect(() => { refresh(); }, [refresh]);

  const colorName = day?.color || 'green';
  const lc = LIT_COLORS[colorName] ?? LIT_COLORS.green;
  const key = artKeyFor(day, now);
  const dayArt = useMemo(() => artForDay(key, now, lib, art), [key, lib, art, date]); // eslint-disable-line react-hooks/exhaustive-deps
  const imageUri = saint?.image ? `${BASE}/saints/${saint.image}` : dayArt?.uri ?? null;
  const credit = saint?.image ? saint.imageCredit : dayArt?.credit ?? '';
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour = currentHour(now);
  const isRead = readDays.includes(date);
  const streak = (() => {
    let n = 0; const d = new Date(now);
    if (!readDays.includes(isoDate(d))) d.setDate(d.getDate() - 1);
    while (readDays.includes(isoDate(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  })();
  const markRead = () => {
    if (isRead) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const next = [...readDays, date];
    setReadDays(next); save('readDays', next);
  };
  const chapters = useMemo(() => (day ? readingChapters(day, latin, dateLabel) : []), [day, latin, dateLabel]);
  const words = chapters.reduce((n, c) => n + c.units.reduce((m, u) => m + u.text.split(/\s+/).length, 0), 0);
  const gospel = day?.form === 'OF' ? day.readings.find((r) => r.key === 'gospel')?.ref : undefined;
  const meta = day ? (day.form === 'OF' ? [rankLabelOF(day.rank), day.season] : [rankLabelEF(day.rank), day.tempora !== day.title ? day.tempora : '']).filter(Boolean).join(' · ') : '';

  return (
    <View style={{ flex: 1, gap: 10 }}>
      {/* the day: its painting, with the date and feast laid over it */}
      <Pressable onPress={() => imageUri && setZoom(true)} style={[st.hero, { backgroundColor: lc.bg }]} accessibilityRole="imagebutton"
        accessibilityLabel={`${day?.title ?? dateLabel}. View the painting full screen`}>
        {imageUri ? <Image source={{ uri: imageUri }} style={st.heroImg} resizeMode="cover" /> : null}
        <Svg style={st.heroImg} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
          <Defs><LinearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.35" stopColor={lc.bg} stopOpacity="0" /><Stop offset="0.72" stopColor={lc.bg} stopOpacity="0.82" /><Stop offset="1" stopColor={lc.bg} stopOpacity="0.97" />
          </LinearGradient></Defs>
          <Rect x="0" y="0" width="10" height="10" fill="url(#hg)" />
        </Svg>
        <View style={st.heroText}>
          <Text style={[st.heroDate, { color: lc.accent }]}>{dateLabel.toUpperCase()}</Text>
          {state === 'loading' && !day ? <ActivityIndicator color={lc.fg} style={{ alignSelf: 'flex-start', marginTop: 8 }} /> : null}
          {day ? <Text style={[st.heroTitle, { color: lc.fg }]} numberOfLines={3}>{day.title}</Text> : null}
          {day ? <Text style={[st.heroMeta, { color: lc.fg }]} numberOfLines={1}>{meta}{meta ? ' · ' : ''}{form === 'OF' ? 'Ordinary Form' : 'Missal of 1962'}</Text> : null}
          {state === 'missing' ? <Pressable onPress={refresh}><Text style={[st.heroMeta, { color: lc.fg }]}>Couldn't load today. Tap to try again.</Text></Pressable> : null}
        </View>
      </Pressable>

      {/* the readings, opened as turning pages */}
      {chapters.length ? (
        <Panel accent onPress={() => setReading(0)} label="Begin the readings" style={st.row}>
          <View style={{ flex: 1 }}>
            <Small>{day?.form === 'OF' ? "Today's readings" : 'Proper of the Mass'}</Small>
            <Title>{isRead ? 'Read again' : 'Begin the readings'}</Title>
            <Sub lines={1}>{gospel ? `Gospel · ${gospel}` : `${chapters.length} parts`} · {Math.max(2, Math.round(words / 180))} min</Sub>
          </View>
          <View style={[st.badge, isRead && st.badgeOn]}>
            <Text style={[st.badgeTick, isRead && { color: C.deep }]}>{isRead ? '✓' : '›'}</Text>
          </View>
          {streak > 1 ? <Text style={st.streak}>{streak} days</Text> : null}
        </Panel>
      ) : null}

      {/* the saint (opens out in place) and the Hour */}
      {saintOpen && saint ? (
        <Panel onPress={() => { smooth(); setSaintOpen(false); }} label="Fold the saint away">
          <Small>Saint of the day</Small>
          <Title lines={2}>{saint.name}</Title>
          {saint.dates ? <Sub>{saint.dates}</Sub> : null}
          <Text style={st.saintText} numberOfLines={5}>{saint.history}</Text>
          <Pressable onPress={openSaints} hitSlop={8}><Text style={st.more}>Life, prayer and penance ›</Text></Pressable>
        </Panel>
      ) : null}
      <View style={st.tiles}>
        {!saintOpen || !saint ? (
          <Panel style={st.tile} onPress={saint ? () => { smooth(); setSaintOpen(true); } : openSaints} label="Saint of the day">
            <Small>Saint of the day</Small>
            <Title lines={2} style={st.tileTitle}>{saint ? saint.name : 'None kept today'}</Title>
            <Sub lines={1}>{saint ? 'Tap to read' : 'See coming feasts'}</Sub>
          </Panel>
        ) : null}
        <Panel style={st.tile} onPress={openHours} label={`The Church is praying ${hour.name}`}>
          <Small>The Church prays</Small>
          <Title lines={1} style={st.tileTitle}>{hour.name}</Title>
          <Sub lines={1}>{hour.sub} ›</Sub>
        </Panel>
      </View>

      {reading !== null && chapters[reading] ? (
        <Reader chapter={chapters[reading]} loading={false} onClose={() => setReading(null)}
          onPrev={reading > 0 ? () => setReading(reading - 1) : undefined}
          onNext={reading < chapters.length - 1 ? () => setReading(reading + 1) : undefined}
          nextLabel={`Next: ${chapters[reading + 1]?.title ?? ''}`}
          finish={{ label: isRead ? 'Done' : 'Mark as read', onPress: () => { markRead(); setReading(null); } }} />
      ) : null}

      <Modal visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)} statusBarTranslucent>
        <Pressable style={st.lightbox} onPress={() => setZoom(false)} accessibilityLabel="Close artwork">
          {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', flex: 1 }} resizeMode="contain" /> : null}
          <View style={st.lbCaption}>
            <Text style={st.lbTitle}>{saint?.image ? saint.name : dayArt?.title ?? ''}</Text>
            <Text style={st.lbCredit}>{credit}</Text>
            <Text style={st.lbHint}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function verseRef(ref: string, n: string, isPsalm: boolean) {
  const m = ref.match(/^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s+(\d+):/);
  const book = isPsalm ? 'Psalm' : m ? m[1] : ref;
  if (n.includes(':')) return `${book} ${n}`;
  return m ? `${book} ${m[2]}:${n}` : `${book} ${n}`;
}

const vOrR = (l: string) => l.replace(/^V\.\s/, '℣. ').replace(/^R\.\s/, '℟. ');

/** The day's readings (or the 1962 propers) as chapters for the page-turning reader. */
function readingChapters(day: Day, latin: 'en' | 'both' | 'la', dateLabel: string): ReaderChapter[] {
  if (day.form === 'OF') {
    const rs = day.readings.filter((r) => r.verses.length);
    return rs.map((r, i) => ({
      key: `today:${day.date}:${r.key}`, heading: dateLabel, title: r.label, section: r.ref,
      units: r.verses.map(([n, t]) => ({ n: n.split(':').pop(), text: t })), mode: 'verses' as const,
      sourceFor: (u) => `${verseRef(r.ref, String(day.readings.find((x) => x.key === r.key)!.verses.find(([, t]) => t === u.text)?.[0] ?? u.n), r.key === 'psalm')} · Douay-Rheims`,
      position: `Reading ${i + 1} of ${rs.length}`,
    }));
  }
  const secs = orderedEF(day.sections).filter((s) => s.id !== 'Prefatio');
  return secs.map((s, i) => {
    const lines = (latin === 'la' ? s.la : s.en).map((l) => l.trim()).filter(Boolean);
    const ref = lines.find((l) => /^\*.+\*$/.test(l))?.replace(/\*/g, '');
    const body = lines.filter((l) => !/^\*.+\*$/.test(l)).map(vOrR);
    return {
      key: `today:${day.date}:ef:${s.id}`, heading: day.title, title: s.label, section: ref,
      units: body.map((text) => ({ text })), mode: 'prose' as const,
      sourceFor: () => [s.label, ref, day.title].filter(Boolean).join(' · '),
      position: `${i + 1} of ${secs.length}`,
    };
  }).filter((c) => c.units.length);
}

const st = StyleSheet.create({
  hero: { flex: 1, minHeight: 200, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end' },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  heroText: { padding: 18, paddingTop: 40 },
  heroDate: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 2 },
  heroTitle: { fontFamily: F.display, fontSize: 30, lineHeight: 33, marginTop: 4 },
  heroMeta: { fontFamily: F.ui, fontSize: 12, marginTop: 6, opacity: 0.85 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(196,168,112,0.6)', alignItems: 'center', justifyContent: 'center' },
  badgeOn: { backgroundColor: C.gold, borderColor: C.gold },
  badgeTick: { fontFamily: F.display, fontSize: 22, color: C.gold, marginTop: -2 },
  streak: { position: 'absolute', right: 16, bottom: 8, fontFamily: F.sc, fontSize: 9, color: C.inkFaint, letterSpacing: 0.6 },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, minHeight: 104 },
  tileTitle: { fontSize: 22, lineHeight: 25 },
  saintText: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: C.ink, marginTop: 8 },
  more: { fontFamily: F.sc, fontSize: 12.5, color: C.gold, marginTop: 10 },
  lightbox: { flex: 1, backgroundColor: C.deep, paddingTop: 48, paddingBottom: 28 },
  lbCaption: { paddingHorizontal: 22, paddingTop: 14 },
  lbTitle: { fontFamily: F.display, fontSize: 24, color: C.ink },
  lbCredit: { fontFamily: F.bodyItalic, fontSize: 12.5, lineHeight: 18, color: C.inkSoft, marginTop: 4 },
  lbHint: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.4, color: C.inkFaint, marginTop: 10 },
});
