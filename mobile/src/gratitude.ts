/** Deo gratias: remembering moments of gratitude. Kept only on the phone. */
import type { PrayerLine } from './screens/PrayerSession';
import { load, save } from './storage';

export const CAUSES = [
  'A person', 'Family', 'A friend', 'A kindness', 'Answered prayer', 'Good news', 'Health', 'Work',
  'Nature', 'Beauty', 'Music', 'Food', 'Rest', 'Mass', 'Confession', 'Forgiveness', 'A small thing', 'Just because',
];

export const THANKS_SETTLE: PrayerLine[] = [
  { text: 'Be still for a moment.', secs: 5 },
  { text: 'Hold what you are thankful for before God.', secs: 7 },
];

export const THANKS_LINES: PrayerLine[] = [
  { text: 'Bless the Lord, O my soul, and never forget all he hath done for thee.', secs: 9, label: 'Psalm 102' },
  { text: 'Every best gift and every perfect gift is from above, coming down from the Father of lights.', secs: 10, label: 'James 1:17' },
  { text: 'Give praise to the Lord, for he is good: for his mercy endureth for ever.', secs: 9, label: 'Psalm 117' },
  { text: 'Glory be to the Father, and to the Son, and to the Holy Spirit.', secs: 7 },
  { text: 'As it was in the beginning, is now, and ever shall be, world without end. Amen.', secs: 8 },
];

export const THANKS_REST: PrayerLine[] = [
  { text: 'Deo gratias.', secs: 5 },
  { text: 'Thanks be to God.', secs: 5 },
];

export type GratitudeEntry = { t: string; causes: string[]; note?: string };
export const loadGratitude = () => load<GratitudeEntry[]>('gratitude:log', []);
export async function addGratitude(e: GratitudeEntry) {
  const log = await loadGratitude();
  log.push(e);
  await save('gratitude:log', log.slice(-1000));
  return log;
}
export async function removeGratitude(t: string) {
  const log = (await loadGratitude()).filter((e) => e.t !== t);
  await save('gratitude:log', log);
  return log;
}
