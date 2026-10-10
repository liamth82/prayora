import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  useEffect(() => { prayerOverlayRef.current = refugeOpen || thanksOpen; }, [refugeOpen, thanksOpen]);
  useEffect(() => { readingOverlayRef.current = wisdomOpen; }, [wisdomOpen]);
  const choose = (t: Tab) => { setTab(t); save('tab', t); scrollTop(); };

  const startFast = (m: Mode) => {
    let until: number;
    if (m.mins) until = Date.now() + m.mins * 60000;
    else { const d = new Date(); d.setHours(6, 0, 0, 0); if (d <= new Date()) d.setDate(d.getDate() + 1); until = +d; }
    const f = { id: m.id, until, start: Date.now() };
    setFast(f); save('fast', f);
  };
  const endFast = useCallback(() => { setFast(null); save('fast', null); }, []);

  const s = season();
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const activeMode = fast ? MODES.find((m) => m.id === fast.id) : null;

  return (
    <View style={[st.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={st.header}>
        <Text style={st.wordmark}>Or<Text style={{ color: C.gold, fontFamily: F.displayItalic }}>a</Text></Text>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, flexShrink: 1 }}>
          <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
            <Text style={st.date}>{date}</Text>
            <View style={st.lit}><Dot color={s.color} /><Text style={st.litText}>{s.name}</Text></View>
          </View>
          <Pressable onPress={() => setRefugeOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Refuge, when temptation comes" style={{ paddingBottom: 2 }}>
            <Svg width={20} height={22} viewBox="0 0 20 24"><Path d="M10 1.5 L18 4.5 V11 C18 16.5 14.5 20.5 10 22.5 C5.5 20.5 2 16.5 2 11 V4.5 Z" stroke={C.inkSoft} strokeWidth={1.5} fill="none" /><Path d="M10 6.5 V17 M6.5 10 H13.5" stroke={C.inkSoft} strokeWidth={1.5} /></Svg>
          </Pressable>
          <Pressable onPress={() => setWisdomOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="My Wisdom" style={{ paddingBottom: 2 }}>
            <Svg width={20} height={22} viewBox="0 0 20 24"><Path d="M3 2h14v20l-7-5-7 5z" stroke={C.inkSoft} strokeWidth={1.5} fill="none" /></Svg>
          </Pressable>
          <Pressable onPress={() => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Settings" style={{ paddingBottom: 2 }}>
            <Svg width={22} height={22} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={3} stroke={C.inkSoft} strokeWidth={1.5} fill="none" /><Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke={C.inkSoft} strokeWidth={1.5} /></Svg>
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={st.screen} keyboardShouldPersistTaps="handled">
          {tab === 'today' && <Today openHours={() => choose('hours')} onThanks={() => setThanksOpen(true)} onRefuge={() => setRefugeOpen(true)} />}
          {tab === 'scripture' && <Scripture scrollTop={scrollTop} />}
          {tab === 'hours' && <Hours scrollTop={scrollTop} />}
          {tab === 'saints' && <Saints scrollTop={scrollTop} />}
          {tab === 'ask' && <Ask />}
          {tab === 'fast' && <Fast minutes={Math.floor(secs / 60)} prayerMinutes={Math.floor(prayerSecs / 60)} lectioMinutes={Math.floor(lectioSecs / 60)} onStart={startFast} onRefuge={() => setRefugeOpen(true)} onThanks={() => setThanksOpen(true)} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[st.tabs, { paddingBottom: Math.max(insets.bottom, 6) }]}>
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
      {fast && activeMode ? <Veil mode={activeMode} until={fast.until} start={fast.start} onEnd={endFast} /> : null}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3 },
  wordmark: { fontFamily: F.display, fontSize: 36, lineHeight: 40, color: C.ink, letterSpacing: 0.5 },
  date: { fontFamily: F.sc, fontSize: 12.5, color: C.ink, letterSpacing: 0.2 },
  lit: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  litText: { fontFamily: F.ui, fontSize: 11.5, color: C.inkSoft },
  screen: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 32 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: C.vellum3, backgroundColor: C.deep, paddingTop: 10 },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingBottom: 4 },
  tabText: { fontFamily: F.sc, fontSize: 9.5, letterSpacing: 1.1, color: C.inkFaint },
});
