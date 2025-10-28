// app/lib/plantsStore.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

const KEY = "MY_PLANTS_V1";

const PlantsCtx = createContext(null);

export function PlantsProvider({ children }) {
  const [plants, setPlants] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // ---- load on start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setPlants(JSON.parse(raw));
      } catch (e) {
        console.warn("Load plants failed:", e);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  // ---- persist on change
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(KEY, JSON.stringify(plants)).catch((e) =>
      console.warn("Save plants failed:", e)
    );
  }, [plants, loaded]);

  const addPlant = useCallback((plant) => {
    // Avoid obvious duplicates (same sci name and common name)
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
  }, [plants]);

  const removePlant = useCallback((id) => {
    setPlants((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => setPlants([]), []);

  const value = useMemo(
    () => ({ loaded, plants, addPlant, removePlant, clearAll }),
    [loaded, plants, addPlant, removePlant, clearAll]
  );

  return <PlantsCtx.Provider value={value}>{children}</PlantsCtx.Provider>;
}

export function usePlants() {
  const ctx = useContext(PlantsCtx);
  if (!ctx) throw new Error("usePlants must be used within PlantsProvider");
  return ctx;
}
