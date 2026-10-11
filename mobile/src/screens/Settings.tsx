import React, { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import { LatinMode, useSettings } from '../settings';
import type { Form } from '../today';
import { Eyebrow, H2, Lede, Rule } from '../components/ui';
import { askPermission, BellPrefs, bellsWork, DEFAULT_BELLS, loadBells, PRESETS, saveBells } from '../bells';
import { lockIsOn, lockSupported, setLock } from '../lock';
import type { BellPreset } from '../bells';

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
  const [bells, setBells] = useState<BellPrefs>(DEFAULT_BELLS);
  const [bellNote, setBellNote] = useState('');
  const [canLock, setCanLock] = useState(false);
  const [canRing, setCanRing] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    loadBells().then(setBells);
    bellsWork().then(setCanRing);
    lockSupported().then(setCanLock);
    lockIsOn().then(setLocked);
  }, []);
  const changeBells = async (p: Partial<BellPrefs>) => {
    const next = { ...bells, ...p };
    if (next.on && !bells.on && !(await askPermission())) {
      setBellNote('Ora needs permission to ring. You can allow notifications for Ora in your phone\'s settings.');
      return;
    }
    setBellNote('');
    setBells(next);
    try { await saveBells(next); } catch { setBellNote('The bells could not be set just now.'); }
  };
  const toggleLock = async () => {
    const ok = await setLock(!locked);
    if (ok) setLocked(!locked);
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
        <Eyebrow>Bells</Eyebrow>
        {canRing ? (
          <>
            <Text style={st.optDesc}>A soft church bell calls you to prayer. Tap it and Ora opens straight into the prayer.</Text>
            <Toggle label="Ring the bells" on={bells.on} onPress={() => changeBells({ on: !bells.on })} />
            {bells.on ? (
              <>
                {(Object.keys(PRESETS) as BellPreset[]).map((k) => {
                  const on = bells.preset === k;
                  return (
                    <Pressable key={k} onPress={() => changeBells({ preset: k })} style={[st.opt, on && st.optOn, { paddingVertical: 12 }]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                      <View style={[st.radio, on && st.radioOn]}>{on ? <View style={st.dot} /> : null}</View>
                      <View style={{ flex: 1 }}>
                        <Text style={[st.optTitle, { fontSize: 20 }]}>{PRESETS[k].label}</Text>
                        <Text style={st.optSub}>{PRESETS[k].sub}</Text>
                      </View>
                    </Pressable>
                  );
                })}
                <Toggle label="Sound" sub="Off: a silent notification" on={bells.sound} onPress={() => changeBells({ sound: !bells.sound })} />
                <Toggle label="Ring during a fast" sub="Otherwise the bells rest while you fast" on={bells.duringFast} onPress={() => changeBells({ duringFast: !bells.duringFast })} />
              </>
            ) : null}
            {bellNote ? <Text style={[st.optDesc, { color: C.rubric }]}>{bellNote}</Text> : null}
          </>
        ) : <Text style={st.optDesc}>The bells arrive with the next version of the app. Install the new build when it's ready.</Text>}
        <Rule />
        <Eyebrow>Privacy</Eyebrow>
        {canLock ? (
          <Toggle label="Lock private spaces" sub="Your Refuge record, your gratitude and My Wisdom need your fingerprint or passcode" on={locked} onPress={toggleLock} />
        ) : <Text style={st.optDesc}>Fingerprint lock arrives with the next version of the app, on phones with a fingerprint, face or passcode set up.</Text>}
        <Rule />
        <Eyebrow>About this version</Eyebrow>
        <Text style={st.optDesc}>{built ? `Published ${built}.` : 'The version installed with the app.'}</Text>
        <Pressable onPress={checkUpdates} style={[st.segBtn, { alignSelf: 'flex-start', marginTop: 10 }]}><Text style={st.segText}>Check for updates</Text></Pressable>
        {upd ? <Text style={[st.optDesc, { marginTop: 8 }]}>{upd}</Text> : null}
      </ScrollView>
    </View>
  );
}

function Toggle({ label, sub, on, onPress }: { label: string; sub?: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={st.toggle} accessibilityRole="switch" accessibilityState={{ checked: on }}>
      <View style={{ flex: 1 }}>
        <Text style={st.toggleLabel}>{label}</Text>
        {sub ? <Text style={st.optSub}>{sub}</Text> : null}
      </View>
      <View style={[st.track, on && st.trackOn]}><View style={[st.knob, on && st.knobOn]} /></View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  toggleLabel: { fontFamily: F.body, fontSize: 16, color: C.ink },
  track: { width: 46, height: 28, borderRadius: 14, backgroundColor: C.vellum3, padding: 3, justifyContent: 'center' },
  trackOn: { backgroundColor: C.gold },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.inkSoft },
  knobOn: { backgroundColor: C.deep, alignSelf: 'flex-end' },
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.vellum, zIndex: 20 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  done: { fontFamily: F.sc, fontSize: 13.5, letterSpacing: 0.4, color: C.gold },
  opt: { flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: C.vellum3, padding: 16, marginBottom: 10, borderRadius: 12 },
  optOn: { borderColor: C.gold, backgroundColor: C.vellum2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  radioOn: { borderColor: C.gold },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.gold },
  optTitle: { fontFamily: F.display, fontSize: 24, color: C.ink },
  optSub: { fontFamily: F.ui, fontSize: 10.5, letterSpacing: 0.2, color: C.gold, marginTop: 2 },
  optDesc: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.inkSoft, marginTop: 6 },
  seg: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segBtn: { borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  segOn: { backgroundColor: C.ink },
  segText: { fontFamily: F.body, fontSize: 14, color: C.ink },
});
