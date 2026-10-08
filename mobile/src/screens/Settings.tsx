import React, { useState } from 'react';
import * as Updates from 'expo-updates';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import { LatinMode, useSettings } from '../settings';
import type { Form } from '../today';
import { Eyebrow, H2, Lede, Rule } from '../components/ui';

const FORMS: { id: Form; title: string; sub: string; desc: string }[] = [
  { id: 'OF', title: 'Ordinary Form', sub: 'The Mass of Paul VI · Roman Missal of 1970',
    desc: 'The Mass celebrated in most parishes, in the language of the people. Today shows the current calendar and the lectionary readings for the day.' },
  { id: 'EF', title: 'Traditional Latin Mass', sub: 'Usus Antiquior · Roman Missal of 1962',
    desc: 'The older form of the Roman Rite. Today shows the 1962 calendar and the full proper of the Mass: Introit, Collect, Epistle, Gradual, Gospel, Offertory, Secret, Communion and Postcommunion.' },
];
const LATIN: { id: LatinMode; label: string }[] = [
  { id: 'en', label: 'English' }, { id: 'both', label: 'English and Latin' }, { id: 'la', label: 'Latin' },
];

export default function Settings({ onClose }: { onClose: () => void }) {
  const { form, setForm, latin, setLatin } = useSettings();
  const [upd, setUpd] = useState<string>('');
  const checkUpdates = async () => {
    if (!Updates.isEnabled) { setUpd('Updates are not available in this version.'); return; }
    try {
      setUpd('Checking…');
      const r = await Updates.checkForUpdateAsync();
      if (!r.isAvailable) { setUpd('Ora is up to date.'); return; }
      setUpd('Downloading the new version…');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch { setUpd('Could not check just now. Make sure you are online and try again.'); }
  };
  const built = Updates.createdAt ? Updates.createdAt.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
  return (
    <View style={st.wrap}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={st.top}>
          <Eyebrow>Settings</Eyebrow>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close settings"><Text style={st.done}>Done</Text></Pressable>
        </View>
        <H2>Which Mass do you attend?</H2>
        <Lede>Ora follows the calendar and readings of the form you choose. You can change this at any time.</Lede>
        {FORMS.map((f) => {
          const on = form === f.id;
          return (
            <Pressable key={f.id} onPress={() => setForm(f.id)} style={[st.opt, on && st.optOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <View style={[st.radio, on && st.radioOn]}>{on ? <View style={st.dot} /> : null}</View>
              <View style={{ flex: 1 }}>
                <Text style={st.optTitle}>{f.title}</Text>
                <Text style={st.optSub}>{f.sub}</Text>
                <Text style={st.optDesc}>{f.desc}</Text>
              </View>
            </Pressable>
          );
        })}
        {form === 'EF' ? (
          <>
            <Rule />
            <Eyebrow>Language of the propers</Eyebrow>
            <View style={st.seg}>
              {LATIN.map((l) => (
                <Pressable key={l.id} onPress={() => setLatin(l.id)} style={[st.segBtn, latin === l.id && st.segOn]}>
                  <Text style={[st.segText, latin === l.id && { color: C.vellum }]}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
        <Rule />
        <Eyebrow>About this version</Eyebrow>
        <Text style={st.optDesc}>{built ? `Published ${built}.` : 'The version installed with the app.'}</Text>
        <Pressable onPress={checkUpdates} style={[st.segBtn, { alignSelf: 'flex-start', marginTop: 10 }]}><Text style={st.segText}>Check for updates</Text></Pressable>
        {upd ? <Text style={[st.optDesc, { marginTop: 8 }]}>{upd}</Text> : null}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.vellum, zIndex: 20 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  done: { fontFamily: F.sc, fontSize: 16, letterSpacing: 1, color: C.rubric },
  opt: { flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: C.vellum3, padding: 16, marginBottom: 10, borderRadius: 3 },
  optOn: { borderColor: C.gold, backgroundColor: C.vellum2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  radioOn: { borderColor: C.rubric },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.rubric },
  optTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  optSub: { fontFamily: F.sc, fontSize: 12.5, letterSpacing: 0.8, color: C.rubric, marginTop: 2 },
  optDesc: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.inkSoft, marginTop: 6 },
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segBtn: { borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  segOn: { backgroundColor: C.ink },
  segText: { fontFamily: F.body, fontSize: 14, color: C.ink },
});
