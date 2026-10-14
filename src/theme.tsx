import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors } from "./themePalette";
export type { Palette } from "./themePalette";
const storageKey = "keep.appearance.v1";
const ThemeContext = createContext({ colors: lightColors, dark: false, setDark: (_dark: boolean) => {} });
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDarkState] = useState(false);
  const changed = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey).then(value => {
      if (active && !changed.current) setDarkState(value === "dark");
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const setDark = useCallback((value: boolean) => {
    changed.current = true;
    setDarkState(value);
    writes.current = writes.current.then(() => AsyncStorage.setItem(storageKey, value ? "dark" : "light")).catch(() => {});
  }, []);
  const value = useMemo(() => ({ colors: dark ? darkColors : lightColors, dark, setDark }), [dark, setDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
