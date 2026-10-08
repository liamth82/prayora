import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Mode, MODES } from '../content';
import { C, F } from '../theme';
import { Eyebrow, H2, H3, Lede, Proto, Rule, Sundial } from '../components/ui';

export default function Fast({ minutes, prayerMinutes, onStart, onRefuge }: { minutes: number; prayerMinutes: number; onStart: (m: Mode) => void; onRefuge: () => void }) {
  const msg = minutes < 10 ? 'A good visit. When you are finished, close the app.'
    : minutes < 30 ? 'Consider closing Ora and praying in silence.'
    : 'Put the phone down. God is not in here.';
  return (
    <View>
      <Eyebrow>Digital Fast</Eyebrow>
      <H2>Be still</H2>
      <Lede>Time spent praying and reading is never counted against you. The sundial measures only the rest; its shadow lengthens the longer you browse.</Lede>
      <View style={st.dial}>
        <Sundial mins={minutes} width={140} />
        <View style={{ flex: 1 }}>
          <Text style={st.mins}>{minutes}<Text style={st.minsSmall}> min browsing today</Text></Text>
          <Text style={st.prayer}>{prayerMinutes} min in prayer and reading</Text>
          <Text style={st.msg}>{msg}</Text>
        </View>
      </View>
      <Pressable onPress={onRefuge} style={st.refuge} accessibilityRole="button">
        <Text style={st.refugeSmall}>WHEN TEMPTATION COMES</Text>
        <Text style={st.refugeTitle}>Refuge</Text>
        <Text style={st.refugeSub}>Five minutes with God, whenever you need them</Text>
      </Pressable>
      <Rule />
      <Eyebrow>Begin a fast</Eyebrow>
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

type Sym = { name: string; caption: string; paths: string[]; fills?: string[]; circles?: number[][]; dots?: number[][] };
const SYMBOLS = require('../symbols.json') as Sym[];
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function SacredSymbol({ sym, size }: { sym: Sym; size: number }) {
  const ink = '#EFE6D2';
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G fill="none" stroke={ink} strokeOpacity={0.12} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        {sym.paths.map((d, i) => <Path key={'g' + i} d={d} />)}
        {(sym.circles ?? []).map(([cx, cy, r], i) => <Circle key={'gc' + i} cx={cx} cy={cy} r={r} />)}
      </G>
      <G fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        {sym.paths.map((d, i) => <Path key={i} d={d} />)}
        {(sym.circles ?? []).map(([cx, cy, r], i) => <Circle key={'c' + i} cx={cx} cy={cy} r={r} />)}
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
  const { width } = useWindowDimensions();
  const total = Math.max(60000, until - (start ?? (mode.mins ? until - mode.mins * 60000 : until - 8 * 3600000)));
  const [left, setLeft] = useState(until - Date.now());
  const [showTime, setShowTime] = useState(false);
  const [symIdx, setSymIdx] = useState(() => Math.floor(Math.random() * SYMBOLS.length));
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

  // Slow crossfade between the symbols, with a faint breathing glow.
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 2500, useNativeDriver: true }).start();
    const t = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 2500, useNativeDriver: true }).start(() => {
        setSymIdx((i) => (i + 1) % SYMBOLS.length);
        Animated.timing(fade, { toValue: 1, duration: 2500, useNativeDriver: true }).start();
      });
    }, SYMBOL_SECS * 1000);
    const b = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    b.start();
    return () => { clearInterval(t); b.stop(); };
  }, [fade, breathe]);

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
  mins: { fontFamily: F.display, fontSize: 40, color: C.ink },
  minsSmall: { fontFamily: F.body, fontSize: 14, color: C.inkSoft },
  prayer: { fontFamily: F.bodyItalic, fontSize: 14, color: C.green, marginTop: 2 },
  refuge: { backgroundColor: '#07060A', borderRadius: 4, padding: 18, marginTop: 18, borderWidth: 1, borderColor: C.gold },
  refugeSmall: { fontFamily: F.sc, fontSize: 12, letterSpacing: 2, color: C.gold },
  refugeTitle: { fontFamily: F.display, fontSize: 30, color: '#EFE6D2', marginTop: 2 },
  refugeSub: { fontFamily: F.bodyItalic, fontSize: 13.5, color: '#A8946C', marginTop: 2 },
  msg: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  mode: { borderWidth: 1, borderColor: C.vellum3, borderRadius: 4, padding: 14 },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  len: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1, color: C.rubric },
  modeD: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#050407', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, zIndex: 10 },
  corner: { position: 'absolute', top: 52, right: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  left: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1.4, color: '#A8946C' },
  holdRing: { position: 'absolute', top: 2, left: 2, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#C9A84C' },
  caption: { fontFamily: F.displayItalic, fontSize: 15, color: '#8C7B5C', marginTop: 16, letterSpacing: 0.4 },
  foot: { position: 'absolute', bottom: 40, alignItems: 'center', gap: 4 },
  hint: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 1.6, color: '#4F4636' },
  modeN: { fontFamily: F.sc, letterSpacing: 3, color: C.gold, fontSize: 14 },
  clock: { fontFamily: F.display, fontSize: 64, color: C.vellum, fontVariant: ['tabular-nums'] },
  quote: { fontFamily: F.displayItalic, fontSize: 23, lineHeight: 31, color: '#EFE6D2', textAlign: 'center' },
  cite: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.5, color: '#B9A57F', marginTop: 6 },
  allowed: { fontFamily: F.body, fontSize: 12.5, color: '#6E6250', textAlign: 'center' },
  hold: { borderWidth: 1, borderColor: '#6d5640', borderRadius: 3, paddingVertical: 12, paddingHorizontal: 22, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(201,168,76,0.35)' },
  holdText: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1.5, color: '#D8C9A6' },
});
