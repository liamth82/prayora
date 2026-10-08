import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Mode, MODES } from '../content';
import { C, F } from '../theme';
import { Eyebrow, H2, H3, Lede, Proto, Rule, Sundial } from '../components/ui';

export default function Fast({ minutes, prayerMinutes, onStart }: { minutes: number; prayerMinutes: number; onStart: (m: Mode) => void }) {
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

type Sym = { name: string; caption: string; paths: string[]; circles?: number[][]; dots?: number[][] };
const SYMBOLS = require('../symbols.json') as Sym[];

function SacredSymbol({ sym, size }: { sym: Sym; size: number }) {
  const ink = '#EFE6D2';
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <G fill="none" stroke={ink} strokeOpacity={0.12} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        {sym.paths.map((d, i) => <Path key={'g' + i} d={d} />)}
        {(sym.circles ?? []).map(([cx, cy, r], i) => <Circle key={'gc' + i} cx={cx} cy={cy} r={r} />)}
      </G>
      <G fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        {sym.paths.map((d, i) => <Path key={i} d={d} />)}
        {(sym.circles ?? []).map(([cx, cy, r], i) => <Circle key={'c' + i} cx={cx} cy={cy} r={r} />)}
        {(sym.dots ?? []).map(([cx, cy, r], i) => <Circle key={'d' + i} cx={cx} cy={cy} r={r} fill={ink} />)}
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
  const R = 16, CIRC = 2 * Math.PI * R;

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
  const size = Math.min(width - 80, 280);
  const glow = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

  return (
    <View style={st.veil}>
      <View style={st.corner}>
        {showTime ? <Text style={st.left}>{remaining}</Text> : null}
        <Pressable onPress={tap} onPressIn={pressIn} onPressOut={pressOut} hitSlop={16} accessibilityRole="button"
          accessibilityLabel={`${remaining}. Hold for three seconds to end the fast early`}>
          <Svg width={44} height={44} viewBox="0 0 44 44">
            <Circle cx={22} cy={22} r={R} stroke="#FFFFFF" strokeOpacity={0.14} strokeWidth={2} fill="none" />
            <Circle cx={22} cy={22} r={R} stroke="#E9DFC8" strokeWidth={2} fill="none" strokeLinecap="round"
              strokeDasharray={`${CIRC} ${CIRC}`} strokeDashoffset={CIRC * (1 - frac)} transform="rotate(-90 22 22)" />
          </Svg>
          <Animated.View style={[st.holdRing, { opacity: hold, transform: [{ scale: hold.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.25] }) }] }]} />
        </Pressable>
      </View>

      <Animated.View style={{ opacity: Animated.multiply(fade, glow), alignItems: 'center' }}>
        <SacredSymbol sym={sym} size={size} />
        <Text style={st.caption}>{sym.caption}</Text>
      </Animated.View>

      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <Text style={st.quote}>{quote}</Text>
        <Text style={st.cite}>{cite.toUpperCase()}</Text>
      </View>

      <View style={st.foot}>
        <Text style={st.allowed}>{mode.name} · {mode.allow}</Text>
        <Text style={st.hint}>Hold the circle to end early</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  dial: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mins: { fontFamily: F.display, fontSize: 40, color: C.ink },
  minsSmall: { fontFamily: F.body, fontSize: 14, color: C.inkSoft },
  prayer: { fontFamily: F.bodyItalic, fontSize: 14, color: C.green, marginTop: 2 },
  msg: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  mode: { borderWidth: 1, borderColor: C.vellum3, borderRadius: 4, padding: 14 },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  len: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1, color: C.rubric },
  modeD: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  veil: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#050407', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, zIndex: 10 },
  corner: { position: 'absolute', top: 52, right: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  left: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1.4, color: '#A8946C' },
  holdRing: { position: 'absolute', top: 2, left: 2, width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#C9A84C' },
  caption: { fontFamily: F.displayItalic, fontSize: 15, color: '#8C7B5C', marginTop: 14, letterSpacing: 0.4 },
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
