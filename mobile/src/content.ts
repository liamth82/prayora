import { C } from './theme';

export type Book = {
  id: string; name: string; ref: string; note: string; color: string;
  emblem: 'sun' | 'harp' | 'star' | 'lily' | 'cross'; initial: string; verses: [number, string][];
};

export const BOOKS: Book[] = [
  { id: 'gen', name: 'Genesis', ref: 'Genesis 1:1–5', note: 'The first day', color: '#2F5D50', emblem: 'sun', initial: 'I', verses: [
    [1, 'In the beginning God created heaven, and earth.'],
    [2, 'And the earth was void and empty, and darkness was upon the face of the deep; and the spirit of God moved over the waters.'],
    [3, 'And God said: Be light made. And light was made.'],
    [4, 'And God saw the light that it was good; and he divided the light from the darkness.'],
    [5, 'And he called the light Day, and the darkness Night; and there was evening and morning one day.'],
  ] },
  { id: 'ps', name: 'Psalms', ref: 'Psalm 22 (23)', note: 'The Lord ruleth me', color: '#6B2D3A', emblem: 'harp', initial: 'T', verses: [
    [1, 'The Lord ruleth me: and I shall want nothing.'],
    [2, 'He hath set me in a place of pasture. He hath brought me up, on the water of refreshment:'],
    [3, "He hath converted my soul. He hath led me on the paths of justice, for his own name's sake."],
    [4, 'For though I should walk in the midst of the shadow of death, I will fear no evils, for thou art with me. Thy rod and thy staff, they have comforted me.'],
    [5, 'Thou hast prepared a table before me against them that afflict me. Thou hast anointed my head with oil; and my chalice which inebriateth me, how goodly is it!'],
    [6, 'And thy mercy will follow me all the days of my life. And that I may dwell in the house of the Lord unto length of days.'],
  ] },
  { id: 'mt', name: 'Matthew', ref: 'Matthew 5:3–10', note: 'The Beatitudes', color: '#2E4A7A', emblem: 'star', initial: 'B', verses: [
    [3, 'Blessed are the poor in spirit: for theirs is the kingdom of heaven.'],
    [4, 'Blessed are the meek: for they shall possess the land.'],
    [5, 'Blessed are they that mourn: for they shall be comforted.'],
    [6, 'Blessed are they that hunger and thirst after justice: for they shall have their fill.'],
    [7, 'Blessed are the merciful: for they shall obtain mercy.'],
    [8, 'Blessed are the clean of heart: for they shall see God.'],
    [9, 'Blessed are the peacemakers: for they shall be called the children of God.'],
    [10, "Blessed are they that suffer persecution for justice' sake: for theirs is the kingdom of heaven."],
  ] },
  { id: 'lk', name: 'Luke', ref: 'Luke 1:46–50', note: 'The Magnificat', color: '#7A3B1E', emblem: 'lily', initial: 'M', verses: [
    [46, 'And Mary said: My soul doth magnify the Lord.'],
    [47, 'And my spirit hath rejoiced in God my Saviour.'],
    [48, 'Because he hath regarded the humility of his handmaid; for behold from henceforth all generations shall call me blessed.'],
    [49, 'Because he that is mighty, hath done great things to me; and holy is his name.'],
    [50, 'And his mercy is from generation unto generations, to them that fear him.'],
  ] },
  { id: 'jn', name: 'John', ref: 'John 1:1–5', note: 'The Word made light', color: '#1F4A6B', emblem: 'cross', initial: 'I', verses: [
    [1, 'In the beginning was the Word, and the Word was with God, and the Word was God.'],
    [2, 'The same was in the beginning with God.'],
    [3, 'All things were made by him: and without him was made nothing that was made.'],
    [4, 'In him was life, and the life was the light of men.'],
    [5, 'And the light shineth in darkness, and the darkness did not comprehend it.'],
  ] },
];

export const GLORIA = 'Glory be to the Father, and to the Son, and to the Holy Spirit. As it was in the beginning, is now, and ever shall be, world without end. Amen.';

