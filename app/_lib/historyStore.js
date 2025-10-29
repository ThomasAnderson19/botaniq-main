// app/_lib/historyStore.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** -----------------------------------------------------------
 *  KONSTANTER
 *  - Nøgle til AsyncStorage for historik
 * ---------------------------------------------------------- */
const STORAGE_KEY = "RECENT_SCANS_V1";

/** -----------------------------------------------------------
 *  KONTEKST
 * ---------------------------------------------------------- */
const HistoryCtx = createContext(null);

/** -----------------------------------------------------------
 *  PROVIDER
 *  - Holder styr på historik for scanninger
 *  - Læser/skriv til AsyncStorage
 * ---------------------------------------------------------- */
export function HistoryProvider({ children }) {
  const [items, setItems] = useState([]);  // array af historik-elementer
  const [loaded, setLoaded] = useState(false);

  // Indlæs ved start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch (e) {
        console.warn("Load history failed:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // Gem ved ændring
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch((e) =>
      console.warn("Save history failed:", e)
    );
  }, [items, loaded]);

  /** -----------------------------------------------------------
   *  addHistory
   *  - Tilføjer ny post øverst
   *  - Dedupper let på image+name for at undgå spam
   * ---------------------------------------------------------- */
  const addHistory = useCallback((entry) => {
    setItems((prev) => {
      const id = `${Date.now()}`;
      const clean = {
        id,
        name: entry.name || "Unknown",
        sci: entry.sci || entry.name || "Unknown",
        confidence: entry.confidence ?? null,
        image: entry.image || null,
        identifiedAt: Date.now(),
      };

      // simpel deduplikering: samme navn+image indenfor de sidste 10 poster
      const recent = prev.slice(0, 10);
      const isDup = recent.some(
        (p) =>
          (p.name || "").toLowerCase() === (clean.name || "").toLowerCase() &&
          (p.image || "") === (clean.image || "")
      );
      if (isDup) return prev;

      return [clean, ...prev].slice(0, 60); // cap historik (fx 60)
    });
  }, []);

  /** -----------------------------------------------------------
   *  removeHistory
   * ---------------------------------------------------------- */
  const removeHistory = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  /** -----------------------------------------------------------
   *  clearHistory
   * ---------------------------------------------------------- */
  const clearHistory = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ loaded, items, addHistory, removeHistory, clearHistory }),
    [loaded, items, addHistory, removeHistory, clearHistory]
  );

  return <HistoryCtx.Provider value={value}>{children}</HistoryCtx.Provider>;
}

/** -----------------------------------------------------------
 *  HOOK: useHistory
 * ---------------------------------------------------------- */
export function useHistory() {
  const ctx = useContext(HistoryCtx);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
