/**
 * The words that guide the prayer experience. Edit freely: each line fades in, rests, and fades out.
 * `secs` is how long the line stays on screen (it fades in and out within that time).
 */

export type Line = { text: string; secs: number };

/** Settling: about a minute before the prayer begins. Breathing lines are timed to the light. */
export const SETTLE: Line[] = [
  { text: 'Be still.', secs: 6 },
  { text: 'Breathe in slowly…', secs: 5 },
  { text: '…and breathe out.', secs: 6 },
  { text: 'Let the noise of the day fall away.', secs: 7 },
  { text: 'Breathe in…', secs: 5 },
  { text: '…and out.', secs: 6 },
  { text: 'Turn your mind to God.', secs: 7 },
  { text: 'He is here, in the silence.', secs: 7 },
  { text: 'Breathe in His peace…', secs: 5 },
  { text: '…breathe out your cares.', secs: 6 },
  { text: 'Now let us pray.', secs: 5 },
];

/** Resting: after the prayer, before returning to the app. The final blessing is added by time of day. */
export const REST: Line[] = [
  { text: 'Let the words of God rest in your mind.', secs: 7 },
  { text: 'Let them sink in, slowly.', secs: 7 },
  { text: 'Breathe in…', secs: 5 },
  { text: '…and out.', secs: 6 },
  { text: 'Carry them with you.', secs: 6 },
];

export function blessing(d = new Date()): string {
  const h = d.getHours();
  if (h >= 4 && h < 12) return 'Go in peace. Have a blessed morning.';
  if (h >= 12 && h < 17) return 'Go in peace. Have a blessed afternoon.';
  if (h >= 17 && h < 21) return 'Go in peace. Have a blessed evening.';
  return 'Go in peace. May God grant you a quiet night.';
}

/** Breathing pace for the light, in seconds. */
export const BREATH_IN = 4.5;
export const BREATH_OUT = 6;
/** Heartbeat for the faint pulse in the light, in beats per minute. */
export const HEART_BPM = 56;
