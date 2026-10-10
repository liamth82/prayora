import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { C, F } from './theme';
import { load, save } from './storage';

export type Kept = { id: string; text: string; source: string; theme: string; savedAt: string };
type Draft = { text: string; source: string };

const DEFAULT_THEMES = ['Trust', 'Mercy', 'Suffering', 'Joy', 'Prayer', 'Love'];

type KeepCtx = {
  items: Kept[]; themes: string[];
  keep: (d: Draft) => void;
  remove: (id: string) => void;
  move: (id: string, theme: string) => void;
  addTheme: (t: string) => void;
  removeTheme: (t: string) => void;
};
const Ctx = createContext<KeepCtx>({ items: [], themes: DEFAULT_THEMES, keep: () => {}, remove: () => {}, move: () => {}, addTheme: () => {}, removeTheme: () => {} });
export const useKeep = () => useContext(Ctx);

/** Long-press handler props to make any text keepable. */
export function useKeepable() {
  const { keep } = useKeep();
  return useCallback((text: string, source: string) => ({
    onLongPress: () => keep({ text: text.trim(), source }),
    delayLongPress: 450,
  }), [keep]);
}

export function KeepProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Kept[]>([]);
  const [themes, setThemes] = useState<string[]>(DEFAULT_THEMES);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    load<Kept[]>('kept', []).then(setItems);
    load<string[]>('keptThemes', DEFAULT_THEMES).then(setThemes);
  }, []);

  const persist = (next: Kept[]) => { setItems(next); save('kept', next); };
  const persistThemes = (next: string[]) => { setThemes(next); save('keptThemes', next); };

  const keep = (d: Draft) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setDraft(d);
  };
  const confirm = (theme: string) => {
    if (!draft) return;
    const item: Kept = { id: String(Date.now()), text: draft.text, source: draft.source, theme, savedAt: new Date().toISOString() };
    persist([item, ...items]);
    setDraft(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setToast(`Kept in ${theme}`);
    setTimeout(() => setToast(null), 1800);
  };
  const remove = (id: string) => persist(items.filter((i) => i.id !== id));
  const move = (id: string, theme: string) => persist(items.map((i) => (i.id === id ? { ...i, theme } : i)));
  const addTheme = (t: string) => { const v = t.trim(); if (v && !themes.includes(v)) persistThemes([...themes, v]); };
  const removeTheme = (t: string) => {
    persistThemes(themes.filter((x) => x !== t));
    persist(items.map((i) => (i.theme === t ? { ...i, theme: 'Unsorted' } : i)));
  };

  return (
    <Ctx.Provider value={{ items, themes, keep, remove, move, addTheme, removeTheme }}>
      {children}
      <Modal visible={!!draft} transparent animationType="fade" onRequestClose={() => setDraft(null)} statusBarTranslucent>
        {draft ? <KeepSheet draft={draft} themes={themes} onPick={confirm} onAddTheme={addTheme} onCancel={() => setDraft(null)} /> : null}
      </Modal>
      {toast ? <View style={st.toast} pointerEvents="none"><Text style={st.toastText}>{toast}</Text></View> : null}
    </Ctx.Provider>
  );
}

function KeepSheet({ draft, themes, onPick, onAddTheme, onCancel }: { draft: Draft; themes: string[]; onPick: (t: string) => void; onAddTheme: (t: string) => void; onCancel: () => void }) {
  const [newTheme, setNewTheme] = useState('');
  return (
    <View style={st.scrim}>
      <Pressable style={{ flex: 1 }} onPress={onCancel} accessibilityLabel="Cancel" />
      <View style={st.sheet}>
        <Text style={st.sheetHead}>KEEP IN MY WISDOM</Text>
        <ScrollView style={{ maxHeight: 180 }}>
          <Text style={st.quote}>“{draft.text}”</Text>
          <Text style={st.src}>{draft.source}</Text>
        </ScrollView>
        <Text style={[st.sheetHead, { marginTop: 14 }]}>CHOOSE A THEME</Text>
        <View style={st.chips}>
          {themes.map((t) => (
            <Pressable key={t} onPress={() => onPick(t)} style={({ pressed }) => [st.chip, pressed && { backgroundColor: C.ink }]}>
              {({ pressed }) => <Text style={[st.chipText, pressed && { color: C.vellum }]}>{t}</Text>}
            </Pressable>
          ))}
        </View>
        <View style={st.newRow}>
          <TextInput value={newTheme} onChangeText={setNewTheme} placeholder="New theme…" placeholderTextColor={C.inkFaint} style={st.input}
            returnKeyType="done" onSubmitEditing={() => { if (newTheme.trim()) { onAddTheme(newTheme); onPick(newTheme.trim()); } }} />
          <Pressable onPress={() => { if (newTheme.trim()) { onAddTheme(newTheme); onPick(newTheme.trim()); } }} style={st.addBtn}>
            <Text style={st.addText}>Add</Text>
          </Pressable>
        </View>
        <Pressable onPress={onCancel} style={{ alignSelf: 'center', padding: 10 }}><Text style={st.cancel}>Cancel</Text></Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,7,10,0.6)', zIndex: 50 },
  sheet: { backgroundColor: C.vellum, borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingBottom: 34, borderTopWidth: 3, borderColor: C.gold },
  sheetHead: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 1.6, color: C.rubric, marginBottom: 8 },
  quote: { fontFamily: F.displayItalic, fontSize: 21, lineHeight: 28, color: C.ink },
  src: { fontFamily: F.sc, fontSize: 10.5, letterSpacing: 0.6, color: C.inkFaint, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontFamily: F.body, fontSize: 14.5, color: C.ink },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: C.vellum3, backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontFamily: F.body, fontSize: 15, color: C.ink },
  addBtn: { backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1, color: C.vellum },
  cancel: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1, color: C.inkSoft },
  toast: { position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: C.ink, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, zIndex: 60 },
  toastText: { fontFamily: F.body, fontSize: 14, color: C.vellum },
});
