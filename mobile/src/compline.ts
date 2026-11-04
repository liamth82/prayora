/**
 * Compline (Night Prayer), the same every night: the traditional Roman order (Sunday Compline, which the
 * Church allows on any night), Douay-Rheims psalms, J. M. Neale's translation of Te lucis ante terminum
 * and traditional English for the rest. Everything here is public domain.
 *
 * Each section is one recording; each line is one clip, id "SS-LL" (section, line). The recording script
 * is generated from this file (tools/compline_script.py), so edit the words here and nowhere else.
 * `hold` adds silence after a line (the examen); `guide` lines are spoken guidance, not liturgy.
 */
import type { PrayerLine } from './screens/PrayerSession';

const secsFor = (t: string) => Math.max(4.5, Math.min(16, 2.5 + t.split(/\s+/).length * 0.55));

export type ComplineLine = { text: string; label?: string; hold?: number; guide?: boolean };
export type ComplineSection = { n: number; title: string; part: 'settle' | 'prayer' | 'rest'; season?: 'easter' | 'notEaster'; lines: ComplineLine[] };

const G = 'Glory be to the Father, and to the Son, and to the Holy Spirit.';
const G2 = 'As it was in the beginning, is now, and ever shall be, world without end. Amen.';
const g = (text: string, hold?: number): ComplineLine => ({ text, guide: true, hold });

