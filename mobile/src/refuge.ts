/**
 * Refuge: for the moment of temptation. Nothing here asks what the temptation is.
 * Everything is stored only on the phone.
 * Scripture is the Douay-Rheims; the prayers are traditional and in the public domain.
 */
import type { PrayerLine } from './screens/PrayerSession';
import { load, save } from './storage';

export const TRIGGERS = [
  'Tired', 'Lonely', 'Bored', 'Anxious', 'Stressed', 'Angry', 'Hurt', 'Sad',
  'Late at night', 'On my own', 'On my phone', 'Something I saw', 'Someone I was with', 'Celebrating',
];

export const SETTLE_SHORT: PrayerLine[] = [
  { text: 'Stop. You are here, and so is God.', secs: 6 },
  { text: 'Breathe in slowly…', secs: 5 },
  { text: '…and let it go.', secs: 6 },
  { text: 'This feeling will pass. His love will not.', secs: 7 },
];

export const REST_SHORT: PrayerLine[] = [
  { text: 'Stay a moment longer.', secs: 5 },
  { text: 'Breathe in His peace…', secs: 5 },
  { text: '…breathe out the struggle.', secs: 6 },
  { text: 'You turned to God. That is the victory.', secs: 7 },
];

const L = (text: string, secs = 9, label?: string): PrayerLine => ({ text, secs, label });

export type Meditation = { id: string; title: string; sub: string; lines: PrayerLine[] };

