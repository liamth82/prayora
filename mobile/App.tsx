import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { useFonts, CormorantGaramond_400Regular, CormorantGaramond_500Medium, CormorantGaramond_500Medium_Italic } from '@expo-google-fonts/cormorant-garamond';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';

import { C, F } from './src/theme';
import { season } from './src/liturgy';
import { load, save, todayKey } from './src/storage';
import { Mode, MODES } from './src/content';
import { Dot } from './src/components/ui';
import { GearIcon, RefugeIcon, ThanksIcon, WisdomIcon } from './src/components/icons';
import Scripture from './src/screens/Scripture';
import Hours from './src/screens/Hours';
import Saints from './src/screens/Saints';
import Ask from './src/screens/Ask';
import Fast, { Veil } from './src/screens/Fast';
import Today from './src/screens/Today';
import Settings from './src/screens/Settings';
import { SettingsProvider } from './src/settings';
import { KeepProvider } from './src/keep';
import Wisdom from './src/screens/Wisdom';
import Refuge from './src/screens/Refuge';
import Gratitude from './src/screens/Gratitude';
import PrayerSession from './src/screens/PrayerSession';
import { Sheet } from './src/components/panels';
import { askPermission, bellsAvailable, bellsWork, DEFAULT_BELLS, onBellTap, saveBells, scheduleBells } from './src/bells';
import { bellPrayer } from './src/prayers';
import { unlock } from './src/lock';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Tab = 'today' | 'scripture' | 'hours' | 'saints' | 'ask' | 'fast';
const TABS: [Tab, string][] = [['today', 'Today'], ['scripture', 'Read'], ['hours', 'Hours'], ['saints', 'Saints'], ['ask', 'Ask'], ['fast', 'Fast']];

function TabIcon({ tab, color }: { tab: Tab; color: string }) {
  const p = { stroke: color, fill: 'none', strokeWidth: 1.4 };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {tab === 'today' && (<><Path {...p} d="M12 3v4M10 5h4" /><Path {...p} d="M6 21V11a6 6 0 0 1 12 0v10z" /><Path {...p} d="M10 21v-5a2 2 0 0 1 4 0v5" /></>)}
      {tab === 'scripture' && (<><Path {...p} d="M4 5c3-1 6-1 8 1v14c-2-2-5-2-8-1z" /><Path {...p} d="M20 5c-3-1-6-1-8 1v14c2-2 5-2 8-1z" /></>)}
      {tab === 'hours' && (<><Circle {...p} cx={12} cy={12} r={8} /><Path {...p} d="M12 7v5l3 2" /></>)}
      {tab === 'saints' && (<><Circle {...p} cx={12} cy={9} r={3.2} /><Ellipse {...p} cx={12} cy={4.6} rx={4.5} ry={1.4} /><Path {...p} d="M6 20c1-4 3-6 6-6s5 2 6 6" /></>)}
      {tab === 'ask' && (<><Path {...p} d="M5 5h14v10H10l-4 4v-4H5z" /><Path {...p} d="M10.3 8.6a1.9 1.9 0 1 1 2.4 1.9c-.5.2-.7.5-.7 1" /></>)}
      {tab === 'fast' && (<><Path {...p} d="M12 3v3M12 18v3M4.5 12h-1.5M21 12h-1.5" /><Path {...p} d="M12 12L7 8" /><Path {...p} d="M5 17a8 8 0 1 1 14 0" /></>)}
    </Svg>
  );
}