export const COMPLINE: ComplineSection[] = [
  { n: 1, title: 'Settling', part: 'settle', lines: [
    g('The day is ending.'), g('Be still.'), g('Breathe in slowly…'), g('…and breathe out.'),
    g('Let the noise of the day fall away.'), g('Breathe in…'), g('…and out.'),
    g('God is here, in the quiet of the night.'), g('Now let us pray.'),
  ] },
  { n: 2, title: 'Blessing, reading and examination', part: 'prayer', lines: [
    { text: 'May the Lord Almighty grant us a quiet night and a perfect end. Amen.', label: 'Blessing' },
    { text: 'Brethren: Be sober and watch: because your adversary the devil, as a roaring lion, goeth about seeking whom he may devour.', label: 'Short reading · 1 Peter 5:8–9' },
    { text: 'Whom resist ye, strong in faith.' },
    { text: 'But thou, O Lord, have mercy on us. Thanks be to God.' },
    { text: 'Our help is in the name of the Lord. Who made heaven and earth.' },
    g('Before we confess, look back over the day.', 4),
    g('Where was God with you today?', 10),
    g('Give thanks for one good gift.', 8),
    g('Where did you fall short, in thought, in word, in deed?', 12),
    g('Hand it to Him. He is merciful.', 3),
    { text: 'I confess to almighty God, to blessed Mary ever Virgin, to blessed Michael the Archangel, to blessed John the Baptist, to the holy Apostles Peter and Paul, and to all the Saints,', label: 'Confession' },
    { text: 'that I have sinned exceedingly in thought, word and deed:' },
    { text: 'through my fault, through my fault, through my most grievous fault.' },
    { text: 'Therefore I beseech blessed Mary ever Virgin, blessed Michael the Archangel, blessed John the Baptist, the holy Apostles Peter and Paul, and all the Saints, to pray to the Lord our God for me.' },
    { text: 'May almighty God have mercy on us, forgive us our sins, and bring us to life everlasting. Amen.' },
    { text: 'May the almighty and merciful Lord grant us pardon, absolution, and remission of our sins. Amen.' },
  ] },
  { n: 3, title: 'Opening and Psalm 4', part: 'prayer', lines: [
    { text: 'Convert us, O God our Saviour. And turn away thy anger from us.', label: 'Opening' },
    { text: 'O God, come to my assistance. O Lord, make haste to help me.' },
    { text: G }, { text: G2 }, { text: 'Alleluia.' },
    { text: 'Have mercy on me, O Lord, and hear my prayer.', label: 'Antiphon' },
    { text: 'When I called upon him, the God of my justice heard me: when I was in distress, thou hast enlarged me.', label: 'Psalm 4' },
    { text: 'Have mercy on me: and hear my prayer.' },
    { text: 'O ye sons of men, how long will you be dull of heart? why do you love vanity, and seek after lying?' },
    { text: 'Know ye also that the Lord hath made his holy one wonderful: the Lord will hear me when I shall cry unto him.' },
    { text: 'Be ye angry, and sin not: the things you say in your hearts, be sorry for them upon your beds.' },
    { text: 'Offer up the sacrifice of justice, and trust in the Lord: many say, Who sheweth us good things?' },
    { text: 'The light of thy countenance, O Lord, is signed upon us: thou hast given gladness in my heart.' },
    { text: 'By the fruit of their corn, their wine, and oil, they are multiplied.' },
    { text: 'In peace in the self same I will sleep, and I will rest:' },
    { text: 'For thou, O Lord, singularly hast settled me in hope.' },
    { text: G }, { text: G2 },
  ] },
  { n: 4, title: 'Psalm 90', part: 'prayer', lines: [
    { text: 'He that dwelleth in the aid of the most High, shall abide under the protection of the God of Jacob.', label: 'Psalm 90' },
    { text: 'He shall say to the Lord: Thou art my protector, and my refuge: my God, in him will I trust.' },
    { text: 'For he hath delivered me from the snare of the hunters: and from the sharp word.' },
    { text: 'He will overshadow thee with his shoulders: and under his wings thou shalt trust.' },
    { text: 'His truth shall compass thee with a shield: thou shalt not be afraid of the terror of the night.' },
    { text: 'Of the arrow that flieth in the day, of the business that walketh about in the dark: of invasion, or of the noonday devil.' },
    { text: 'A thousand shall fall at thy side, and ten thousand at thy right hand: but it shall not come nigh thee.' },
    { text: 'But thou shalt consider with thy eyes: and shalt see the reward of the wicked.' },
    { text: 'Because thou, O Lord, art my hope: thou hast made the most High thy refuge.' },
    { text: 'There shall no evil come to thee: nor shall the scourge come near thy dwelling.' },
    { text: 'For he hath given his angels charge over thee; to keep thee in all thy ways.' },
    { text: 'In their hands they shall bear thee up: lest thou dash thy foot against a stone.' },
    { text: 'Thou shalt walk upon the asp and the basilisk: and thou shalt trample under foot the lion and the dragon.' },
    { text: 'Because he hoped in me I will deliver him: I will protect him because he hath known my name.' },
    { text: 'He shall cry to me, and I will hear him: I am with him in tribulation, I will deliver him, and I will glorify him.' },
    { text: 'I will fill him with length of days; and I will shew him my salvation.' },
    { text: G }, { text: G2 },
  ] },
  { n: 5, title: 'Psalm 133', part: 'prayer', lines: [
    { text: 'Behold now bless ye the Lord, all ye servants of the Lord:', label: 'Psalm 133' },
    { text: 'Who stand in the house of the Lord, in the courts of the house of our God.' },
    { text: 'In the nights lift up your hands to the holy places, and bless ye the Lord.' },
    { text: 'May the Lord out of Sion bless thee, he that made heaven and earth.' },
    { text: G }, { text: G2 },
    { text: 'Have mercy on me, O Lord, and hear my prayer.', label: 'Antiphon' },
  ] },
  { n: 6, title: 'Hymn', part: 'prayer', lines: [
    { text: 'Before the ending of the day,\nCreator of the world, we pray\nThat with thy wonted favour thou\nWouldst be our guard and keeper now.', label: 'Hymn · Te lucis ante terminum' },
    { text: 'From all ill dreams defend our eyes,\nFrom nightly fears and fantasies;\nTread under foot our ghostly foe,\nThat no pollution we may know.' },
    { text: 'O Father, that we ask be done,\nThrough Jesus Christ thine only Son;\nWho, with the Holy Ghost and thee,\nDoth live and reign eternally. Amen.' },
  ] },
  { n: 7, title: 'Chapter and responsory', part: 'prayer', lines: [
    { text: 'Thou, O Lord, art among us, and thy name is called upon by us: forsake us not, O Lord our God.', label: 'Chapter · Jeremias 14:9' },
    { text: 'Thanks be to God.' },
    { text: 'Into thy hands, O Lord, I commend my spirit.', label: 'Responsory' },
    { text: 'Into thy hands, O Lord, I commend my spirit.' },
    { text: 'Thou hast redeemed us, O Lord, the God of truth.' },
    { text: 'I commend my spirit.' },
    { text: G },
    { text: 'Into thy hands, O Lord, I commend my spirit.' },
    { text: 'Keep us, O Lord, as the apple of thy eye.' },
    { text: 'Protect us under the shadow of thy wings.' },
  ] },
  { n: 8, title: 'Nunc dimittis', part: 'prayer', lines: [
    { text: 'Save us, O Lord, while we are awake, and guard us while we sleep: that we may watch with Christ, and rest in peace.', label: 'Antiphon' },
    { text: 'Now thou dost dismiss thy servant, O Lord, according to thy word in peace;', label: 'Nunc dimittis · Luke 2:29–32' },
    { text: 'Because my eyes have seen thy salvation,' },
    { text: 'Which thou hast prepared before the face of all peoples:' },
    { text: 'A light to the revelation of the Gentiles, and the glory of thy people Israel.' },
    { text: G }, { text: G2 },
    { text: 'Save us, O Lord, while we are awake, and guard us while we sleep: that we may watch with Christ, and rest in peace.' },
  ] },
  { n: 9, title: 'Prayer and blessing', part: 'prayer', lines: [
    { text: 'O Lord, hear my prayer. And let my cry come unto thee.', label: 'Prayer' },
    { text: 'Let us pray.' },
    { text: 'Visit, we beseech thee, O Lord, this dwelling, and drive far from it all snares of the enemy:' },
    { text: 'let thy holy Angels dwell herein, to preserve us in peace; and let thy blessing be upon us always.' },
    { text: 'Through our Lord Jesus Christ, thy Son, who liveth and reigneth with thee in the unity of the Holy Spirit, God, world without end. Amen.' },
    { text: 'O Lord, hear my prayer. And let my cry come unto thee.' },
    { text: 'Let us bless the Lord. Thanks be to God.' },
    { text: 'May the almighty and merciful Lord, the Father, and the Son, and the Holy Spirit, bless and keep us. Amen.', label: 'Blessing' },
  ] },
  { n: 10, title: 'Salve Regina (outside Eastertide)', part: 'prayer', season: 'notEaster', lines: [
    { text: 'Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope.', label: 'Salve Regina' },
    { text: 'To thee do we cry, poor banished children of Eve. To thee do we send up our sighs, mourning and weeping in this valley of tears.' },
    { text: 'Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus.' },
    { text: 'O clement, O loving, O sweet Virgin Mary.' },
    { text: 'Pray for us, O holy Mother of God. That we may be made worthy of the promises of Christ.' },
    { text: 'Let us pray.' },
    { text: 'Almighty, everlasting God, who by the co-operation of the Holy Spirit didst prepare the body and soul of the glorious Virgin-Mother Mary to become a dwelling-place meet for thy Son:' },
    { text: 'grant that as we rejoice in her commemoration, so by her fervent intercession we may be delivered from present evils and from everlasting death. Through the same Christ our Lord. Amen.' },
    { text: 'May the divine assistance remain always with us. Amen.' },
  ] },
  { n: 11, title: 'Regina Caeli (Eastertide only)', part: 'prayer', season: 'easter', lines: [
    { text: 'Queen of heaven, rejoice, alleluia.', label: 'Regina Caeli' },
    { text: 'For he whom thou didst merit to bear, alleluia,' },
    { text: 'has risen, as he said, alleluia.' },
    { text: 'Pray for us to God, alleluia.' },
    { text: 'Rejoice and be glad, O Virgin Mary, alleluia. For the Lord is truly risen, alleluia.' },
    { text: 'Let us pray.' },
    { text: 'O God, who gavest joy to the world through the resurrection of thy Son, our Lord Jesus Christ,' },
    { text: 'grant, we beseech thee, that through the intercession of the Virgin Mary, his Mother, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen.' },
    { text: 'May the divine assistance remain always with us. Amen.' },
  ] },
  { n: 12, title: 'Resting', part: 'rest', lines: [
    g('Rest now in His peace.'), g('Breathe in…'), g('…and out.'),
    g('Into His hands you commend your spirit.'),
    g('Go in peace. May God grant you a quiet night.'),
  ] },
];

