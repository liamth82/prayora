import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Mode, MODES } from '../content';
import { C, F } from '../theme';
import { Eyebrow, H2, H3, Lede, Proto, Rule, Sundial } from '../components/ui';
import { load, save } from '../storage';
import { artForDay, DayArt, getArtLibrary, getArtManifest, libArt } from '../today';

export type FastView = 'symbol' | 'art';

export default function Fast({ minutes, prayerMinutes, lectioMinutes, onStart, onRefuge, onThanks }: { minutes: number; prayerMinutes: number; lectioMinutes: number; onStart: (m: Mode) => void; onRefuge: () => void; onThanks: () => void }) {
  const [view, setView] = useState<FastView>('symbol');
  useEffect(() => { load<FastView>('fast:view', 'symbol').then(setView); }, []);
  const pick = (v: FastView) => { setView(v); save('fast:view', v); };
  const msg = minutes < 10 ? 'A good visit. When you are finished, close the app.'
    : minutes < 30 ? 'Consider closing Ora and praying in silence.'
    : 'Put the phone down. God is not in here.';
  return (
    <View>
      <Eyebrow>Digital Fast</Eyebrow>
      <H2>Be still</H2>
      <Lede>Time in prayer and in lectio, the slow, prayerful reading of Scripture and the saints, is never counted against you. The sundial measures only the rest; its shadow lengthens the longer you browse.</Lede>
      <View style={st.dial}>
        <Sundial mins={minutes} width={140} />
        <View style={{ flex: 1 }}>
          <Text style={st.mins}>{minutes}<Text style={st.minsSmall}> min browsing today</Text></Text>
          <Text style={st.prayer}>{prayerMinutes} min in prayer</Text>
          <Text style={st.prayer}>{lectioMinutes} min in lectio, sacred reading</Text>
          <Text style={st.msg}>{msg}</Text>
        </View>
      </View>
      <Pressable onPress={onRefuge} style={st.refuge} accessibilityRole="button">
        <Text style={st.refugeSmall}>WHEN TEMPTATION COMES</Text>
        <Text style={st.refugeTitle}>Refuge</Text>
        <Text style={st.refugeSub}>Five minutes with God, whenever you need them</Text>
      </Pressable>
      <Pressable onPress={onThanks} style={[st.refuge, { marginTop: 10 }]} accessibilityRole="button">
        <Text style={st.refugeSmall}>WHEN SOMETHING GOOD HAPPENS</Text>
        <Text style={st.refugeTitle}>Deo gratias</Text>
        <Text style={st.refugeSub}>Give thanks, and remember it</Text>
      </Pressable>
      <Rule />
      <Eyebrow>Begin a fast</Eyebrow>
      <Text style={st.viewLabel}>While you fast, show</Text>
      <View style={st.seg}>
        {([['symbol', 'A sacred symbol'], ['art', 'Sacred art']] as [FastView, string][]).map(([v, label]) => (
          <Pressable key={v} onPress={() => pick(v)} style={[st.segBtn, view === v && st.segOn]} accessibilityRole="radio" accessibilityState={{ selected: view === v }}>
            <Text style={[st.segText, view === v && { color: C.deep }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 10 }}>
        {MODES.map((m) => (
          <Pressable key={m.id} onPress={() => onStart(m)} style={({ pressed }) => [st.mode, pressed && { borderColor: C.gold }]}>
            <View style={st.modeTop}><H3>{m.name}</H3><Text style={st.len}>{m.len}</Text></View>
            <Text style={st.modeD}>{m.d}</Text>
          </Pressable>
        ))}
      </View>
      <Proto>In this preview the fast covers Ora's own screen. The real lock on other apps comes with the standalone build: as the home screen on Android, and through Screen Time on iPhone.</Proto>
    </View>
  );
}

type Sym = { name: string; caption: string; paths: string[]; fine?: string[]; circles?: number[][]; fineCircles?: number[][]; fills?: string[]; dots?: number[][] };
const SYMBOLS = require('../symbols.json') as Sym[];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Gothic line drawings: a firm contour with a hairline just inside it, as an engraver would cut them. */
function SacredSymbol({ sym, size }: { sym: Sym; size: number }) {
  const ink = '#EEE7DA';
  const k = 200 / size; // keep the hairlines crisp whatever size the symbol is drawn at
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G fill="none" stroke={ink} strokeOpacity={0.07} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round">
        {sym.paths.map((d, i) => <Path key={'g' + i} d={d} />)}
        {(sym.circles ?? []).map(([cx, cy, r], i) => <Circle key={'gc' + i} cx={cx} cy={cy} r={r} />)}
      </G>
      <G fill="none" stroke={ink} strokeWidth={Math.max(1.05, 1.5 * k)} strokeLinecap="round" strokeLinejoin="round">
        {sym.paths.map((d, i) => <Path key={i} d={d} />)}
        {(sym.circles ?? []).map(([cx, cy, r], i) => <Circle key={'c' + i} cx={cx} cy={cy} r={r} />)}
      </G>
      <G fill="none" stroke={ink} strokeOpacity={0.72} strokeWidth={Math.max(0.5, 0.75 * k)} strokeLinecap="round" strokeLinejoin="round">
        {(sym.fine ?? []).map((d, i) => <Path key={'h' + i} d={d} />)}
        {(sym.fineCircles ?? []).map(([cx, cy, r], i) => <Circle key={'hc' + i} cx={cx} cy={cy} r={r} />)}
      </G>
      <G fill={ink} stroke="none">
        {(sym.fills ?? []).map((d, i) => <Path key={'f' + i} d={d} />)}
        {(sym.dots ?? []).map(([cx, cy, r], i) => <Circle key={'d' + i} cx={cx} cy={cy} r={r} />)}
      </G>
    </Svg>
  );
}

const QUOTES: [string, string][] = [
  ['Be still and see that I am God.', 'Psalm 45:11'],
];
const SYMBOL_SECS = 40;

export function Veil({ mode, until, start, onEnd }: { mode: Mode; until: number; start?: number; onEnd: () => void }) {
  const { width, height } = useWindowDimensions();
  const total = Math.max(60000, until - (start ?? (mode.mins ? until - mode.mins * 60000 : until - 8 * 3600000)));
  const [left, setLeft] = useState(until - Date.now());
  const [showTime, setShowTime] = useState(false);
  const [symIdx, setSymIdx] = useState(() => Math.floor(Math.random() * SYMBOLS.length));
  const [view, setView] = useState<FastView | null>(null);
  const [art, setArt] = useState<DayArt[]>([]);
  const [artIdx, setArtIdx] = useState(0);
  const [artReady, setArtReady] = useState(false);
  useEffect(() => {
    load<FastView>('fast:view', 'symbol').then(setView);
    Promise.all([getArtLibrary(), getArtManifest()]).then(([lib, m]) => {
      const items: DayArt[] = lib.map(libArt);
      if (!items.length) Object.keys(m).forEach((k) => { const a = artForDay(k, new Date(), [], m); if (a && !items.some((x) => x.uri === a.uri)) items.push(a); });
      for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
      setArt(items);
    }).finally(() => setArtReady(true));
  }, []);
  const fade = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const hold = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const held = useRef(false);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = until - Date.now();
      if (ms <= 0) { clearInterval(t); onEnd(); } else setLeft(ms);
    }, 1000);
    return () => clearInterval(t);
  }, [until, onEnd]);

  // Slow crossfade between the symbols, with a faint breathing glow. Starts once we know what to show,
  // so the animated values are attached to the views they drive.
  const ready = view === 'symbol' || (view === 'art' && artReady);
  useEffect(() => {
    if (!ready) return;
    Animated.timing(fade, { toValue: 1, duration: 2500, useNativeDriver: true }).start();
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 2500, useNativeDriver: true }).start(() => {
        setSymIdx((i) => (i + 1) % SYMBOLS.length);
        setArtIdx((i) => i + 1);
        Animated.timing(fade, { toValue: 1, duration: 2500, useNativeDriver: true }).start();
      });
    }, SYMBOL_SECS * 1000);
    const b = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    b.start();
    return () => { clearInterval(t); b.stop(); };
  }, [fade, breathe, ready]);

  const h = Math.floor(left / 3600000), mi = Math.floor((left % 3600000) / 60000);
  const remaining = h ? `${h} h ${mi} min left` : `${Math.max(1, mi)} min left`;
  const frac = Math.min(1, Math.max(0, 1 - left / total));


  const pressIn = () => {
    held.current = false;
    anim.current = Animated.timing(hold, { toValue: 1, duration: 3000, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        held.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onEnd();
      }
    });
    setTimeout(() => { if (anim.current) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); }, 400);
  };
  const pressOut = () => {
    anim.current?.stop(); anim.current = null;
    Animated.timing(hold, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };
  const tap = () => { setShowTime(true); setTimeout(() => setShowTime(false), 3000); };

  const sym = SYMBOLS[symIdx];
  const [quote, cite] = QUOTES[0];
  const size = Math.min(width - 110, 260);
  const ring = size + 44;
  const RR = ring / 2 - 3, CIRC = 2 * Math.PI * RR;
  const glow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

  if (!ready) return <View style={st.veil} />;
  if (view === 'art' && art.length) {
    const item = art[artIdx % art.length];
    const ratio = item.ratio || 0.75;
    const maxH = height * 0.58, maxW = width - 40;
    const w = Math.min(maxW, maxH * ratio), hgt = w / ratio;
    return (
      <View style={st.veil}>
        <Pressable onPress={tap} onPressIn={pressIn} onPressOut={pressOut} style={{ alignItems: 'center' }}
          accessibilityRole="button" accessibilityLabel={`${item.title}. ${remaining}. Hold the painting for three seconds to end the fast early`}>
          <Animated.View style={{ opacity: Animated.multiply(fade, glow) }}>
            <Image source={{ uri: item.uri }} style={{ width: w, height: hgt, borderRadius: 2 }} resizeMode="cover" />
          </Animated.View>
          <View style={[st.artTrack, { width: w }]}>
            <View style={[st.artFill, { width: `${frac * 100}%` }]} />
            <Animated.View style={[st.artHold, { width: hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <Animated.Text style={[st.artCaption, { opacity: fade, width: w }]} numberOfLines={2}>
            {showTime ? remaining : item.title}
          </Animated.Text>
        </Pressable>
        <View style={{ alignItems: 'center', marginTop: 26 }}>
          <Text style={[st.quote, { fontSize: 22, lineHeight: 29 }]}>{quote}</Text>
          <Text style={st.cite}>{cite.toUpperCase()}</Text>
        </View>
        <View style={st.foot}>
          <Text style={st.allowed}>{mode.name} · {mode.allow}</Text>
          <Text style={st.hint}>Hold the painting to end early · tap to see the time</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={st.veil}>
      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={tap} onPressIn={pressIn} onPressOut={pressOut} style={{ width: ring, height: ring, alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button" accessibilityLabel={`${remaining}. Hold the symbol for three seconds to end the fast early`}>
          <Svg width={ring} height={ring} style={StyleSheet.absoluteFill}>
            <Circle cx={ring / 2} cy={ring / 2} r={RR} stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={1.2} fill="none" />
            <Circle cx={ring / 2} cy={ring / 2} r={RR} stroke="#E9DFC8" strokeOpacity={0.38} strokeWidth={1.2} fill="none" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - frac)} transform={`rotate(-90 ${ring / 2} ${ring / 2})`} />
            <AnimatedCircle cx={ring / 2} cy={ring / 2} r={RR} stroke="#C9A84C" strokeWidth={2.4} fill="none" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={hold.interpolate({ inputRange: [0, 1], outputRange: [CIRC, 0] })}
              transform={`rotate(-90 ${ring / 2} ${ring / 2})`} />
          </Svg>
          <Animated.View style={{ opacity: Animated.multiply(fade, glow) }}>
            <SacredSymbol sym={sym} size={size} />
          </Animated.View>
        </Pressable>
        <Animated.Text style={[st.caption, { opacity: fade }]}>{showTime ? remaining : sym.caption}</Animated.Text>
      </View>

      <View style={{ alignItems: 'center', marginTop: 34 }}>
        <Text style={st.quote}>{quote}</Text>
        <Text style={st.cite}>{cite.toUpperCase()}</Text>
      </View>

      <View style={st.foot}>
        <Text style={st.allowed}>{mode.name} · {mode.allow}</Text>
        <Text style={st.hint}>Hold the symbol to end early · tap to see the time</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dial: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mins: { fontFamily: F.display, fontSize: 44, color: C.ink },
  minsSmall: { fontFamily: F.body, fontSize: 14, color: C.inkSoft },
  prayer: { fontFamily: F.bodyItalic, fontSize: 14, color: C.green, marginTop: 2 },
  refuge: { backgroundColor: '#241F29', borderRadius: 16, padding: 18, marginTop: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(196,168,112,0.45)' },
  refugeSmall: { fontFamily: F.sc, fontSize: 10, letterSpacing: 2, color: C.gold },
  refugeTitle: { fontFamily: F.display, fontSize: 33, color: '#EEE7DA', marginTop: 2 },
  refugeSub: { fontFamily: F.bodyItalic, fontSize: 13.5, color: '#B4A890', marginTop: 2 },
  msg: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  mode: { borderWidth: 1, borderColor: C.vellum3, borderRadius: 12, padding: 14 },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  len: { fontFamily: F.sc, fontSize: 11, letterSpacing: 1, color: C.rubric },
  modeD: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0F0E13', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, zIndex: 10 },
  corner: { position: 'absolute', top: 52, right: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  left: { fontFamily: F.sc, fontSize: 11, letterSpacing: 1.4, color: '#B4A890' },
  holdRing: { position: 'absolute', top: 2, left: 2, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#C4A870' },
  caption: { fontFamily: F.displayItalic, fontSize: 16.5, color: '#8A8290', marginTop: 16, letterSpacing: 0.4 },
  foot: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 4 },
  viewLabel: { fontFamily: F.ui, fontSize: 13, color: C.inkSoft, marginBottom: 8 },
  seg: { flexDirection: 'row', backgroundColor: C.vellum2, borderRadius: 999, padding: 4, marginBottom: 16 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: 'center' },
  segOn: { backgroundColor: C.ink },
  segText: { fontFamily: F.sc, fontSize: 13, color: C.inkSoft },
  artTrack: { height: 2, backgroundColor: 'rgba(255,255,255,0.08)', marginTop: 14, overflow: 'hidden', borderRadius: 1 },
  artFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(233,223,200,0.45)' },
  artHold: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#C4A870' },
  artCaption: { fontFamily: F.bodyItalic, fontSize: 13, lineHeight: 18, color: '#8A8290', marginTop: 10, textAlign: 'center' },
  hint: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.6, color: '#4A4552' },
  modeN: { fontFamily: F.sc, letterSpacing: 3, color: C.gold, fontSize: 14 },
  clock: { fontFamily: F.display, fontSize: 70.5, color: C.ink, fontVariant: ['tabular-nums'] },
  quote: { fontFamily: F.displayItalic, fontSize: 25.5, lineHeight: 33.5, color: '#EEE7DA', textAlign: 'center' },
  cite: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.5, color: '#B4A890', marginTop: 6 },
  allowed: { fontFamily: F.body, fontSize: 12.5, color: '#6E6876', textAlign: 'center' },
  hold: { borderWidth: 1, borderColor: '#4A4450', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 22, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(196,168,112,0.35)' },
  holdText: { fontFamily: F.sc, fontSize: 11, letterSpacing: 1.5, color: '#D6CEC0' },
});