export type Hour = { id: string; name: string; sub: string; from: number; to: number; label: string; psalm: [string, string]; cant?: [string, string] };
export const HOURS: Hour[] = [
  { id: 'lauds', name: 'Lauds', sub: 'Morning Prayer', from: 5, to: 9, label: '06:00',
    psalm: ['Psalm 62:2–3', 'O God, my God, to thee do I watch at break of day. For thee my soul hath thirsted; for thee my flesh, O how many ways! In a desert land, and where there is no way, and no water: so in the sanctuary have I come before thee, to see thy power and thy glory.'],
    cant: ['Benedictus · Luke 1:78–79', 'Through the bowels of the mercy of our God, in which the Orient from on high hath visited us: to enlighten them that sit in darkness, and in the shadow of death: to direct our feet into the way of peace.'] },
  { id: 'terce', name: 'Terce', sub: 'Mid-morning', from: 9, to: 12, label: '09:00', psalm: ['Psalm 118:105', 'Thy word is a lamp to my feet, and a light to my paths.'] },
  { id: 'sext', name: 'Sext', sub: 'Midday', from: 12, to: 15, label: '12:00', psalm: ['Psalm 54:18', 'Evening and morning, and at noon I will speak and declare: and he shall hear my voice.'] },
  { id: 'none', name: 'None', sub: 'Mid-afternoon', from: 15, to: 17, label: '15:00', psalm: ['Psalm 125:5', 'They that sow in tears shall reap in joy.'] },
  { id: 'vespers', name: 'Vespers', sub: 'Evening Prayer', from: 17, to: 20, label: '18:00',
    psalm: ['Psalm 140:2', 'Let my prayer be directed as incense in thy sight; the lifting up of my hands, as evening sacrifice.'],
    cant: ['Magnificat · Luke 1:46–47', 'My soul doth magnify the Lord. And my spirit hath rejoiced in God my Saviour.'] },
  { id: 'compline', name: 'Compline', sub: 'Night Prayer', from: 20, to: 29, label: '21:00',
    psalm: ['Psalm 4:9', 'In peace in the selfsame I will sleep, and I will rest.'],
    cant: ['Nunc Dimittis · Luke 2:29–32', 'Now thou dost dismiss thy servant, O Lord, according to thy word in peace; because my eyes have seen thy salvation, which thou hast prepared before the face of all peoples: a light to the revelation of the Gentiles, and the glory of thy people Israel.'] },
];
export function currentHour(d = new Date()) {
  const h = d.getHours();
  if (h >= 20 || h < 5) return HOURS[5];
  return HOURS.find((x) => h >= x.from && h < x.to) ?? HOURS[0];
}

export type Saint = { n: string; r: string; c: string; d?: string; b: string; q?: [string, string] };
export const SAINTS: Record<string, Saint> = {
  '09-26': { n: 'Saints Cosmas and Damian', r: 'Optional Memorial · Martyrs', c: C.rubric, d: 'Died c. 303, Cyrrhus, Syria', b: 'Twin brothers and physicians who treated the sick without charging a fee, and were called the anargyroi, "the moneyless". They were martyred under Diocletian. Their names are said in the Roman Canon of the Mass.', q: ['Freely have you received, freely give.', 'Matthew 10:8'] },
  '09-27': { n: 'Saint Vincent de Paul', r: 'Memorial · Priest', c: C.white, d: '1581–1660, France', b: 'A country priest who gave his life to the poor of Paris. He founded the Congregation of the Mission and, with Saint Louise de Marillac, the Daughters of Charity.', q: ['Charity is certainly greater than any rule.', 'Saint Vincent de Paul'] },
  '09-28': { n: 'Saint Wenceslaus', r: 'Optional Memorial · Martyr', c: C.rubric, d: 'c. 907–935, Bohemia', b: 'Duke of Bohemia who governed as a Christian, cared for the poor and was murdered by his brother on the way to Mass. He is the patron of the Czech people.' },
  '09-29': { n: 'Saints Michael, Gabriel and Raphael', r: 'Feast · Archangels', c: C.white, d: 'Michaelmas', b: 'Michael defends, Gabriel announces, Raphael heals. In England this day was one of the quarter days, when rents fell due and the Michaelmas term began.', q: ['Who is like unto God?', 'The meaning of the name Michael'] },
  '09-30': { n: 'Saint Jerome', r: 'Memorial · Priest and Doctor', c: C.white, d: 'c. 342–420, Bethlehem', b: 'Scholar and ascetic who translated the Scriptures into Latin. His Vulgate stood behind the Douay-Rheims text that Ora uses.', q: ['Ignorance of Scripture is ignorance of Christ.', 'Saint Jerome'] },
  '10-01': { n: 'Saint Thérèse of Lisieux', r: 'Memorial · Virgin and Doctor', c: C.white, d: '1873–1897, Normandy', b: 'A Carmelite nun who died at twenty-four and taught the Little Way: small things done with great love. She was named a Doctor of the Church in 1997.', q: ['My vocation is love.', 'Story of a Soul'] },
  '10-02': { n: 'The Holy Guardian Angels', r: 'Memorial', c: C.white, b: 'The Church teaches that from infancy to death each human life is surrounded by the watchful care and intercession of angels (Catechism 336).' },
  '10-04': { n: 'Saint Francis of Assisi', r: 'Memorial', c: C.white, d: '1181–1226, Umbria', b: "Son of a cloth merchant who gave away everything to live in poverty. His Canticle of the Creatures gave Laudato Si' its name." },
  '10-07': { n: 'Our Lady of the Rosary', r: 'Memorial', c: C.white, b: 'Instituted after the victory at Lepanto in 1571, which Pope Pius V credited to the Rosary prayed across Christendom.' },
  '10-09': { n: 'Saint John Henry Newman', r: 'Memorial in England and Wales', c: C.white, d: '1801–1890, Birmingham', b: 'Anglican scholar received into the Catholic Church in 1845, later a cardinal. Founder of the Birmingham Oratory, canonised in 2019.', q: ['Lead, kindly Light, amid the encircling gloom.', 'John Henry Newman'] },
  '10-15': { n: 'Saint Teresa of Ávila', r: 'Memorial · Virgin and Doctor', c: C.white, d: '1515–1582, Castile', b: "Reformer of the Carmelites and teacher of mental prayer. Her Interior Castle maps the soul's journey toward God.", q: ['Let nothing disturb you. God alone suffices.', 'Saint Teresa of Ávila'] },
  '10-18': { n: 'Saint Luke', r: 'Feast · Evangelist', c: C.rubric, d: 'First century', b: 'Physician, companion of Saint Paul, and author of the Gospel and the Acts of the Apostles. His Gospel alone gives us the Magnificat and the Benedictus.' },
  '10-22': { n: 'Saint John Paul II', r: 'Optional Memorial · Pope', c: C.white, d: '1920–2005, Kraków and Rome', b: 'Pope for twenty-six years, who travelled to more than a hundred countries and wrote the Theology of the Body.', q: ['Do not be afraid. Open wide the doors for Christ.', 'Saint John Paul II'] },
  '10-28': { n: 'Saints Simon and Jude', r: 'Feast · Apostles', c: C.rubric, b: 'Two of the Twelve, remembered together because tradition holds they preached and were martyred together in Persia. Jude is the patron of hopeless causes.' },
  '11-01': { n: 'All Saints', r: 'Solemnity', c: C.white, b: 'The whole Church in heaven, known and unknown, honoured on one day. A holy day of obligation.' },
  '11-02': { n: 'All Souls', r: 'Commemoration of the Faithful Departed', c: C.violet, b: 'The Church prays for all who have died and are being purified. Throughout November Catholics pray for the dead and visit their graves.' },
};