export const clipId = (s: number, l: number) => `${String(s).padStart(2, '0')}-${String(l + 1).padStart(2, '0')}`;

export type ClipLine = PrayerLine & { clip: string; hold?: number };

/** Compline for tonight, as the three parts the prayer session plays. */
export function complineParts(easter: boolean): { settle: ClipLine[]; prayer: ClipLine[]; rest: ClipLine[] } {
  const out = { settle: [] as ClipLine[], prayer: [] as ClipLine[], rest: [] as ClipLine[] };
  for (const s of COMPLINE) {
    if (s.season === 'easter' && !easter) continue;
    if (s.season === 'notEaster' && easter) continue;
    s.lines.forEach((x, i) => out[s.part].push({ text: x.text, label: x.label, clip: clipId(s.n, i), hold: x.hold, secs: secsFor(x.text) + (x.hold ?? 0) }));
  }
  return out;
}

/** Compline as reading text: section headings in capitals, then the lines (no spoken guidance). */
export function complineText(easter: boolean): string[] {
  const out: string[] = [];
  for (const s of COMPLINE) {
    if (s.part !== 'prayer' || (s.season === 'easter' && !easter) || (s.season === 'notEaster' && easter)) continue;
    for (const x of s.lines) {
      if (x.guide) continue;
      if (x.label) out.push(x.label.toUpperCase());
      out.push(x.text);
    }
  }
  return out;
}
