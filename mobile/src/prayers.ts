import { GLORIA, HOURS } from './content';
import type { Hour } from './content';
import { PrayerLine, toLines } from './screens/PrayerSession';
import { complineParts } from './compline';
import { season } from './liturgy';
import { COMPLINE_VOICE } from './voice';

export function hourLines(x: Hour): PrayerLine[] {
  return [
    { text: 'O God, come to my assistance.', secs: 5, label: 'Opening' },
    { text: 'O Lord, make haste to help me.', secs: 5 },
    ...toLines(GLORIA),
    ...toLines(x.psalm[1], x.psalm[0]),
    ...(x.cant ? toLines(x.cant[1], x.cant[0]) : []),
    ...toLines(GLORIA),
    { text: 'Let us bless the Lord.', secs: 4.5, label: 'Conclusion' },
    { text: 'Thanks be to God.', secs: 5 },
  ];
}

/** Everything the prayer session needs for an Hour. Compline is the full night office, with Liam's voice. */
export type HourSession = { lines: PrayerLine[]; settle?: PrayerLine[]; rest?: PrayerLine[]; voice?: Record<string, number>; church: boolean; intro?: string };
export function hourSession(x: Hour): HourSession {
  if (x.id === 'compline') {
    const c = complineParts(season().name === 'Eastertide');
    return { lines: c.prayer, settle: c.settle, rest: c.rest, voice: COMPLINE_VOICE, church: true,
      intro: 'The Church\'s prayer at the end of the day: a short examination, the night psalms, the Nunc dimittis and a hymn to Our Lady. About fifteen minutes. Lay the phone down if you like, and follow the pulse.' };
  }
  return { lines: hourLines(x), church: true };
}

const HAIL_MARY = 'Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.';

/** The Angelus, prayed at morning, noon and evening at the sound of the bell. */
export const ANGELUS: PrayerLine[] = [
  { text: 'The Angel of the Lord declared unto Mary.', secs: 5, label: 'The Angelus' },
  { text: 'And she conceived of the Holy Spirit.', secs: 5 },
  ...toLines(HAIL_MARY),
  { text: 'Behold the handmaid of the Lord.', secs: 5 },
  { text: 'Be it done unto me according to thy word.', secs: 5 },
  ...toLines(HAIL_MARY),
  { text: 'And the Word was made flesh.', secs: 5 },
  { text: 'And dwelt among us.', secs: 5 },
  ...toLines(HAIL_MARY),
  { text: 'Pray for us, O holy Mother of God.', secs: 5 },
  { text: 'That we may be made worthy of the promises of Christ.', secs: 6 },
  { text: 'Let us pray.', secs: 3.5, label: 'Prayer' },
  ...toLines('Pour forth, we beseech thee, O Lord, thy grace into our hearts; that we, to whom the Incarnation of Christ thy Son was made known by the message of an angel, may by his Passion and Cross be brought to the glory of his Resurrection. Through the same Christ our Lord. Amen.'),
];

/** What a bell calls you to: the Angelus, or one of the Hours. */
export function bellPrayer(id: string): ({ title: string; subtitle: string; hourId?: string } & HourSession) | null {
  if (id === 'angelus') return { title: 'The Angelus', subtitle: 'At the sound of the bell', lines: ANGELUS, church: true };
  const h = HOURS.find((x) => x.id === id);
  return h ? { title: h.name, subtitle: h.sub, hourId: h.id, ...hourSession(h) } : null;
}
