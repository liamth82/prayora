import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { currentHour, GLORIA, HOURS } from '../content';
import { load, save, todayKey } from '../storage';
import { C, F } from '../theme';
import { Back, Button, Eyebrow, H2, Lede, Proto, Rule } from '../components/ui';
import { useKeepable } from '../keep';

export default function Hours({ scrollTop }: { scrollTop: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const kp = useKeepable();
  const key = 'prayed:' + todayKey();
  useEffect(() => { load<string[]>(key, []).then(setDone); }, [key]);
  const cur = currentHour();

  const markDone = (id: string) => {
    const next = done.includes(id) ? done : [...done, id];
    setDone(next);
    save(key, next);
  };
  const go = (id: string | null) => { setOpen(id); scrollTop(); };

  if (open) {
    const x = HOURS.find((h) => h.id === open)!;
    return (
      <View>
        <Back label="The Hours" onPress={() => go(null)} />
        <Eyebrow>{x.sub}</Eyebrow>
        <H2>{x.name}</H2>
        <Rule />
        <Rub>Opening</Rub>
        <VR v="℣." t="O God, come to my assistance." />
        <VR v="℟." t="O Lord, make haste to help me." />
        <Text style={st.office}>{GLORIA}</Text>
        <Rub>Psalmody · {x.psalm[0]}</Rub>
        <Text style={st.office} {...kp(x.psalm[1], `${x.psalm[0]} · ${x.name}`)}>{x.psalm[1]}</Text>
        {x.cant ? (<><Rub>{x.cant[0]}</Rub><Text style={st.office} {...kp(x.cant[1], `${x.cant[0]} · ${x.name}`)}>{x.cant[1]}</Text></>) : null}
        <Text style={st.office}>{GLORIA}</Text>
        <Rub>Conclusion</Rub>
        <VR v="℣." t="Let us bless the Lord." />
        <VR v="℟." t="Thanks be to God." />
        <Button style={{ marginTop: 22 }} label={done.includes(x.id) ? 'Prayed ✓' : 'Mark as prayed'} onPress={() => markDone(x.id)} />
        <Proto>Short form for the preview. The full app follows the day's psalter.</Proto>
      </View>
    );
  }

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <View>
      <Eyebrow>Liturgy of the Hours</Eyebrow>
      <H2>Seven times a day I have given praise</H2>
      <Lede>Psalm 118:164. It is {now}; the Church is praying {cur.name}.</Lede>
      <View style={{ borderTopWidth: 1, borderColor: C.vellum3 }}>
        {HOURS.map((x) => {
          const isNow = x.id === cur.id, d = done.includes(x.id);
          return (
            <Pressable key={x.id} onPress={() => go(x.id)} style={[st.hour, isNow && { backgroundColor: 'rgba(201,168,76,0.2)' }]}>
              <Text style={st.t}>{x.label}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.n}>{x.name}</Text>
                <Text style={st.sub}>{x.sub}</Text>
              </View>
              <Text style={[st.status, d ? { color: C.green } : isNow ? { color: C.rubric } : null]}>{d ? 'Prayed' : isNow ? 'Now' : ''}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const Rub = ({ children }: { children: React.ReactNode }) => <Text style={st.rub}>{children}</Text>;
const VR = ({ v, t }: { v: string; t: string }) => (
  <Text style={st.office}><Text style={{ color: C.rubric, fontFamily: F.display }}>{v} </Text>{t}</Text>
);

const st = StyleSheet.create({
  hour: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: C.vellum3 },
  t: { width: 50, fontFamily: F.sc, fontSize: 13, color: C.inkFaint },
  n: { fontFamily: F.display, fontSize: 21, color: C.ink },
  sub: { fontFamily: F.body, fontSize: 12.5, color: C.inkSoft },
  status: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 1, color: C.inkFaint },
  rub: { fontFamily: F.sc, color: C.rubric, fontSize: 13, letterSpacing: 1, marginTop: 16, marginBottom: 2 },
  office: { fontFamily: F.body, fontSize: 16.5, lineHeight: 27, color: C.ink, marginVertical: 2 },
});
