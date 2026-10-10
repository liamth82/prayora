import React, { useId } from 'react';
import { Pressable, StyleSheet, Text, TextProps, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Pattern, Polygon, Rect, Text as SvgText } from 'react-native-svg';
import type { Book } from '../content';
import { C, F } from '../theme';

export const Eyebrow = (p: TextProps) => <Text {...p} style={[s.eyebrow, p.style]} />;
export const H2 = (p: TextProps) => <Text {...p} style={[s.h2, p.style]} />;
export const H3 = (p: TextProps) => <Text {...p} style={[s.h3, p.style]} />;
export const Lede = (p: TextProps) => <Text {...p} style={[s.lede, p.style]} />;
export const Body = (p: TextProps) => <Text {...p} style={[s.body, p.style]} />;
export const Proto = (p: TextProps) => <Text {...p} style={[s.proto, p.style]} />;

export function Rule() {
  return (
    <View style={s.rule}>
      <View style={s.ruleLine} />
      <Text style={s.ruleMark}>✠</Text>
      <View style={s.ruleLine} />
    </View>
  );
}

export function Back({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={{ marginBottom: 14, alignSelf: 'flex-start' }}>
      <Text style={s.back}>‹ {label}</Text>
    </Pressable>
  );
}

export function Button({ label, onPress, variant = 'ink', style }: { label: string; onPress: () => void; variant?: 'ink' | 'ghost' | 'gold'; style?: ViewStyle }) {
  const v = variant === 'ink' ? s.btnInk : variant === 'gold' ? s.btnGold : s.btnGhost;
  const t = variant === 'ghost' ? { color: C.ink } : { color: C.deep };
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.btn, v, pressed && { opacity: 0.8 }, style]}>
      <Text style={[s.btnText, t]}>{label}</Text>
    </Pressable>
  );
}

export function Dot({ color, size = 9 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(0,0,0,0.2)' }} />;
}

function Emblem({ type }: { type: Book['emblem'] }) {
  const g = C.gold;
  if (type === 'sun') {
    return (
      <G>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * Math.PI) / 6;
          return <Line key={i} x1={Math.cos(a) * 10} y1={Math.sin(a) * 10} x2={Math.cos(a) * 16} y2={Math.sin(a) * 16} stroke={g} strokeWidth={2} />;
        })}
        <Circle r={7} fill={g} />
      </G>
    );
  }
  if (type === 'star') {
    const pts = Array.from({ length: 16 }, (_, i) => {
      const a = (i * Math.PI) / 8 - Math.PI / 2, r = i % 2 ? 7 : 16;
      return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
    }).join(' ');
    return <Polygon points={pts} fill={g} />;
  }
  if (type === 'harp') {
    return (
      <G>
        <Path d="M-10 15 L-10 -15 Q 12 -12 12 15 Z" fill="none" stroke={g} strokeWidth={2.5} />
        <Line x1={-5} y1={-11} x2={-5} y2={15} stroke={g} strokeWidth={1.2} />
        <Line x1={0} y1={-9} x2={0} y2={15} stroke={g} strokeWidth={1.2} />
        <Line x1={5} y1={-5} x2={5} y2={15} stroke={g} strokeWidth={1.2} />
      </G>
    );
  }
  if (type === 'lily') {
    return (
      <G>
        <Ellipse cx={0} cy={-6} rx={4.5} ry={10} fill={g} />
        <Ellipse cx={-8} cy={0} rx={4} ry={9} rotation={-35} origin="-8, 0" fill={g} />
        <Ellipse cx={8} cy={0} rx={4} ry={9} rotation={35} origin="8, 0" fill={g} />
        <Rect x={-10} y={7} width={20} height={3} fill={g} />
        <Line x1={0} y1={10} x2={0} y2={17} stroke={g} strokeWidth={2} />
      </G>
    );
  }
  return <Path d="M-3 -16h6v10h10v6h-10v16h-6v-16h-10v-6h10z" fill={g} />;
}

