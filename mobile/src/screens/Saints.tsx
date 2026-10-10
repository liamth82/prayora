import React, { useCallback, useEffect, useState } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { C, F } from '../theme';
import { useSettings } from '../settings';
import { useKeepable } from '../keep';
import { BASE, Day, getDay, getSaint, getSaintIndex, isoDate, isSanctoral, rankLabelEF, rankLabelOF, Saint, saintKept } from '../today';
import { PagedList, Panel, Sheet, Small, Sub, Title } from '../components/panels';
import Reader from './Reader';
import { SacredSymbol, SYMBOLS } from './Fast';

const mdOf = (d: Date) => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const labelOf = (md: string, month: 'long' | 'short') => {
  const [m, d] = md.split('-').map(Number);
  return new Date(2026, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month });
};

type Open = 'life' | 'prayers' | 'penance' | 'meditation' | 'feasts' | 'zoom' | null;

/** Saints: the painting fills the screen; life, prayers, penance and meditation open from tiles. */
export default function Saints() {
  const { form } = useSettings();
  const today = new Date();
  const todayMd = mdOf(today);
  const kp = useKeepable();
  const { width } = useWindowDimensions();
  const [day, setDay] = useState<Day | null>(null);
  const [saint, setSaint] = useState<Saint | null>(null);
  const [index, setIndex] = useState<{ md: string; name: string }[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Open>(null);

  const loadToday = useCallback(async () => {
    setLoading(true);
    const [d, s, idx] = await Promise.all([getDay(form, isoDate(today)), getSaint(todayMd), getSaintIndex()]);
    setDay(d); setSaint(saintKept(s, d) ? s : null); setIndex(idx); setLoading(false);
  }, [form, todayMd]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadToday(); }, [loadToday]);

  const pick = async (md: string) => {
    setOpen(null); setPicked(md); setLoading(true);
    setSaint(await getSaint(md)); setLoading(false);
  };
  const backToToday = () => { setPicked(null); loadToday(); };
  const upcoming = [...index.filter((x) => x.md > todayMd), ...index.filter((x) => x.md < todayMd)].filter((x) => x.md !== picked).slice(0, 12);
  const rank = day ? (day.form === 'OF' ? rankLabelOF(day.rank) : rankLabelEF(day.rank)) : '';
  const feastRow = (x: { md: string; name: string }) => (
    <Pressable onPress={() => pick(x.md)} style={st.row}>
      <Text style={st.d}>{labelOf(x.md, 'short')}</Text>
      <Text style={st.nm} numberOfLines={1}>{x.name}</Text>
      <Text style={st.chev}>›</Text>
    </Pressable>
  );

  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={C.goldDeep} /></View>;

  if (!saint) {
    const symbol = SYMBOLS.find((x) => x.name === 'cross') ?? SYMBOLS[0];
    return (
      <View style={{ flex: 1, gap: 10 }}>
        <Panel accent style={st.noneHero}>
          <View style={st.noneSym} pointerEvents="none"><SacredSymbol sym={symbol} size={220} /></View>
          <Small>{picked ? labelOf(picked, 'long') : 'Today'}</Small>
          {picked ? <Title>This entry couldn't be loaded</Title> : day && isSanctoral(day) ? (
            <><Title>{day.title}</Title><Sub>{rank ? rank + '. ' : ''}A fuller entry is still being written.</Sub></>
          ) : (
            <>
              <Title>No saint is kept today</Title>
              <Text style={st.noneText} numberOfLines={4}>
                {form === 'OF' ? 'The Church still remembers many saints on days like this in the Roman Martyrology, and you are free to honour any of them.' : 'The Mass is of the season.'}
              </Text>
            </>
          )}
          {picked ? <Pressable onPress={backToToday} hitSlop={8}><Text style={st.more}>‹ Back to today</Text></Pressable> : null}
        </Panel>
        <Panel style={{ flex: 1.3 }}>
          <Small>Coming feasts</Small>
          <PagedList items={upcoming} rowH={46} render={feastRow} empty="No feasts listed yet." />
        </Panel>
      </View>
    );
  }

  const s = saint;
  const uri = s.image ? `${BASE}/saints/${s.image}` : null;
  const lifeParas = [s.history, ...(s.life ?? '').split(/\n\s*\n/)].map((x) => x.trim()).filter(Boolean);
  const tiles: [Open, string, string][] = [
    ['life', 'Life', s.dates || 'Read the story'],
    ...(s.prayerTo || s.prayer ? [['prayers', 'Prayers', s.prayerTo ? `To ${s.name.split(' ').slice(0, 2).join(' ')}` : 'The Collect'] as [Open, string, string]] : []),
    ...(s.penance || s.fast ? [['penance', 'Fast & penance', 'For today'] as [Open, string, string]] : []),
    ...(s.meditation ? [['meditation', 'Meditation', 'A few minutes'] as [Open, string, string]] : []),
  ];
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Pressable onPress={() => uri && setOpen('zoom')} style={st.hero} accessibilityRole="imagebutton" accessibilityLabel={`${s.name}. View the painting full screen`}>
        {uri ? <Image source={{ uri }} style={st.heroImg} resizeMode="cover" /> : null}
        <Svg style={st.heroImg} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
          <Defs><LinearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.4" stopColor="#100E13" stopOpacity="0" /><Stop offset="0.78" stopColor="#100E13" stopOpacity="0.85" /><Stop offset="1" stopColor="#100E13" stopOpacity="0.97" />
          </LinearGradient></Defs>
          <Rect x="0" y="0" width="10" height="10" fill="url(#sg)" />
        </Svg>
        <View style={{ padding: 18 }}>
          <Small>{picked ? labelOf(picked, 'long') : 'Saint of the day'}</Small>
          <Text style={st.name} numberOfLines={2}>{s.name}</Text>
          {s.dates ? <Sub>{s.dates}</Sub> : null}
          {picked ? <Pressable onPress={backToToday} hitSlop={8}><Text style={st.more}>‹ Back to today</Text></Pressable> : null}
        </View>
      </Pressable>
      <View style={st.tiles}>
        {tiles.map(([id, label, sub]) => (
          <Panel key={id} style={[st.tile, { width: tiles.length === 3 ? '31%' : '48%' }]} onPress={() => setOpen(id)} label={label}>
            <Title style={{ fontSize: 20 }} lines={1}>{label}</Title>
            <Text style={st.tileSub} numberOfLines={1}>{sub}</Text>
          </Panel>
        ))}
      </View>
      <Panel onPress={() => setOpen('feasts')} style={st.feastsBar} label="Coming feasts">
        <Small>Coming feasts</Small>
        <Text style={st.feastsNext} numberOfLines={1}>{upcoming[0] ? `${labelOf(upcoming[0].md, 'short')} · ${upcoming[0].name}` : ''}</Text>
        <Text style={st.chev}>›</Text>
      </Panel>

      {open === 'life' ? (
        <Reader loading={false} onClose={() => setOpen(null)} chapter={{
          key: 'saint:' + (picked ?? todayMd), heading: 'Saints', title: s.name, section: s.dates,
          units: lifeParas.map((text) => ({ text })), mode: 'prose', sourceFor: () => `Life of ${s.name}`, position: 'Life',
        }} />
      ) : null}
      <Sheet visible={open === 'prayers'} onClose={() => setOpen(null)} eyebrow="Prayers" title={s.name}>
        {s.prayerTo ? (<><Text style={st.head}>A PRAYER TO {s.name.toUpperCase()}</Text>
          <Text style={st.prayer} {...kp(s.prayerTo, `Prayer to ${s.name}`)}>{s.prayerTo}</Text></>) : null}
        {s.prayer ? (<><Text style={st.head}>{s.prayerSource?.startsWith('Collect') ? 'COLLECT OF THE DAY' : 'PRAYER'}</Text>
          <Text style={st.prayer} {...kp(s.prayer, s.prayerSource ? `${s.prayerSource} · ${s.name}` : `Prayer · ${s.name}`)}>{s.prayer}</Text>
          {s.prayerSource ? <Text style={st.src}>{s.prayerSource}</Text> : null}</>) : null}
        <Text style={st.src}>Press and hold a prayer to keep it in My Wisdom.</Text>
      </Sheet>
      <Sheet visible={open === 'penance'} onClose={() => setOpen(null)} eyebrow="Fast and penance" title={s.name}>
        {s.penance ? <Text style={st.body}>{s.penance}</Text> : null}
        {s.fast ? <Text style={st.body}>{s.fast}</Text> : null}
      </Sheet>
      <Sheet visible={open === 'meditation'} onClose={() => setOpen(null)} eyebrow="Meditation" title={s.name}>
        <Text style={st.prayer} {...kp(s.meditation ?? '', `Meditation · ${s.name}`)}>{s.meditation}</Text>
      </Sheet>
      <Sheet visible={open === 'feasts'} onClose={() => setOpen(null)} eyebrow="Saints of the calendar" title="Coming feasts">
        {upcoming.slice(0, 8).map((x) => <View key={x.md}>{feastRow(x)}</View>)}
      </Sheet>
      <Modal visible={open === 'zoom'} animationType="fade" onRequestClose={() => setOpen(null)} statusBarTranslucent>
        <Pressable style={st.lightbox} onPress={() => setOpen(null)} accessibilityLabel="Close painting">
          {uri ? <Image source={{ uri }} style={{ width, flex: 1 }} resizeMode="contain" /> : null}
          <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
            <Text style={st.lbTitle}>{s.name}</Text>
            {s.imageCredit ? <Text style={st.lbCredit}>{s.imageCredit}</Text> : null}
            <Text style={st.lbHint}>TAP ANYWHERE TO CLOSE</Text>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  hero: { flex: 1, minHeight: 220, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#100E13' },
  heroImg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  name: { fontFamily: F.display, fontSize: 32, lineHeight: 35, color: C.ink, marginTop: 4 },
  more: { fontFamily: F.sc, fontSize: 12.5, color: C.gold, marginTop: 10 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  tile: { flexGrow: 1, paddingVertical: 14 },
  tileSub: { fontFamily: F.ui, fontSize: 11.5, color: C.inkSoft, marginTop: 2 },
  feastsBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  feastsNext: { flex: 1, fontFamily: F.body, fontSize: 14, color: C.ink },
  noneHero: { flex: 1, minHeight: 200, justifyContent: 'flex-end', padding: 20 },
  noneSym: { position: 'absolute', right: -40, top: -20, opacity: 0.14 },
  noneText: { fontFamily: F.body, fontSize: 14.5, lineHeight: 21, color: C.inkSoft, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3 },
  d: { width: 56, fontFamily: F.sc, fontSize: 11, color: C.inkSoft },
  nm: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.ink },
  chev: { fontFamily: F.display, fontSize: 22, color: C.goldDeep },
  head: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 1.4, color: C.gold, marginTop: 6, marginBottom: 6 },
  prayer: { fontFamily: F.displayItalic, fontSize: 20, lineHeight: 28, color: C.ink, marginBottom: 12 },
  body: { fontFamily: F.body, fontSize: 15.5, lineHeight: 24, color: C.ink, marginBottom: 10 },
  src: { fontFamily: F.bodyItalic, fontSize: 12.5, color: C.inkFaint, marginTop: 2, marginBottom: 8 },
  lightbox: { flex: 1, backgroundColor: '#0F0E13', paddingTop: 48, paddingBottom: 28 },
  lbTitle: { fontFamily: F.display, fontSize: 24, color: C.ink },
  lbCredit: { fontFamily: F.bodyItalic, fontSize: 12.5, lineHeight: 18, color: C.inkSoft, marginTop: 4 },
  lbHint: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.4, color: C.inkFaint, marginTop: 10 },
});