export const MEDITATIONS: Meditation[] = [
  {
    id: 'jesus', title: 'The Name of Jesus', sub: 'Breathe the oldest prayer of the heart',
    lines: [
      L('The Jesus Prayer has been prayed by monks and pilgrims for fifteen hundred years.', 9, 'The Name of Jesus'),
      L('It is short enough to pray in a single breath.', 7),
      L('Breathe in: Lord Jesus Christ, Son of God…', 8),
      L('Breathe out: have mercy on me, a sinner.', 9),
      L('Lord Jesus Christ, Son of God…', 7),
      L('…have mercy on me, a sinner.', 8),
      L('Let the Name rest in your heart. There is no other name under heaven by which we are saved.', 11),
      L('Lord Jesus Christ, Son of God…', 7),
      L('…have mercy on me, a sinner.', 8),
      L('If your mind wanders back to the temptation, do not argue with it.', 9),
      L('Simply return to the Name.', 7),
      L('Lord Jesus Christ…', 6),
      L('…have mercy on me.', 7),
      L('Jesus.', 7),
      L('Mercy.', 7),
      L('Lord Jesus Christ, Son of God…', 7),
      L('…have mercy on me, a sinner.', 8),
      L('He knows your weakness better than you do, and He is not ashamed of you.', 10),
      L('Lord Jesus Christ, Son of God…', 7),
      L('…have mercy on me, a sinner.', 8),
      L('Jesus, I trust in You.', 8),
      L('Lord Jesus Christ, Son of God, have mercy on me, a sinner.', 10),
      L('Amen.', 6),
    ],
  },
  {
    id: 'cross', title: 'At the Foot of the Cross', sub: 'Look at what love costs',
    lines: [
      L('Picture the crucifix. If you have one near you, look at it.', 9, 'At the Foot of the Cross'),
      L('See the hands that blessed children, held fast by nails.', 9),
      L('See the feet that walked to find the lost.', 8),
      L('See the head crowned with thorns, bowed toward you.', 9),
      L('He is not looking at your sin. He is looking at you.', 9),
      L('Whatever pulls at you now cannot give you what He is giving.', 9),
      L('Pray slowly with the Church:', 6, 'Anima Christi'),
      L('Soul of Christ, sanctify me.', 7),
      L('Body of Christ, save me.', 7),
      L('Blood of Christ, inebriate me.', 7),
      L('Water from the side of Christ, wash me.', 8),
      L('Passion of Christ, strengthen me.', 8),
      L('O good Jesus, hear me.', 7),
      L('Within Thy wounds hide me.', 8),
      L('Suffer me not to be separated from Thee.', 8),
      L('From the malicious enemy defend me.', 8),
      L('In the hour of my death call me, and bid me come unto Thee,', 9),
      L('that with Thy saints I may praise Thee for ever and ever. Amen.', 9),
      L('Stay at the foot of the Cross. You are safe here.', 9),
      L('Within Thy wounds hide me.', 9),
    ],
  },
  {
    id: 'mary', title: 'Under Her Mantle', sub: 'Run to your Mother',
    lines: [
      L('When a child is frightened, it runs to its mother.', 8, 'Under Her Mantle'),
      L('Run to her now.', 6),
      L('This is the oldest prayer to Our Lady that we know, from the third century:', 9, 'Sub tuum praesidium'),
      L('We fly to thy patronage, O holy Mother of God;', 8),
      L('despise not our petitions in our necessities,', 8),
      L('but deliver us always from all dangers,', 8),
      L('O glorious and blessed Virgin. Amen.', 8),
      L('Feel her mantle drawn around you.', 8),
      L('She crushed the serpent\'s head. She is not afraid of what you are facing.', 10),
      L('Pray the Memorare slowly:', 6, 'Memorare'),
      L('Remember, O most gracious Virgin Mary,', 7),
      L('that never was it known that anyone who fled to thy protection,', 9),
      L('implored thy help, or sought thy intercession was left unaided.', 9),
      L('Inspired with this confidence, I fly unto thee, O Virgin of virgins, my Mother.', 10),
      L('To thee do I come; before thee I stand, sinful and sorrowful.', 9),
      L('O Mother of the Word Incarnate, despise not my petitions,', 9),
      L('but in thy mercy hear and answer me. Amen.', 8),
      L('Hail Mary, full of grace, the Lord is with thee.', 8, 'Ave Maria'),
      L('Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.', 11),
    ],
  },
  {
    id: 'michael', title: 'Saint Michael', sub: 'Stand and resist',
    lines: [
      L('Temptation is not only a feeling. It is a battle, and you do not fight it alone.', 10, 'Saint Michael'),
      L('Be subject therefore to God. But resist the devil: and he will fly from you.', 10, 'James 4:7'),
      L('Draw nigh to God: and he will draw nigh to you.', 8),
      L('Stand up if you can. Plant your feet.', 8),
      L('Make the Sign of the Cross, slowly and deliberately.', 9),
      L('In the name of the Father, and of the Son, and of the Holy Spirit.', 9),
      L('Now pray the prayer Pope Leo XIII gave the whole Church:', 8, 'Prayer to Saint Michael'),
      L('Saint Michael the Archangel, defend us in battle.', 8),
      L('Be our protection against the wickedness and snares of the devil.', 9),
      L('May God rebuke him, we humbly pray;', 7),
      L('and do thou, O Prince of the heavenly host,', 8),
      L('by the power of God, thrust into hell Satan and all the evil spirits', 9),
      L('who prowl about the world seeking the ruin of souls. Amen.', 9),
      L('God is faithful, who will not suffer you to be tempted above that which you are able:', 10, '1 Corinthians 10:13'),
      L('but will make also with temptation issue, that you may be able to bear it.', 10),
      L('There is a way out. Take it now.', 8),
      L('Saint Michael, defend me.', 7),
      L('Guardian Angel, stay beside me.', 8),
    ],
  },
  {
    id: 'mountains', title: 'Lift Up Your Eyes', sub: 'Move, look up, change the scene',
    lines: [
      L('Sometimes the holiest thing is simply to move.', 8, 'Lift Up Your Eyes'),
      L('Stand up. Leave the room you are in, if you can.', 9),
      L('Put the phone down, or turn its screen away from you.', 9),
      L('Go to a window, or step outside.', 8),
      L('Drink a glass of water, slowly.', 9),
      L('Now look up, at the sky, or the furthest thing you can see.', 9),
      L('I have lifted up my eyes to the mountains, from whence help shall come to me.', 10, 'Psalm 120'),
      L('My help is from the Lord, who made heaven and earth.', 9),
      L('May he not suffer thy foot to be moved: neither let him slumber that keepeth thee.', 10),
      L('The Lord is thy keeper, the Lord is thy protection upon thy right hand.', 10),
      L('The sun shall not burn thee by day: nor the moon by night.', 9),
      L('The Lord keepeth thee from all evil: may the Lord keep thy soul.', 10),
      L('May the Lord keep thy coming in and thy going out; from henceforth now and for ever.', 11),
      L('Breathe the air. Notice something beautiful: a tree, a light, the sound of the street.', 10),
      L('Beauty is His. It points you home.', 8),
      L('When you are ready, do one good thing: tidy something, call someone, read a page.', 10),
    ],
  },
  {
    id: 'freedom', title: 'Remember Who You Are', sub: 'You were made free',
    lines: [
      L('Stand fast and be not held again under the yoke of bondage.', 10, 'Galatians 5:1'),
      L('Christ has set you free. Temptation tells you that you are not.', 9),
      L('Remember your baptism.', 7),
      L('Water was poured, and you were claimed: a child of God, a temple of the Holy Spirit.', 11),
      L('That is still who you are, whatever you have done, whatever you feel now.', 10),
      L('Do you reject Satan?', 7, 'Renewal of baptismal promises'),
      L('I do.', 6),
      L('And all his works?', 6),
      L('I do.', 6),
      L('And all his empty promises?', 7),
      L('I do.', 6),
      L('Do you believe in God, the Father almighty, creator of heaven and earth?', 9),
      L('I do.', 6),
      L('Do you believe in Jesus Christ, His only Son, our Lord, who was born, suffered, died and rose again?', 11),
      L('I do.', 6),
      L('Do you believe in the Holy Spirit, the holy Catholic Church, the forgiveness of sins and life everlasting?', 11),
      L('I do.', 6),
      L('You are free. Not because you are strong, but because He is.', 9),
      L('If you have fallen, the door of confession is always open. Go soon, without fear.', 10),
    ],
  },
];

export type RefugeEntry = { t: string; triggers: string[]; med?: string; outcome?: 'passed' | 'struggling' };

export const loadLog = () => load<RefugeEntry[]>('refuge:log', []);
export async function addEntry(e: RefugeEntry) {
  const log = await loadLog();
  log.push(e);
  await save('refuge:log', log.slice(-500));
  return log;
}
export async function updateLast(patch: Partial<RefugeEntry>) {
  const log = await loadLog();
  if (!log.length) return log;
  log[log.length - 1] = { ...log[log.length - 1], ...patch };
  await save('refuge:log', log);
  return log;
}
export async function clearLog() { await save('refuge:log', []); }
