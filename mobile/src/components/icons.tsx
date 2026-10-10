import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** Refuge: a shield bearing a cross. */
export const RefugeIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size * 1.1} viewBox="0 0 20 22">
    <Path d="M10 1.2 L17.6 4 V10 C17.6 15 14.4 18.8 10 20.8 C5.6 18.8 2.4 15 2.4 10 V4 Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
    <Path d="M10 6 V15.5 M6.8 9.2 H13.2" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

/** Deo gratias: a lit candle. */
export const ThanksIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
  <Svg width={size} height={size * 1.1} viewBox="0 0 20 22">
    <Path d="M10 1.4 C12.6 4.4 12.8 6.6 10 8.4 C7.2 6.6 7.4 4.4 10 1.4 Z" stroke={color} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
    <Path d="M10 8.4 V10" stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    <Path d="M7 10.4 H13 V19.6 H7 Z" stroke={color} strokeWidth={1.4} fill="none" strokeLinejoin="round" />
    <Path d="M4.5 20.6 H15.5" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

export const WisdomIcon = ({ color, size = 17 }: { color: string; size?: number }) => (
  <Svg width={size} height={size * 1.15} viewBox="0 0 20 23"><Path d="M3.5 2h13v19l-6.5-4.6L3.5 21z" stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" /></Svg>
);

export const GearIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={1.5} fill="none" />
    <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);