function Main() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('today');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [wisdomOpen, setWisdomOpen] = useState(false);
  const [refugeOpen, setRefugeOpen] = useState(false);
  const [thanksOpen, setThanksOpen] = useState(false);
  const [ringing, setRinging] = useState<string | null>(null);
  // The keyboard: lift the screen above it ourselves, because with edge-to-edge Android does not resize the window.
  const [kb, setKb] = useState(0);
  const rootRef = useRef<View>(null);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => {
      const top = e.endCoordinates.screenY;
      const fallback = e.endCoordinates.height;
      if (!rootRef.current || !top) { setKb(fallback); return; }
      // How much of our screen the keyboard covers: the bottom of our view, less the top of the keyboard.
      rootRef.current.measureInWindow((_x, y, _w, h) => setKb(Math.max(0, Math.min(fallback + 80, y + h - top))));
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const [offerBells, setOfferBells] = useState(false);
  const [lectioSecs, setLectioSecs] = useState(0);
  const prayerOverlayRef = useRef(false);
  const readingOverlayRef = useRef(false);
  const [secs, setSecs] = useState(0); // browsing
  const [prayerSecs, setPrayerSecs] = useState(0);
  const tabRef = useRef<Tab>('today');
  const overlayRef = useRef(false);
  const [fast, setFast] = useState<{ id: string; until: number; start?: number } | null>(null);
  const scroll = useRef<ScrollView>(null);
  const scrollTop = useCallback(() => scroll.current?.scrollTo({ y: 0, animated: false }), []);

  // Fetch any new version as soon as the app opens and restart into it.
  useEffect(() => {
    if (!Updates.isEnabled || __DEV__) return;
    (async () => {
      try {
        const r = await Updates.checkForUpdateAsync();
        if (r.isAvailable) { await Updates.fetchUpdateAsync(); await Updates.reloadAsync(); }
      } catch {}
    })();
  }, []);

  // Restore state
  useEffect(() => {
    load<Tab>('tab', 'today').then((t) => setTab(t));
    load<number>('browse:' + todayKey(), 0).then(setSecs);
    load<number>('prayer2:' + todayKey(), 0).then(setPrayerSecs);
    load<number>('lectio:' + todayKey(), 0).then(setLectioSecs);
    load<{ id: string; until: number; start?: number } | null>('fast', null).then((f) => { if (f && f.until > Date.now()) setFast(f); });
  }, []);

  // Bells: set the day's bells, open the prayer when one is tapped, and offer the Angelus once.
  useEffect(() => {
    if (!bellsAvailable) return;
    let stop = () => {};
    bellsWork().then((ok) => {
      if (!ok) return;
      scheduleBells().catch(() => {});
      stop = onBellTap((id) => setRinging(id));
      load<boolean>('bells:offered', false).then((done) => { if (!done) setTimeout(() => setOfferBells(true), 2500); });
    });
    return () => stop();
  }, []);
  const acceptBells = async () => {
    setOfferBells(false); save('bells:offered', true);
    try { if (await askPermission()) await saveBells({ ...DEFAULT_BELLS, on: true }); } catch {}
  };

  // Count time spent in Ora while it is in the foreground
  useEffect(() => {
    let active = AppState.currentState === 'active';
    const sub = AppState.addEventListener('change', (st) => { active = st === 'active'; });
    const t = setInterval(() => {
      if (!active) return;
      // Reading and prayer count as time in prayer; everything else is browsing, which the sundial measures.
      // Prayer: the Hours, Refuge and thanksgiving. Lectio (sacred reading): Today, Read, Saints and My Wisdom. Everything else is browsing.
      const praying = prayerOverlayRef.current || (!overlayRef.current && tabRef.current === 'hours');
      const reading = !praying && (readingOverlayRef.current || (!overlayRef.current && ['today', 'scripture', 'saints'].includes(tabRef.current)));
      const [setter, key] = praying ? [setPrayerSecs, 'prayer2:'] as const : reading ? [setLectioSecs, 'lectio:'] as const : [setSecs, 'browse:'] as const;
      setter((s) => {
        const n = s + 1;
        if (n % 5 === 0) save(key + todayKey(), n);
        return n;
      });
    }, 1000);
    return () => { clearInterval(t); sub.remove(); };
  }, []);

  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => { overlayRef.current = settingsOpen; }, [settingsOpen]);
  useEffect(() => { prayerOverlayRef.current = refugeOpen || thanksOpen || !!ringing; }, [refugeOpen, thanksOpen, ringing]);
  useEffect(() => { readingOverlayRef.current = wisdomOpen; }, [wisdomOpen]);
  const choose = (t: Tab) => { setTab(t); save('tab', t); scrollTop(); };

  const startFast = (m: Mode) => {
    let until: number;
    if (m.mins) until = Date.now() + m.mins * 60000;
    else { const d = new Date(); d.setHours(6, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); until = +d; }
    const f = { id: m.id, until, start: Date.now() };
    setFast(f); save('fast', f);
    scheduleBells(undefined, true).catch(() => {});
  };
  const endFast = useCallback(() => { setFast(null); save('fast', null); scheduleBells(undefined, false).catch(() => {}); }, []);

  const s = season();
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const activeMode = fast ? MODES.find((m) => m.id === fast.id) : null;

  return (
    <View style={[st.root, { paddingTop: insets.top }]} ref={rootRef}>
      <StatusBar style="light" />
      <View style={st.header}>
        <View style={st.headTop}>
          <Pressable onPress={() => setRefugeOpen(true)} hitSlop={10} style={st.corner} accessibilityRole="button" accessibilityLabel="Refuge, when temptation comes">
            <RefugeIcon color={C.goldDeep} />
            <Text style={st.cornerText}>REFUGE</Text>
          </Pressable>
          <Text style={st.wordmark}>Or<Text style={{ color: C.gold, fontFamily: F.displayItalic }}>a</Text></Text>
          <Pressable onPress={() => setThanksOpen(true)} hitSlop={10} style={st.corner} accessibilityRole="button" accessibilityLabel="Deo gratias, give thanks">
            <ThanksIcon color={C.goldDeep} />
            <Text style={st.cornerText}>THANKS</Text>
          </Pressable>
        </View>
        <View style={st.lit}>
          <Dot color={s.color} size={7} />
          <Text style={st.litText} numberOfLines={1}><Text style={st.date}>{date}</Text>{'  ·  '}{s.name}</Text>
          <Pressable onPress={async () => { if (await unlock('My Wisdom')) setWisdomOpen(true); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="My Wisdom"><WisdomIcon color={C.inkSoft} /></Pressable>
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Settings"><GearIcon color={C.inkSoft} /></Pressable>
        </View>
      </View>

      <View style={{ flex: 1, paddingBottom: kb }}>
        <ScrollView ref={scroll} contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false} scrollEnabled={tab !== 'ask'}>
          {tab === 'today' && <Today openHours={() => choose('hours')} openSaints={() => choose('saints')} />}
          {tab === 'scripture' && <Scripture />}
          {tab === 'hours' && <Hours />}
          {tab === 'saints' && <Saints />}
          {tab === 'ask' && <Ask />}
          {tab === 'fast' && <Fast minutes={Math.floor(secs / 60)} prayerMinutes={Math.floor(prayerSecs / 60)} lectioMinutes={Math.floor(lectioSecs / 60)} onStart={startFast} />}
        </ScrollView>
      </View>

      <View style={[st.tabs, { paddingBottom: Math.max(insets.bottom, 6) }, kb > 0 && { display: 'none' }]}>
        {TABS.map(([id, label]) => {
          const on = id === tab;
          return (
            <Pressable key={id} onPress={() => choose(id)} style={st.tab} accessibilityRole="tab" accessibilityState={{ selected: on }}>
              <TabIcon tab={id} color={on ? C.gold : C.inkFaint} />
              <Text style={[st.tabText, on && { color: C.ink }]}>{label.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      <Refuge visible={refugeOpen} onClose={() => setRefugeOpen(false)} />
      <Gratitude visible={thanksOpen} onClose={() => setThanksOpen(false)} />
      {wisdomOpen ? <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, bottom: 0 }}><Wisdom onClose={() => setWisdomOpen(false)} /></View> : null}
      {settingsOpen ? <View style={{ position: 'absolute', top: insets.top, left: 0, right: 0, bottom: 0 }}><Settings onClose={() => setSettingsOpen(false)} /></View> : null}
      {ringing && bellPrayer(ringing) ? (() => {
        const b = bellPrayer(ringing)!;
        return <PrayerSession visible title={b.title} subtitle={b.subtitle} lines={b.lines}
          onFinish={() => { if (b.hourId) { const k = 'prayed:' + todayKey(); load<string[]>(k, []).then((d) => save(k, d.includes(b.hourId!) ? d : [...d, b.hourId!])); } }}
          onClose={() => setRinging(null)} />;
      })() : null}
      <Sheet visible={offerBells} onClose={() => { setOfferBells(false); save('bells:offered', true); }} eyebrow="A gentle bell" title="Ring the Angelus?">
        <Text style={st.offerText}>For centuries, church bells have called Christians to pray the Angelus at six in the morning, at noon and at six in the evening. Ora can ring a soft bell at those times, and one tap takes you straight into the prayer.</Text>
        <Text style={st.offerFine}>No reminders if you miss it. Change the times, or switch it off, in Settings.</Text>
        <Pressable onPress={acceptBells} style={st.offerYes}><Text style={st.offerYesText}>Ring the Angelus</Text></Pressable>
        <Pressable onPress={() => { setOfferBells(false); save('bells:offered', true); }} style={st.offerNo}><Text style={st.offerNoText}>Not now</Text></Pressable>
      </Sheet>
      {fast && activeMode ? <Veil mode={activeMode} until={fast.until} start={fast.start} onEnd={endFast} onRefuge={() => setRefugeOpen(true)} onThanks={() => setThanksOpen(true)} /> : null}
    </View>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    CormorantGaramond_400Regular, CormorantGaramond_500Medium, CormorantGaramond_500Medium_Italic,
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
    Newsreader_400Regular, Newsreader_400Regular_Italic, Newsreader_500Medium, Newsreader_600SemiBold,
  });
  useEffect(() => { if (loaded || error) SplashScreen.hideAsync().catch(() => {}); }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <KeepProvider>
          <Main />
        </KeepProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.vellum },
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3 },
  headTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  corner: { width: 56, alignItems: 'center', gap: 3 },
  cornerText: { fontFamily: F.sc, fontSize: 7.5, letterSpacing: 1.2, color: C.inkFaint },
  wordmark: { fontFamily: F.display, fontSize: 36, lineHeight: 40, color: C.ink, letterSpacing: 0.5 },
  date: { fontFamily: F.sc, color: C.ink },
  lit: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  litText: { flex: 1, fontFamily: F.ui, fontSize: 11.5, color: C.inkSoft },
  screen: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3, backgroundColor: C.deep, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingBottom: 4 },
  offerText: { fontFamily: F.body, fontSize: 15.5, lineHeight: 24, color: C.ink },
  offerFine: { fontFamily: F.bodyItalic, fontSize: 13, color: C.inkSoft, marginTop: 10 },
  offerYes: { backgroundColor: C.ink, borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  offerYesText: { fontFamily: F.sc, fontSize: 14, color: C.deep },
  offerNo: { paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  offerNoText: { fontFamily: F.sc, fontSize: 13, color: C.inkSoft },
  tabText: { fontFamily: F.sc, fontSize: 9.5, letterSpacing: 1.1, color: C.inkFaint },
});