export const ANSWERS = [
  { k: /purgator/i, q: 'What is purgatory?', a: "Purgatory is the final purification of those who die in God's grace and friendship but are still imperfectly purified. They are assured of their eternal salvation, and are cleansed so as to enter the joy of heaven. From the earliest centuries the Church has prayed for the dead, above all at Mass.", c: 'Catechism 1030–1032' },
  { k: /eucharist|real presence|transubstan|body of christ/i, q: 'Is Christ really present in the Eucharist?', a: 'Yes. In the Eucharist the body and blood, together with the soul and divinity, of our Lord Jesus Christ, and therefore the whole Christ, is truly, really and substantially contained. The Church calls the change of the bread and wine transubstantiation.', c: 'Catechism 1374–1376 · John 6:51' },
  { k: /confess|priest|absolution|penance/i, q: 'Why confess to a priest?', a: 'Christ gave the apostles the power to forgive sins: "Whose sins you shall forgive, they are forgiven them" (John 20:23). The Church exercises that power through bishops and priests. Confession reconciles the penitent with the Church as well as with God, and lets you hear forgiveness spoken aloud.', c: 'Catechism 1441–1445, 1461' },
  { k: /rosary|hail mary|mysteries/i, q: 'How do I pray the Rosary?', a: "Begin with the Sign of the Cross and the Apostles' Creed, then an Our Father, three Hail Marys and a Glory Be. Each of the five decades is one Our Father, ten Hail Marys and a Glory Be, prayed while meditating on a mystery: Joyful on Monday and Saturday, Sorrowful on Tuesday and Friday, Glorious on Wednesday and Sunday, Luminous on Thursday.", c: 'Catechism 971, 2708' },
  { k: /social|technolog|phone|laudato|dopamine/i, q: 'What does the Church say about technology?', a: 'Pope Francis warns of a "technocratic paradigm" that treats people and creation as things to be used. Technology is good when it serves the person and the common good, and harmful when it makes us its instrument. Ora is built on that distinction.', c: "Laudato Si' 106–114 · Gaudium et Spes 35" },
];

export type Mode = { id: string; name: string; len: string; mins: number | null; d: string; allow: string };
export const MODES: Mode[] = [
  { id: 'pilgrim', name: 'Pilgrim', len: '20 min', mins: 20, d: 'A gentle limit. After twenty minutes on any app, Ora offers a psalm in its place.', allow: 'Everything, with a pause for prayer.' },
  { id: 'fast', name: 'Fast', len: '2 hours', mins: 120, d: 'Only Scripture, the Hours and phone calls. Everything else waits.', allow: 'Allowed: Scripture, the Hours, calls.' },
  { id: 'hermit', name: 'Hermit', len: 'Until dawn', mins: null, d: 'The phone rests until six tomorrow morning. Calls from favourites still ring.', allow: 'Allowed: calls from favourites.' },
];
