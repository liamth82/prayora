import React, { createContext, useContext, useEffect, useState } from 'react';
import { load, save } from './storage';
import type { Form } from './today';

export type LatinMode = 'en' | 'both' | 'la';
type Settings = { form: Form; latin: LatinMode; setForm: (f: Form) => void; setLatin: (l: LatinMode) => void };

const Ctx = createContext<Settings>({ form: 'OF', latin: 'en', setForm: () => {}, setLatin: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [form, setFormS] = useState<Form>('OF');
  const [latin, setLatinS] = useState<LatinMode>('en');
  useEffect(() => {
    load<Form>('form', 'OF').then(setFormS);
    load<LatinMode>('latin', 'en').then(setLatinS);
  }, []);
  const setForm = (f: Form) => { setFormS(f); save('form', f); };
  const setLatin = (l: LatinMode) => { setLatinS(l); save('latin', l); };
  return <Ctx.Provider value={{ form, latin, setForm, setLatin }}>{children}</Ctx.Provider>;
}

export const useSettings = () => useContext(Ctx);
