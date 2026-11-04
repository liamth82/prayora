/**
 * Sound for prayer: the bell, the hush of a church at night, and recorded voice.
 * expo-audio is a native module present from the build that added it; older installs stay silent.
 */
let A: any = null;
try { A = require('expo-audio'); } catch { A = null; }
let H: any = null;
try { H = require('expo-haptics'); } catch { H = null; }

export const soundAvailable = !!A;
export const hapticsAvailable = !!H;

const BELL = require('../assets/sounds/bell.wav');
const CHURCH = require('../assets/sounds/church.m4a');

let moded = false;
async function mode() {
  if (!A || moded) return;
  moded = true;
  try { await A.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'doNotMix', shouldPlayInBackground: false }); } catch {}
}

function player(src: any, volume = 1, loop = false): any | null {
  if (!A) return null;
  try {
    const p = A.createAudioPlayer(src);
    p.volume = volume; p.loop = loop;
    return p;
  } catch { return null; }
}

function fade(p: any, to: number, ms: number, done?: () => void) {
  if (!p) { done?.(); return; }
  const from = p.volume ?? 0;
  const steps = Math.max(1, Math.round(ms / 50));
  let i = 0;
  const t = setInterval(() => {
    i++;
    try { p.volume = from + (to - from) * (i / steps); } catch {}
    if (i >= steps) { clearInterval(t); done?.(); }
  }, 50);
}

/** One prayer's sound: a background that fades in and out, a bell, and clips played one at a time. */
export class PrayerSound {
  private bg: any = null;
  private clip: any = null;
  private sub: any = null;
  private stopped = false;

  async start(withChurch: boolean) {
    if (!A) return;
    await mode();
    if (withChurch) {
      this.bg = player(CHURCH, 0, true);
      try { this.bg?.play(); } catch {}
      fade(this.bg, 0.32, 4000);
    }
  }

  bell(volume = 0.7) {
    const b = player(BELL, volume);
    if (!b) return;
    try { b.play(); } catch {}
    setTimeout(() => { try { b.remove(); } catch {} }, 12000);
  }

  /** Play a recorded line; calls done when it finishes (or at once if it cannot play). */
  play(src: any, done: () => void) {
    this.stopClip();
    const p = player(src, 1);
    if (!p) { done(); return; }
    this.clip = p;
    let finished = false;
    const end = () => { if (finished) return; finished = true; done(); };
    try {
      this.sub = p.addListener('playbackStatusUpdate', (s: any) => { if (s?.didJustFinish) end(); });
      p.play();
    } catch { end(); }
  }

  pause() { try { this.clip?.pause(); } catch {} try { this.bg?.pause(); } catch {} }
  resume() { try { this.clip?.play(); } catch {} try { this.bg?.play(); } catch {} }

  stopClip() {
    try { this.sub?.remove(); } catch {}
    try { this.clip?.pause(); this.clip?.remove(); } catch {}
    this.sub = null; this.clip = null;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.stopClip();
    const bg = this.bg; this.bg = null;
    fade(bg, 0, 2500, () => { try { bg?.pause(); bg?.remove(); } catch {} });
  }
}

/** A soft double beat in the hand, like a heartbeat. */
export function beat(strong = false) {
  if (!H) return;
  const style = strong ? H.ImpactFeedbackStyle?.Light : H.ImpactFeedbackStyle?.Soft ?? H.ImpactFeedbackStyle?.Light;
  try {
    H.impactAsync(style).catch(() => {});
    setTimeout(() => { H.impactAsync(H.ImpactFeedbackStyle?.Soft ?? style).catch(() => {}); }, 170);
  } catch {}
}