export function Illumination({ book, width }: { book: Book; width: number }) {
  const id = 'dp' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = C.gold;
  return (
    <Svg width={width} height={(width * 250) / 200} viewBox="0 0 200 250" accessibilityLabel={`Illuminated initial ${book.initial} for ${book.name}`}>
      <Defs>
        <Pattern id={id} width={14} height={14} patternUnits="userSpaceOnUse">
          <Circle cx={7} cy={7} r={1.3} fill={g} opacity={0.55} />
        </Pattern>
      </Defs>
      <Rect x={2} y={2} width={196} height={246} rx={3} fill={g} />
      <Rect x={8} y={8} width={184} height={234} fill={book.color} />
      <Rect x={8} y={8} width={184} height={234} fill={`url(#${id})`} />
      <Path d="M22 22 C 40 30, 30 50, 22 60 M178 22 C 160 30, 170 50, 178 60 M22 228 C 40 220, 30 200, 22 190 M178 228 C 160 220, 170 200, 178 190" stroke={g} strokeWidth={2} fill="none" />
      {[[22, 22], [178, 22], [22, 228], [178, 228]].map(([x, y]) => <Circle key={`${x}-${y}`} cx={x} cy={y} r={4} fill={g} />)}
      <Rect x={36} y={32} width={128} height={140} fill="#F1E8D4" stroke={g} strokeWidth={4} />
      <Rect x={42} y={38} width={116} height={128} fill="none" stroke={book.color} strokeWidth={1} opacity={0.5} />
      <SvgText x={100} y={150} textAnchor="middle" fontFamily={F.display} fontSize={124} fill={book.color}>{book.initial}</SvgText>
      <G transform="translate(100 206)"><Emblem type={book.emblem} /></G>
    </Svg>
  );
}

export function Sundial({ mins, width = 150 }: { mins: number; width?: number }) {
  const f = Math.min(mins, 60) / 60, a = Math.PI * (1 - f), cx = 75, cy = 78, r = 62;
  const sx = cx + Math.cos(a) * (r - 6), sy = cy - Math.sin(a) * (r - 6);
  return (
    <Svg width={width} height={(width * 100) / 150} viewBox="0 0 150 100" accessibilityLabel={`Sundial showing ${mins} minutes in Ora today`}>
      <Path d={`M${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={C.vellum2} stroke={C.gold} strokeWidth={1} />
      {Array.from({ length: 13 }, (_, i) => {
        const t = Math.PI * (1 - i / 12), L = i % 3 ? 8 : 14;
        return <Line key={i} x1={cx + Math.cos(t) * r} y1={cy - Math.sin(t) * r} x2={cx + Math.cos(t) * (r - L)} y2={cy - Math.sin(t) * (r - L)} stroke={C.inkSoft} strokeWidth={1.2} />;
      })}
      <Line x1={cx} y1={cy} x2={sx} y2={sy} stroke={C.gold} strokeOpacity={0.35} strokeWidth={7} strokeLinecap="round" />
      <Path d={`M${cx} ${cy} L ${cx} ${cy - 34} L ${cx + 4} ${cy} Z`} fill={C.goldDeep} />
      <SvgText x={cx - r + 2} y={cy + 14} fontSize={9} fill={C.inkSoft} fontFamily={F.sc}>0</SvgText>
      <SvgText x={cx + r - 14} y={cy + 14} fontSize={9} fill={C.inkSoft} fontFamily={F.sc}>60</SvgText>
    </Svg>
  );
}

export const s = StyleSheet.create({
  eyebrow: { fontFamily: F.sc, fontSize: 11, letterSpacing: 2, color: C.gold, marginBottom: 6, textTransform: 'uppercase' },
  h2: { fontFamily: F.display, fontSize: 32, lineHeight: 36, color: C.ink, marginBottom: 6 },
  h3: { fontFamily: F.display, fontSize: 24, lineHeight: 28, color: C.ink },
  lede: { fontFamily: F.body, fontSize: 14.5, lineHeight: 22, color: C.inkSoft, marginBottom: 18 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 23, color: C.ink },
  proto: { fontFamily: F.bodyItalic, fontSize: 12, lineHeight: 18, color: C.inkFaint, marginTop: 14 },
  rule: { flexDirection: 'row', alignItems: 'center', marginVertical: 18, gap: 8 },
  ruleLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.vellum3 },
  ruleMark: { color: C.gold, fontSize: 11, opacity: 0.8 },
  back: { fontFamily: F.sc, fontSize: 13, letterSpacing: 0.4, color: C.inkSoft },
  btn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999, borderWidth: 1, alignItems: 'center', alignSelf: 'flex-start' },
  btnInk: { backgroundColor: C.ink, borderColor: C.ink },
  btnGhost: { backgroundColor: 'transparent', borderColor: C.vellum3 },
  btnGold: { backgroundColor: C.gold, borderColor: C.goldDeep },
  btnText: { fontFamily: F.sc, fontSize: 14, letterSpacing: 0.4 },
});
