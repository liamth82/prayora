import { Platform } from 'react-native';
import { load, save } from './storage';

// Native module: present from the build that added it. Older installs simply have no bells.
let N: any = null;
try { N = require('expo-notifications'); } catch { N = null; }
export const bellsAvailable = !!N;

let works: Promise<boolean> | null = null;
/** True when this install can really ring (the JS may be newer than the installed app). */
export function bellsWork(): Promise<boolean> {
  if (!N) return Promise.resolve(false);
  works ??= N.getPermissionsAsync().then(() => true).catch(() => false);
  return works!;
}

export type BellPreset = 'angelus' | 'morningnight' | 'full';
export type BellPrefs = { on: boolean; preset: BellPreset; sound: boolean; duringFast: boolean };
export const DEFAULT_BELLS: BellPrefs = { on: false, preset: 'angelus', sound: true, duringFast: false };

type Ring = { id: string; h: number; m: number; title: string; body: string };
const ANGELUS_BODY = 'The Angel of the Lord declared unto Mary…';
export const PRESETS: Record<BellPreset, { label: string; sub: string; rings: Ring[] }> = {
  angelus: {
    label: 'The Angelus', sub: '6am, noon and 6pm',
    rings: [6, 12, 18].map((h) => ({ id: 'angelus', h, m: 0, title: 'The Angelus', body: ANGELUS_BODY })),
  },
  morningnight: {
    label: 'Morning and night', sub: 'Lauds and Compline',
    rings: [
      { id: 'lauds', h: 6, m: 30, title: 'Lauds · Morning Prayer', body: 'The Church is praying. Begin the day with God.' },
      { id: 'compline', h: 21, m: 30, title: 'Compline · Night Prayer', body: 'The Church is praying. End the day in peace.' },
    ],
  },
  full: {
    label: 'The full day', sub: 'Every Hour, from Lauds to Compline',
    rings: [
      { id: 'lauds', h: 6, m: 30, title: 'Lauds · Morning Prayer', body: 'The Church is praying. Begin the day with God.' },
      { id: 'terce', h: 9, m: 0, title: 'Terce', body: 'A moment of prayer in the morning.' },
      { id: 'sext', h: 12, m: 0, title: 'Sext · Midday', body: 'The Church is praying at midday.' },
      { id: 'none', h: 15, m: 0, title: 'None', body: 'The hour of mercy. A moment with God.' },
      { id: 'vespers', h: 18, m: 0, title: 'Vespers · Evening Prayer', body: 'The Church is praying. Give thanks for the day.' },
      { id: 'compline', h: 21, m: 30, title: 'Compline · Night Prayer', body: 'The Church is praying. End the day in peace.' },
    ],
  },
};

let ready = false;
async function setup() {
  if (!N || ready) return;
  ready = true;
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    // A channel's sound is fixed once made, so there is one channel per sound.
    await N.setNotificationChannelAsync('angelus', { name: 'The Angelus', importance: N.AndroidImportance.DEFAULT, sound: 'angelus.wav', vibrationPattern: [0] });
    await N.setNotificationChannelAsync('bell', { name: 'The Hours', importance: N.AndroidImportance.DEFAULT, sound: 'bell.wav', vibrationPattern: [0] });
    await N.setNotificationChannelAsync('quiet', { name: 'Silent bells', importance: N.AndroidImportance.LOW, sound: null, vibrationPattern: [0] });
  }
}

export const loadBells = () => load<BellPrefs>('bells', DEFAULT_BELLS);

/** Ask permission to ring. True when allowed. */
export async function askPermission(): Promise<boolean> {
  if (!(await bellsWork())) return false;
  await setup();
  const cur = await N.getPermissionsAsync();
  if (cur.granted) return true;
  const r = await N.requestPermissionsAsync();
  return !!r.granted;
}

/** Set the day's bells from the preferences. Bells rest during a fast unless allowed. */
export async function scheduleBells(prefs?: BellPrefs, fasting?: boolean) {
  if (!(await bellsWork())) return;
  await setup();
  const p = prefs ?? (await loadBells());
  const f = fasting ?? !!(await load<{ until: number } | null>('fast', null).then((x) => x && x.until > Date.now()));
  await N.cancelAllScheduledNotificationsAsync();
  if (!p.on || (f && !p.duringFast)) return;
  for (const r of PRESETS[p.preset].rings) {
    const channelId = !p.sound ? 'quiet' : r.id === 'angelus' ? 'angelus' : 'bell';
    await N.scheduleNotificationAsync({
      content: { title: r.title, body: r.body, sound: p.sound ? (r.id === 'angelus' ? 'angelus.wav' : 'bell.wav') : false, data: { bell: r.id } },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour: r.h, minute: r.m, channelId },
    });
  }
}

export async function saveBells(p: BellPrefs) {
  await save('bells', p);
  await scheduleBells(p);
}

/** Call with a handler for taps on a bell; returns a function to stop listening. */
export function onBellTap(handler: (id: string) => void): () => void {
  if (!N) return () => {};
  try { N.addNotificationResponseReceivedListener; } catch { return () => {}; }
  N.getLastNotificationResponseAsync().then((r: any) => {
    const id = r?.notification?.request?.content?.data?.bell;
    if (id) { handler(id); N.clearLastNotificationResponseAsync?.(); }
  }).catch(() => {});
  try {
    const sub = N.addNotificationResponseReceivedListener((r: any) => {
      const id = r?.notification?.request?.content?.data?.bell;
      if (id) handler(id);
    });
    return () => sub.remove();
  } catch { return () => {}; }
}
