import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, F } from '../theme';
import { useKeep } from '../keep';
import { Eyebrow, H2, Lede } from '../components/ui';

export default function Wisdom({ onClose }: { onClose: () => void }) {
  const { items, themes, move, remove, addTheme, removeTheme } = useKeep();
  const [filter, setFilter] = useState<string>('All');
  const [open, setOpen] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [newTheme, setNewTheme] = useState('');

  const allThemes = [...themes, ...(items.some((i) => i.theme === 'Unsorted') && !themes.includes('Unsorted') ? ['Unsorted'] : [])];
  const count = (t: string) => items.filter((i) => i.theme === t).length;
  const shown = filter === 'All' ? items : items.filter((i) => i.theme === filter);

  return (
    <View style={st.wrap}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View style={st.top}>
          <Eyebrow>My Wisdom</Eyebrow>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close My Wisdom"><Text style={st.done}>Done</Text></Pressable>
        </View>
        <H2>Words to keep</H2>
        <Lede>Verses and prayers you have kept. Press and hold any line of Scripture, a prayer or the propers to add it here.</Lede>

        <View style={st.chips}>
          {['All', ...allThemes].map((t) => {
            const on = filter === t;
            const custom = editing && t !== 'All' && t !== 'Unsorted';
            return (
              <Pressable key={t} onPress={() => (custom ? removeTheme(t) : setFilter(t))} style={[st.chip, on && st.chipOn, custom && { borderColor: C.rubric }]}>
                <Text style={[st.chipText, on && { color: C.vellum }]}>
                  {custom ? '× ' : ''}{t}{t === 'All' ? ` ${items.length}` : count(t) ? ` ${count(t)}` : ''}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setEditing(!editing)} style={st.editBtn}><Text style={st.edit}>{editing ? 'Finished' : 'Edit themes'}</Text></Pressable>
        </View>
        {editing ? (
          <View style={st.newRow}>
            <TextInput value={newTheme} onChangeText={setNewTheme} placeholder="Add a theme…" placeholderTextColor={C.inkFaint} style={st.input}
              onSubmitEditing={() => { addTheme(newTheme); setNewTheme(''); }} returnKeyType="done" />
            <Pressable onPress={() => { addTheme(newTheme); setNewTheme(''); }} style={st.addBtn}><Text style={st.addText}>Add</Text></Pressable>
          </View>
        ) : null}
        {editing ? <Text style={st.hint}>Tap × to remove a theme. Anything kept under it moves to Unsorted.</Text> : null}

        {shown.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyTitle}>{items.length ? `Nothing kept under ${filter} yet.` : 'Nothing kept yet.'}</Text>
            <Text style={st.emptyText}>On Today or in Scripture, press and hold a verse or a prayer, then choose a theme.</Text>
          </View>
        ) : null}

        <View style={{ gap: 14, marginTop: 8 }}>
          {shown.map((i) => (
            <View key={i.id} style={st.card}>
              <Pressable onPress={() => { setOpen(open === i.id ? null : i.id); setConfirmDel(null); }}>
                <Text style={st.quote}>“{i.text}”</Text>
                <View style={st.metaRow}>
                  <Text style={st.src}>{i.source}</Text>
                  <Text style={st.themeTag}>{i.theme}</Text>
                </View>
              </Pressable>
              {open === i.id ? (
                <View style={st.actions}>
                  <Text style={st.actHead}>MOVE TO</Text>
                  <View style={st.chips}>
                    {themes.filter((t) => t !== i.theme).map((t) => (
                      <Pressable key={t} onPress={() => { move(i.id, t); setOpen(null); }} style={st.chipSm}><Text style={st.chipSmText}>{t}</Text></Pressable>
                    ))}
                  </View>
                  {confirmDel === i.id ? (
                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, alignItems: 'center' }}>
                      <Text style={st.hint}>Remove this?</Text>
                      <Pressable onPress={() => { remove(i.id); setOpen(null); }}><Text style={[st.edit, { color: C.rubric }]}>Remove</Text></Pressable>
                      <Pressable onPress={() => setConfirmDel(null)}><Text style={st.edit}>Keep</Text></Pressable>
                    </View>
                  ) : (
                    <Pressable onPress={() => setConfirmDel(i.id)} style={{ marginTop: 10 }}><Text style={[st.edit, { color: C.rubric }]}>Remove</Text></Pressable>
                  )}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.vellum, zIndex: 20 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  done: { fontFamily: F.sc, fontSize: 13.5, letterSpacing: 0.4, color: C.gold },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: C.ink, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7 },
  chipOn: { backgroundColor: C.ink },
  chipText: { fontFamily: F.body, fontSize: 14, color: C.ink },
  editBtn: { paddingHorizontal: 6, paddingVertical: 7 },
  edit: { fontFamily: F.sc, fontSize: 11.5, letterSpacing: 1, color: C.inkSoft },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: C.vellum3, backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontFamily: F.body, fontSize: 15, color: C.ink },
  addBtn: { backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  addText: { fontFamily: F.sc, fontSize: 12, letterSpacing: 1, color: C.vellum },
  hint: { fontFamily: F.bodyItalic, fontSize: 13, color: C.inkFaint, marginTop: 8 },
  empty: { borderWidth: 1, borderColor: C.vellum3, borderStyle: 'dashed', padding: 20, marginTop: 18, borderRadius: 12 },
  emptyTitle: { fontFamily: F.display, fontSize: 22, color: C.ink },
  emptyText: { fontFamily: F.body, fontSize: 14, lineHeight: 21, color: C.inkSoft, marginTop: 6 },
  card: { borderLeftWidth: 3, borderColor: C.gold, paddingLeft: 14, paddingVertical: 4 },
  quote: { fontFamily: F.displayItalic, fontSize: 20.5, lineHeight: 28, color: C.ink },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 10 },
  src: { flex: 1, fontFamily: F.sc, fontSize: 10.5, letterSpacing: 0.6, color: C.inkFaint },
  themeTag: { fontFamily: F.sc, fontSize: 10, letterSpacing: 0.8, color: C.rubric },
  actions: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: C.vellum3 },
  actHead: { fontFamily: F.sc, fontSize: 10, letterSpacing: 1.4, color: C.inkFaint, marginBottom: 6 },
  chipSm: { borderWidth: 1, borderColor: C.vellum3, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  chipSmText: { fontFamily: F.body, fontSize: 13.5, color: C.ink },
});
