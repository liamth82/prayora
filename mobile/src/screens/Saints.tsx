import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { C, F } from '../theme';
import { useSettings } from '../settings';
import { useKeepable } from '../keep';
import { BASE, Day, getDay, getSaint, getSaintIndex, isoDate, isSanctoral, rankLabelEF, rankLabelOF, Saint, saintKept } from '../today';
import { Eyebrow, Proto, Rule } from '../components/ui';

const mdOf = (d: Date) => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const labelOf = (md: string, month: 'long' | 'short') => {
  const [m, d] = md.split('-').map(Number);
  return new Date(2026, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month });
};

export default function Saints({ scrollTop }: { scrollTop: () => void }) {
  const { form } = useSettings();
  const today = new Date();
  const todayMd = mdOf(today);
  const [day, setDay] = useState<Day | null>(null);
  const [saint, setSaint] = useState<Saint | null>(null);
  const [index, setIndex] = useState<{ md: string; name: string }[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadToday = useCallback(async () => {
    setLoading(true);
    const [d, s, idx] = await Promise.all([getDay(form, isoDate(today)), getSaint(todayMd), getSaintIndex()]);
    setDay(d); setSaint(saintKept(s, d) ? s : null); setIndex(idx); setLoading(false);
  }, [form, todayMd]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadToday(); }, [loadToday]);

  const pick = async (md: string) => {
    setPicked(md); setLoading(true); scrollTop();
    setSaint(await getSaint(md)); setLoading(false);
  };
  const backToToday = () => { setPicked(null); loadToday(); scrollTop(); };

  const upcoming = [...index.filter((x) => x.md > todayMd), ...index.filter((x) => x.md < todayMd)].filter((x) => x.md !== picked).slice(0, 8);
  const rank = day ? (day.form === 'OF' ? rankLabelOF(day.rank) : rankLabelEF(day.rank)) : '';

  return (
    <View>
      <Eyebrow>{picked ? labelOf(picked, 'long') : 'Today'} · Saints of the Calendar</Eyebrow>
      {loading ? <ActivityIndicator color={C.goldDeep} style={{ marginVertical: 30 }} /> : null}

      {!loading && saint ? <FullSaint s={saint} /> : null}

      {!loading && !saint && !picked ? (
        <View style={st.none}>
          {day && isSanctoral(day) ? (
            <>
              <Text style={st.noneTitle}>{day.title}</Text>
              <Text style={st.noneText}>{rank ? rank + '. ' : ''}A fuller entry for this celebration is still being written.</Text>
            </>
          ) : (
            <>
              <Text style={st.noneTitle}>No saint is kept today</Text>
              <Text style={st.noneText}>
                {day ? `Today is ${day.title} in the ${form === 'OF' ? 'modern calendar' : 'calendar of 1962'}, with no saint's feast. ` : ''}
                {form === 'OF' ? 'The Church still remembers many saints on days like this in the Roman Martyrology, and you are free to honour any of them.' : 'The Mass is of the season.'}
              </Text>
            </>
          )}
          <Text style={st.noneHint}>{form === 'OF' ? 'The calendar of 1962 sometimes keeps a saint on days like this. You can switch calendars in Settings.' : 'The modern calendar sometimes keeps a different saint. You can switch calendars in Settings.'}</Text>
        </View>
      ) : null}

      {!loading && picked && !saint ? <Text style={st.noneText}>This entry couldn't be loaded. Check your connection.</Text> : null}
      {picked ? <Pressable onPress={backToToday} style={{ marginTop: 14 }}><Text style={st.back}>‹ Back to today</Text></Pressable> : null}

      <Rule />
      <Eyebrow>Coming feasts</Eyebrow>
      {upcoming.map((x) => (
        <Pressable key={x.md} onPress={() => pick(x.md)} style={st.row}>
          <Text style={st.d}>{labelOf(x.md, 'short')}</Text>
          <Text style={st.nm}>{x.name}</Text>
          <Text style={st.chev}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FullSaint({ s }: { s: Saint }) {
  const kp = useKeepable();
  const [zoom, setZoom] = useState(false);
  const { width } = useWindowDimensions();
  const uri = s.image ? `${BASE}/saints/${s.image}` : null;
  const ratio = s.imageRatio ?? 0.8;
  return (
    <View>
      {uri ? (
        <View style={st.paintWrap}>
          <Pressable onPress={() => setZoom(true)} style={st.frame} accessibilityRole="imagebutton" accessibilityLabel={`Painting of ${s.name}, view full screen`}>
            <Image source={{ uri }} style={{ width: '100%', height: Math.min((width - 54) / ratio, 380) }} resizeMode="cover" />
          </Pressable>
          {s.imageCredit ? <Text style={st.credit} numberOfLines={2}>{s.imageCredit}</Text> : null}
          <Modal visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)} statusBarTranslucent>
            <Pressable style={st.lightbox} onPress={() => setZoom(false)} accessibilityLabel="Close painting">
              <Image source={{ uri }} style={{ width: '100%', flex: 1 }} resizeMode="contain" />
              <View style={{ paddingHorizontal: 22, paddingTop: 14 }}>
                <Text style={st.lbTitle}>{s.name}</Text>
                {s.imageCredit ? <Text style={st.lbCredit}>{s.imageCredit}</Text> : null}
                <Text style={st.lbHint}>TAP ANYWHERE TO CLOSE</Text>
              </View>
            </Pressable>
          </Modal>
        </View>
      ) : null}

      <View style={st.panel}>
        <Text style={st.name}>{s.name}</Text>
        {s.dates ? <Text style={st.dates}>{s.dates}</Text> : null}
        <Text style={st.bodyLight}>{s.history}</Text>
        {s.life ? <Text style={st.bodyLight}>{s.life}</Text> : null}
      </View>

      {s.prayerTo ? (
        <View style={st.block}>
          <Text style={st.head}>A PRAYER TO {s.name.toUpperCase()}</Text>
          <Text style={st.prayer} {...kp(s.prayerTo, `Prayer to ${s.name}`)}>{s.prayerTo}</Text>
        </View>
      ) : null}
      {s.prayer ? (
        <View style={st.block}>
          <Text style={st.head}>{s.prayerSource?.startsWith('Collect') ? 'COLLECT OF THE DAY' : 'PRAYER'}</Text>
          <Text style={st.prayer} {...kp(s.prayer, s.prayerSource ? `${s.prayerSource} · ${s.name}` : `Prayer · ${s.name}`)}>{s.prayer}</Text>
          {s.prayerSource ? <Text style={st.src}>{s.prayerSource}</Text> : null}
        </View>
      ) : null}
      {s.penance || s.fast ? (
        <View style={st.block}>
          <Text style={st.head}>FAST AND PENANCE</Text>
          {s.penance ? <Text style={st.body}>{s.penance}</Text> : null}
          {s.fast ? <Text style={st.body}>{s.fast}</Text> : null}
        </View>
      ) : null}
      {s.meditation ? (
        <View style={st.block}>
          <Text style={st.head}>MEDITATION</Text>
          <Text style={[st.body, { fontFamily: F.bodyItalic }]} {...kp(s.meditation, `Meditation · ${s.name}`)}>{s.meditation}</Text>
        </View>
      ) : null}
      <Proto>Press and hold a prayer to keep it in My Wisdom. Tap the painting to see it full screen.</Proto>
    </View>
  );
}

const st = StyleSheet.create({
  paintWrap: { backgroundColor: C.ink, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, marginBottom: 0 },
  frame: { borderWidth: 3, borderColor: C.gold, padding: 4, backgroundColor: C.gold },
  credit: { fontFamily: F.bodyItalic, fontSize: 10.5, lineHeight: 14, color: '#B9A57F', marginTop: 6 },
  panel: { backgroundColor: C.ink, marginHorizontal: -20, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22, marginBottom: 18 },
  name: { fontFamily: F.display, fontSize: 30, lineHeight: 34, color: C.vellum },
  dates: { fontFamily: F.bodyItalic, fontSize: 13.5, color: '#C9B48A', marginTop: 2, marginBottom: 12 },
  bodyLight: { fontFamily: F.body, fontSize: 15.5, lineHeight: 25, color: '#EDE3CB', marginBottom: 10 },
  body: { fontFamily: F.body, fontSize: 15.5, lineHeight: 25, color: C.ink, marginBottom: 10 },
  block: { borderLeftWidth: 3, borderColor: C.gold, paddingLeft: 14, marginBottom: 18 },
  head: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1.4, color: C.rubric, marginBottom: 6 },
  prayer: { fontFamily: F.displayItalic, fontSize: 18.5, lineHeight: 27, color: C.ink },
  src: { fontFamily: F.bodyItalic, fontSize: 12.5, color: C.inkFaint, marginTop: 6 },
  none: { borderWidth: 1, borderColor: C.vellum3, padding: 18, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)' },
  noneTitle: { fontFamily: F.display, fontSize: 25, lineHeight: 30, color: C.ink, marginBottom: 6 },
  noneText: { fontFamily: F.body, fontSize: 15, lineHeight: 23, color: C.inkSoft },
  noneHint: { fontFamily: F.bodyItalic, fontSize: 13, lineHeight: 19, color: C.inkFaint, marginTop: 10 },
  back: { fontFamily: F.sc, fontSize: 14, letterSpacing: 1, color: C.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: C.vellum3 },
  d: { width: 56, fontFamily: F.sc, fontSize: 13, color: C.inkSoft },
  nm: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.ink },
  chev: { fontFamily: F.display, fontSize: 20, color: C.goldDeep },
  lightbox: { flex: 1, backgroundColor: '#0E0A08', paddingTop: 48, paddingBottom: 28 },
  lbTitle: { fontFamily: F.display, fontSize: 22, color: '#F5EDD6' },
  lbCredit: { fontFamily: F.bodyItalic, fontSize: 12.5, lineHeight: 18, color: '#B9A57F', marginTop: 4 },
  lbHint: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 1.4, color: '#7E6E55', marginTop: 10 },
});
