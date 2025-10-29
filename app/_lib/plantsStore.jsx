// app/lib/plantsStore.js
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

/** -----------------------------------------------------------
 *  KONSTANTER
 *  - Nøgle til AsyncStorage (bruges til at gemme planter lokalt)
 * ---------------------------------------------------------- */
const STORAGE_KEY = "MY_PLANTS_V1";

/** -----------------------------------------------------------
 *  KONTEKST
 *  - Global tilstand for gemte planter
 * ---------------------------------------------------------- */
const PlantsCtx = createContext(null);

/** -----------------------------------------------------------
 *  PROVIDER: PlantsProvider
 *  - Indpakker appen og holder styr på gemte planter
 *  - Læsser data fra AsyncStorage og gemmer ændringer løbende
 * ---------------------------------------------------------- */
export function PlantsProvider({ children }) {
  const [plants, setPlants] = useState([]); // Liste over gemte planter
  const [loaded, setLoaded] = useState(false); // Flag: data er hentet fra storage

  /** -----------------------------------------------------------
   *  INDLÆS PLANTER VED OPSTART
   *  - Forsøger at hente gemte data fra AsyncStorage
   * ---------------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPlants(JSON.parse(raw));
      } catch (e) {
        console.warn("Load plants failed:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  /** -----------------------------------------------------------
   *  GEM PLANTER AUTOMATISK VED ÆNDRING
   *  - Skriver til AsyncStorage når listen ændres
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!loaded) return; // Undgå at gemme før første load er færdig
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plants)).catch((e) =>
      console.warn("Save plants failed:", e)
    );
  }, [plants, loaded]);

  /** -----------------------------------------------------------
   *  TILFØJ PLANTE
   *  - Undgår dubletter (samme navn og videnskabelige navn)
   * ---------------------------------------------------------- */
  const addPlant = useCallback(
    (plant) => {
      const exists = plants.some(
        (p) =>
          (p.sci || "").toLowerCase() === (plant.sci || "").toLowerCase() &&
          (p.name || "").toLowerCase() === (plant.name || "").toLowerCase()
      );

      if (exists) {
        Alert.alert("Already saved", "This plant is already in My Plants.");
        return false;
      }

      setPlants((prev) => [{ id: `${Date.now()}`, ...plant }, ...prev]);
      return true;
    },
    [plants]
  );

  /** -----------------------------------------------------------
   *  FJERN PLANTE
   *  - Filtrerer ud fra ID
   * ---------------------------------------------------------- */
  const removePlant = useCallback((id) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /** -----------------------------------------------------------
   *  RYD ALLE PLANTER
   *  - Sletter hele listen (kan evt. udvides med bekræftelse)
   * ---------------------------------------------------------- */
  const clearAll = useCallback(() => setPlants([]), []);

  /** -----------------------------------------------------------
   *  KONTEKST-VÆRDI
   *  - Gør funktioner og data tilgængelige for resten af appen
   * ---------------------------------------------------------- */
  const value = useMemo(
    () => ({ loaded, plants, addPlant, removePlant, clearAll }),
    [loaded, plants, addPlant, removePlant, clearAll]
  );

  return <PlantsCtx.Provider value={value}>{children}</PlantsCtx.Provider>;
}

/** -----------------------------------------------------------
 *  HOOK: usePlants
 *  - Bruges til at tilgå context overalt i appen
 * ---------------------------------------------------------- */
export function usePlants() {
  const ctx = useContext(PlantsCtx);
  if (!ctx) throw new Error("usePlants must be used within PlantsProvider");
  return ctx;
}
