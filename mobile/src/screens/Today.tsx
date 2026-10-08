import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useKeepable } from '../keep';
import { C, F } from '../theme';
import { currentHour } from '../content';
import { useSettings } from '../settings';
import {
  ArtManifest, artKeyFor, BASE, Day, getSaint, Saint, saintKept, EFDay, EFSection, getArtManifest, getDay, isoDate, LIT_COLORS, OFDay,
  orderedEF, rankLabelEF, rankLabelOF,
} from '../today';
import { load, save } from '../storage';
import { Eyebrow, Proto, Rule } from '../components/ui';

export default function Today({ openHours, onThanks, onRefuge }: { openHours: () => void; onThanks: () => void; onRefuge: () => void }) {
  const { form, latin } = useSettings();
  const { width: winW } = useWindowDimensions();
  const [day, setDay] = useState<Day | null>(null);
  const [art, setArt] = useState<ArtManifest>({});
  const [saint, setSaint] = useState<Saint | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [zoom, setZoom] = useState(false);
  const [readDays, setReadDays] = useState<string[]>([]);
  useEffect(() => { load<string[]>('readDays', []).then(setReadDays); }, []);
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
  const item = art[key] ?? art.default;
  const imageUri = saint?.image ? `${BASE}/saints/${saint.image}` : item ? `${BASE}/art/${item.file}` : null;
  const ratio = saint?.image ? (saint.imageRatio ?? 0.8) : item && item.w && item.h ? item.w / item.h : 0.75;
  const dateLabel = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const hour = currentHour(now);
  const isRead = readDays.includes(date);
  const streak = (() => {
    let n = 0; const d = new Date(now);
    if (!readDays.includes(isoDate(d))) d.setDate(d.getDate() - 1);
    while (readDays.includes(isoDate(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  })();
  const toggleRead = () => {
    const next = isRead ? readDays.filter((x) => x !== date) : [...readDays, date];
    if (!isRead) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setReadDays(next); save('readDays', next);
  };
  const credit = saint?.image ? saint.imageCredit : item ? `${item.title.replace(/\.jpe?g$/i, '')}. ${item.license || 'Public domain'}, via Wikimedia Commons.` : '';

  return (
    <View style={{ marginHorizontal: -20, marginTop: -18 }}>
      {imageUri ? (
        <View style={[st.artWrap, { backgroundColor: lc.bg }]}>
          <Pressable onPress={() => setZoom(true)} style={st.frame} accessibilityRole="imagebutton" accessibilityLabel="View the artwork full screen">
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: Math.min((winW - 54) / ratio, 300) }} resizeMode="cover" accessibilityLabel={saint?.name ?? item?.title ?? 'Manuscript illumination'} />
          </Pressable>
          <Text style={[st.credit, { color: lc.fg, opacity: 0.7 }]} numberOfLines={2}>{credit}</Text>
          <Modal visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)} statusBarTranslucent>
            <Pressable style={st.lightbox} onPress={() => setZoom(false)} accessibilityLabel="Close artwork">
              <Image source={{ uri: imageUri }} style={{ width: '100%', flex: 1 }} resizeMode="contain" />
              <View style={st.lbCaption}>
                <Text style={st.lbTitle}>{saint?.image ? saint.name : day?.title ?? ''}</Text>
                <Text style={st.lbCredit}>{credit}</Text>
                <Text style={st.lbHint}>Tap anywhere to close</Text>
              </View>
            </Pressable>
          </Modal>
        </View>
      ) : null}

      <View style={[st.band, { backgroundColor: lc.bg }]}>
        <Text style={[st.date, { color: lc.accent }]}>{dateLabel.toUpperCase()}</Text>
        {state === 'loading' && !day ? <ActivityIndicator color={lc.fg} style={{ marginVertical: 18 }} /> : null}
        {day ? (
          <>
            <Text style={[st.title, { color: lc.fg }]}>{day.title}</Text>
            <Text style={[st.meta, { color: lc.fg }]}>
              {day.form === 'OF' ? [rankLabelOF(day.rank), day.season].filter(Boolean).join(' · ') : [rankLabelEF(day.rank), day.tempora !== day.title ? day.tempora : ''].filter(Boolean).join(' · ')}
            </Text>
            <Text style={[st.form, { color: lc.accent }]}>{form === 'OF' ? 'ORDINARY FORM' : 'MISSAL OF 1962'} · {colorName.toUpperCase()}{isRead ? '  ·  ✓ READ' : ''}</Text>
          </>
        ) : null}
        {state === 'missing' ? (
          <Pressable onPress={refresh}><Text style={[st.meta, { color: lc.fg, marginTop: 8 }]}>Today's readings couldn't be loaded. Check your connection and tap to try again.</Text></Pressable>
        ) : null}
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        {saint ? <SaintCard s={saint} accent={lc.bg === LIT_COLORS.white.bg ? C.goldDeep : lc.bg} /> : null}

        <View style={st.quick}>
          <Pressable onPress={onThanks} style={({ pressed }) => [st.quickBtn, pressed && { backgroundColor: C.vellum2 }]} accessibilityRole="button">
            <Text style={st.quickSmall}>SOMETHING GOOD?</Text>
            <Text style={st.quickTitle}>Give thanks</Text>
          </Pressable>
          <Pressable onPress={onRefuge} style={({ pressed }) => [st.quickBtn, pressed && { backgroundColor: C.vellum2 }]} accessibilityRole="button">
            <Text style={st.quickSmall}>TEMPTED?</Text>
            <Text style={st.quickTitle}>Take refuge</Text>
          </Pressable>
        </View>

        <Pressable onPress={openHours} style={st.hourRow}>
          <Text style={st.hourLabel}>THE CHURCH IS PRAYING</Text>
          <Text style={st.hourName}>{hour.name} <Text style={st.hourSub}>· {hour.sub} ›</Text></Text>
        </Pressable>

        {day?.form === 'OF' ? <OFReadings day={day} /> : null}
        {day?.form === 'EF' ? <EFPropers day={day} latin={latin} /> : null}
        {day ? (
          <View style={st.readBox}>
            <Pressable onPress={toggleRead} style={[st.readBtn, isRead && st.readBtnOn]} accessibilityRole="checkbox" accessibilityState={{ checked: isRead }}>
              <Text style={[st.readText, isRead && { color: C.vellum }]}>{isRead ? '✓  Read today' : 'Mark as read'}</Text>
            </Pressable>
            <Text style={st.streak}>
              {streak > 1 ? `${streak} days in a row` : streak === 1 ? 'First day of a new run' : 'Read the day\'s readings to begin a run'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function SaintCard({ s, accent }: { s: Saint; accent: string }) {
  const kp = useKeepable();
  return (
    <View style={{ marginBottom: 8 }}>
      <Eyebrow>Saint of the day</Eyebrow>
      <Text style={st.saintName}>{s.name}</Text>
      {s.dates ? <Text style={st.saintDates}>{s.dates}</Text> : null}
      <Text style={st.body}>{s.history}</Text>
      {s.prayer ? (
        <View style={[st.prayer, { borderColor: accent }]}>
          <Text style={st.smallHead}>PRAYER</Text>
          <Text style={st.prayerText} {...kp(s.prayer, s.prayerSource ? `${s.prayerSource} · ${s.name}` : `Prayer · ${s.name}`)}>{s.prayer}</Text>
          {s.prayerSource ? <Text style={st.src}>{s.prayerSource}</Text> : null}
        </View>
      ) : null}
      {s.fast ? (<><Text style={st.smallHead}>FAST</Text><Text style={st.body}>{s.fast}</Text></>) : null}
      {s.meditation ? (<><Text style={st.smallHead}>MEDITATION</Text><Text style={[st.body, { fontFamily: F.bodyItalic }]} {...kp(s.meditation, `Meditation · ${s.name}`)}>{s.meditation}</Text></>) : null}
      <Rule />
    </View>
  );
}

function Collapsible({ label, sub, initiallyOpen, children }: { label: string; sub?: string; initiallyOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(!!initiallyOpen);
  return (
    <View style={st.section}>
      <Pressable onPress={() => setOpen(!open)} style={st.sectionHead} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1 }}>
          <Text style={st.sectionLabel}>{label}</Text>
          {sub ? <Text style={st.sectionRef}>{sub}</Text> : null}
        </View>
        <Text style={st.chev}>{open ? '–' : '+'}</Text>
      </Pressable>
      {open ? <View style={{ paddingBottom: 12 }}>{children}</View> : null}
    </View>
  );
}

function verseRef(ref: string, n: string, isPsalm: boolean) {
  const m = ref.match(/^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s+(\d+):/);
  const book = isPsalm ? 'Psalm' : m ? m[1] : ref;
  if (n.includes(':')) return `${book} ${n}`;
  return m ? `${book} ${m[2]}:${n}` : `${book} ${n}`;
}

function OFReadings({ day }: { day: OFDay }) {
  const kp = useKeepable();
  return (
    <View>
      <Eyebrow>Readings at Mass</Eyebrow>
      {day.readings.map((r) => (
        <Collapsible key={r.key} label={r.label} sub={r.ref} initiallyOpen={r.key === 'gospel'}>
          {r.verses.length ? (
            <Text style={st.reading}>
              {r.verses.map(([n, t], i) => (
                <Text key={i} {...kp(t, `${verseRef(r.ref, n, r.key === 'psalm')} · Douay-Rheims`)}><Text style={st.vn}>{n.split(':').pop()} </Text>{t} </Text>
              ))}
            </Text>
          ) : <Text style={st.src}>Text not available for this reference.</Text>}
          {r.key === 'psalm' && r.verses[0] ? <Text style={st.src}>Douay-Rheims numbering: Psalm {r.verses[0][0].split(':')[0]}.</Text> : null}
        </Collapsible>
      ))}
      <Proto>Press and hold a verse to keep it in My Wisdom. The readings follow the Church's lectionary for today. The text shown is the Douay-Rheims Bible, so its wording and some verse numbers differ from what you will hear at Mass.</Proto>
    </View>
  );
}

const OPEN_EF = new Set(['Oratio', 'Lectio', 'Evangelium']);

function EFBody({ lines, isLatin, sectionId, source }: { lines: string[]; isLatin?: boolean; sectionId: string; source: string }) {
  const kp = useKeepable();
  const out: React.ReactNode[] = [];
  lines.forEach((raw, i) => {
    const l = raw.trim();
    if (!l) return;
    const ref = l.match(/^\*(.+)\*$/);
    if (ref) { out.push(<Text key={i} style={st.efRef}>{ref[1]}</Text>); return; }
    if (i === 0 && (sectionId.startsWith('Lectio') || sectionId.startsWith('Evangelium'))) {
      out.push(<Text key={i} style={st.efHead}>{l}</Text>); return;
    }
    out.push(<Text key={i} style={[st.reading, isLatin && st.latin]} {...kp(l.replace(/^V\.\s/, '℣. ').replace(/^R\.\s/, '℟. '), source)}>{l.replace(/^V\.\s/, '℣. ').replace(/^R\.\s/, '℟. ')}</Text>);
  });
  return <View style={{ gap: 6 }}>{out}</View>;
}

function EFPropers({ day, latin }: { day: EFDay; latin: 'en' | 'both' | 'la' }) {
  const sections = orderedEF(day.sections).filter((s) => s.id !== 'Prefatio');
  const preface = day.sections.find((s) => s.id === 'Prefatio');
  return (
    <View>
      <Eyebrow>Proper of the Mass</Eyebrow>
      {day.commemorations.length ? <Text style={st.src}>Commemoration: {day.commemorations.join('; ')}</Text> : null}
      {sections.map((s: EFSection) => {
        const refLine = s.en.find((l) => /^\*.+\*$/.test(l.trim()));
        return (
          <Collapsible key={s.id} label={s.label} sub={refLine ? refLine.replace(/\*/g, '') : undefined} initiallyOpen={OPEN_EF.has(s.id)}>
            {latin !== 'la' ? <EFBody lines={s.en} sectionId={s.id} source={[s.label, refLine?.replace(/\*/g, ''), day.title].filter(Boolean).join(' · ')} /> : null}
            {latin !== 'en' ? <View style={latin === 'both' ? st.latinBox : undefined}><EFBody lines={s.la} isLatin sectionId={s.id} source={[s.label, refLine?.replace(/\*/g, ''), day.title, 'Latin'].filter(Boolean).join(' · ')} /></View> : null}
          </Collapsible>
        );
      })}
      {preface ? <Text style={st.src}>Preface: {(preface.en.find((l) => /^\*.+\*$/.test(l)) ?? '').replace(/\*/g, '') || 'Common'}</Text> : null}
      <Proto>Press and hold a line to keep it in My Wisdom. Propers of the 1962 Roman Missal, from the Missale Meum project. Latin text from the Divinum Officium project.</Proto>
    </View>
  );
}

const st = StyleSheet.create({
  lightbox: { flex: 1, backgroundColor: '#0E0A08', paddingTop: 48, paddingBottom: 28 },
  lbCaption: { paddingHorizontal: 22, paddingTop: 14 },
  lbTitle: { fontFamily: F.display, fontSize: 22, color: '#F5EDD6' },
  lbCredit: { fontFamily: F.bodyItalic, fontSize: 12.5, lineHeight: 18, color: '#B9A57F', marginTop: 4 },
  lbHint: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 1.4, color: '#7E6E55', marginTop: 10 },
  quick: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  quickBtn: { flex: 1, borderWidth: 1, borderColor: C.vellum3, borderRadius: 3, paddingVertical: 10, paddingHorizontal: 12 },
  quickSmall: { fontFamily: F.sc, fontSize: 11, letterSpacing: 1.4, color: C.inkFaint },
  quickTitle: { fontFamily: F.display, fontSize: 20, color: C.ink, marginTop: 1 },
  readBox: { alignItems: 'center', marginTop: 26, marginBottom: 6, gap: 8 },
  readBtn: { borderWidth: 1, borderColor: C.ink, borderRadius: 3, paddingHorizontal: 22, paddingVertical: 12 },
  readBtnOn: { backgroundColor: C.green, borderColor: C.green },
  readText: { fontFamily: F.sc, fontSize: 15, letterSpacing: 1.2, color: C.ink },
  streak: { fontFamily: F.bodyItalic, fontSize: 13, color: C.inkSoft },
  artWrap: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 6 },
  frame: { borderWidth: 3, borderColor: C.gold, padding: 4, backgroundColor: C.gold },
  credit: { fontFamily: F.bodyItalic, fontSize: 10.5, marginTop: 6, lineHeight: 14 },
  band: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22 },
  date: { fontFamily: F.sc, fontSize: 13, letterSpacing: 2 },
  title: { fontFamily: F.display, fontSize: 32, lineHeight: 36, marginTop: 6 },
  meta: { fontFamily: F.body, fontSize: 14, lineHeight: 20, marginTop: 6, opacity: 0.9 },
  form: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.6, marginTop: 10 },
  hourRow: { borderWidth: 1, borderColor: C.vellum3, padding: 12, marginBottom: 20, borderRadius: 3 },
  hourLabel: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 1.5, color: C.inkFaint },
  hourName: { fontFamily: F.display, fontSize: 21, color: C.ink, marginTop: 2 },
  hourSub: { fontFamily: F.body, fontSize: 13, color: C.inkSoft },
  section: { borderTopWidth: 1, borderColor: C.vellum3 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  sectionLabel: { fontFamily: F.display, fontSize: 20, color: C.ink },
  sectionRef: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 0.8, color: C.rubric, marginTop: 1 },
  chev: { fontFamily: F.display, fontSize: 24, color: C.goldDeep, width: 20, textAlign: 'center' },
  reading: { fontFamily: F.body, fontSize: 16.5, lineHeight: 27, color: C.ink },
  latin: { fontFamily: F.bodyItalic, color: C.inkSoft, fontSize: 15.5, lineHeight: 25 },
  latinBox: { marginTop: 10, paddingLeft: 12, borderLeftWidth: 2, borderColor: C.gold },
  vn: { fontFamily: F.sc, fontSize: 12, color: C.rubric },
  efRef: { fontFamily: F.sc, fontSize: 12.5, color: C.rubric, letterSpacing: 0.6 },
  efHead: { fontFamily: F.bodyItalic, fontSize: 14, color: C.inkSoft },
  src: { fontFamily: F.bodyItalic, fontSize: 12.5, color: C.inkFaint, marginTop: 6, marginBottom: 6 },
  saintName: { fontFamily: F.display, fontSize: 27, lineHeight: 31, color: C.ink },
  saintDates: { fontFamily: F.bodyItalic, fontSize: 13, color: C.inkSoft, marginBottom: 8 },
  body: { fontFamily: F.body, fontSize: 15.5, lineHeight: 24, color: C.ink, marginBottom: 8 },
  prayer: { borderLeftWidth: 3, paddingLeft: 14, marginVertical: 10 },
  prayerText: { fontFamily: F.displayItalic, fontSize: 18, lineHeight: 26, color: C.ink },
  smallHead: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1.4, color: C.rubric, marginTop: 8, marginBottom: 4 },
});
