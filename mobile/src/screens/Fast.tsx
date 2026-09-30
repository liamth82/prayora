import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Mode, MODES } from '../content';
import { C, F } from '../theme';
import { Eyebrow, H2, H3, Lede, Proto, Rule, Sundial } from '../components/ui';

export default function Fast({ minutes, onStart }: { minutes: number; onStart: (m: Mode) => void }) {
  const msg = minutes < 10 ? 'A good visit. When you are finished, close the app.'
    : minutes < 30 ? 'Consider closing Ora and praying in silence.'
    : 'Put the phone down. God is not in here.';
  return (
    <View>
      <Eyebrow>Digital Fast</Eyebrow>
      <H2>Be still</H2>
      <Lede>Ora keeps its own time against you. The shadow lengthens the longer you stay.</Lede>
      <View style={st.dial}>
        <Sundial mins={minutes} width={140} />
        <View style={{ flex: 1 }}>
          <Text style={st.mins}>{minutes}<Text style={st.minsSmall}> min in Ora today</Text></Text>
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

export function Veil({ mode, until, onEnd }: { mode: Mode; until: number; onEnd: () => void }) {
  const [left, setLeft] = useState(until - Date.now());
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      const ms = until - Date.now();
      if (ms <= 0) { clearInterval(t); onEnd(); } else setLeft(ms);
    }, 1000);
    return () => clearInterval(t);
  }, [until, onEnd]);

  const h = Math.floor(left / 3600000), mi = Math.floor((left % 3600000) / 60000), se = Math.floor((left % 60000) / 1000);
  const clock = (h ? h + ':' : '') + String(mi).padStart(h ? 2 : 1, '0') + ':' + String(se).padStart(2, '0');

  const pressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    anim.current = Animated.timing(progress, { toValue: 1, duration: 3000, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        onEnd();
      }
    });
  };
  const pressOut = () => {
    anim.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  return (
    <View style={st.veil}>
      <Text style={st.modeN}>{mode.name.toUpperCase()} · IN PROGRESS</Text>
      <Text style={st.clock}>{clock}</Text>
      <View style={{ alignItems: 'center' }}>
        <Text style={st.quote}>Be still and see that I am God.</Text>
        <Text style={st.cite}>PSALM 45:11</Text>
      </View>
      <Text style={st.allowed}>{mode.allow}</Text>
      <Pressable onPressIn={pressIn} onPressOut={pressOut} style={st.hold} accessibilityRole="button" accessibilityLabel="Hold for three seconds to end the fast early">
        <Animated.View style={[st.holdFill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
        <Text style={st.holdText}>HOLD TO END EARLY</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  dial: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mins: { fontFamily: F.display, fontSize: 40, color: C.ink },
  minsSmall: { fontFamily: F.body, fontSize: 14, color: C.inkSoft },
  msg: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  mode: { borderWidth: 1, borderColor: C.vellum3, borderRadius: 4, padding: 14 },
  modeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  len: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1, color: C.rubric },
  modeD: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.inkSoft, marginTop: 4 },
  veil: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 22, zIndex: 10 },
  modeN: { fontFamily: F.sc, letterSpacing: 3, color: C.gold, fontSize: 14 },
  clock: { fontFamily: F.display, fontSize: 64, color: C.vellum, fontVariant: ['tabular-nums'] },
  quote: { fontFamily: F.displayItalic, fontSize: 22, lineHeight: 30, color: C.vellum, textAlign: 'center' },
  cite: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1.5, color: '#B9A57F', marginTop: 6 },
  allowed: { fontFamily: F.body, fontSize: 13, color: '#B9A57F', textAlign: 'center' },
  hold: { borderWidth: 1, borderColor: '#6d5640', borderRadius: 3, paddingVertical: 12, paddingHorizontal: 22, overflow: 'hidden' },
  holdFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(201,168,76,0.35)' },
  holdText: { fontFamily: F.sc, fontSize: 13, letterSpacing: 1.5, color: '#D8C9A6' },
});
