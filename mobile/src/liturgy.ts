import { C } from './theme';

const DAY = 86400000;
const mk = (y: number, m: number, d: number) => new Date(y, m, d);

function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
    f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
    mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
  return mk(y, mo - 1, da);
}
const sundayOnOrBefore = (d: Date) => new Date(+d - d.getDay() * DAY);
function advent1(y: number) { return sundayOnOrBefore(mk(y, 11, 3)); }
export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function season(now = new Date()): { name: string; color: string } {
  const t = mk(now.getFullYear(), now.getMonth(), now.getDate()), y = t.getFullYear();
  const E = easter(y), ash = new Date(+E - 46 * DAY), pent = new Date(+E + 49 * DAY), adv = advent1(y);
  const epiph = mk(y, 0, 6);
  const bapt = new Date(+sundayOnOrBefore(new Date(+epiph + 6 * DAY)) + (epiph.getDay() === 0 ? 7 * DAY : 0));
  if (t >= adv && t < mk(y, 11, 25)) return { name: 'Advent', color: C.violet };
  if (t >= mk(y, 11, 25) || t <= bapt) return { name: 'Christmastide', color: C.white };
  if (t >= ash && t < new Date(+E - 3 * DAY)) return { name: 'Lent', color: C.violet };
  if (t >= new Date(+E - 3 * DAY) && t < E) return { name: 'Sacred Triduum', color: C.rubric };
  if (t >= E && t <= pent) return { name: 'Eastertide', color: C.white };
  if (t > pent && t < adv) {
    const ck = new Date(+adv - 7 * DAY);
    const w = 34 - Math.round((+ck - +sundayOnOrBefore(t)) / (7 * DAY));
    return { name: `${ordinal(w)} Week in Ordinary Time`, color: C.green };
  }
  return { name: 'Ordinary Time', color: C.green };
}
