import { load, save } from './storage';

// Native module: present from the build that added it.
let LA: any = null;
try { LA = require('expo-local-authentication'); } catch { LA = null; }

let unlockedAt = 0;
const GRACE = 5 * 60 * 1000;

/** True when this phone can lock with a fingerprint, face or passcode. */
export async function lockSupported(): Promise<boolean> {
  if (!LA) return false;
  try { return (await LA.hasHardwareAsync()) && (await LA.isEnrolledAsync()); } catch { return false; }
}
export const lockIsOn = () => load<boolean>('lock:on', false);
export async function setLock(on: boolean): Promise<boolean> {
  if (on) {
    const r = await authenticate('Lock your private spaces in Ora');
    if (!r) return false;
  }
  await save('lock:on', on);
  return true;
}

async function authenticate(promptMessage: string): Promise<boolean> {
  if (!LA) return true;
  try {
    const r = await LA.authenticateAsync({ promptMessage, cancelLabel: 'Cancel', disableDeviceFallback: false });
    if (r.success) unlockedAt = Date.now();
    return !!r.success;
  } catch { return false; }
}

/** Ask for a fingerprint before showing something private. Stays unlocked for five minutes. */
export async function unlock(what: string): Promise<boolean> {
  if (!LA || !(await lockIsOn())) return true;
  if (Date.now() - unlockedAt < GRACE) return true;
  return authenticate(`Unlock ${what}`);
}
