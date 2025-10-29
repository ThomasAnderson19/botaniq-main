// app/details.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  FlatList,
  useWindowDimensions,
  Alert,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
// Bemærk: 'legacy'-import kan give issues i nyere Expo – beholdes her for kompatibilitet med din kodebase.
import * as FileSystem from "expo-file-system/legacy";
import { PLANT_ID_API_KEY } from "./_lib/plantId";
import { usePlants } from "./_lib/plantsStore";
import { fetchFactsForPlant } from "./_lib/factsProvider";
import { useHistory } from "./_lib/historyStore";

/** -----------------------------------------------------------
 *  KONFIG
 *  Skift til 'false' for at bruge rigtige API-kald (spar credits)
 * ---------------------------------------------------------- */
const USE_FAKE_RESULTS = false;

export default function Details() {
  // refs & navigation
  const scrollRef = useRef(null);
  const router = useRouter();

  // navigation params
  const { uri, saved } = useLocalSearchParams();

  // dimensioner til galleri
  const { width } = useWindowDimensions();

  // global store (til “My Plants”)
  const { addPlant } = usePlants();

  // historik-store (til “Recent Scans”)
  const { addHistory } = useHistory();

  // lokal UI-state
  const [loading, setLoading] = useState(true);
  const [ordered, setOrdered] = useState([]);          // alle forslag, sorteret efter sikkerhed
  const [currentIndex, setCurrentIndex] = useState(0); // aktuelt valg
  const [showOthers, setShowOthers] = useState(false); // vis/skjul alternativer
  const [active, setActive] = useState(0);             // pager-dot for galleri
  const [facts, setFacts] = useState(null);            // “Quick Facts” data
  const [factsLoading, setFactsLoading] = useState(false);

  /** -----------------------------------------------------------
   *  Aflæs gemt plante (når man kommer fra /plants)
   *  - JSON i route-param 'saved' dekodes sikkert
   * ---------------------------------------------------------- */
  const savedData = useMemo(() => {
    try {
      return saved ? JSON.parse(String(saved)) : null;
    } catch {
      return null;
    }
  }, [saved]);
  const isFromSaved = !!savedData;

  /** -----------------------------------------------------------
   *  Tilføj den aktuelle plante til “My Plants”
   * ---------------------------------------------------------- */
  const onAddToMyPlants = () => {
    const current = ordered[currentIndex];
    if (!current) return;

    // brug første galleri-billede eller den oprindelige URI
    const heroImage = (current.gallery && current.gallery[0]) || String(uri);

    const didSave = addPlant({
      name: current.details?.common_names?.[0] || current.label,
      sci: current.sci || current.label,
      confidence: current.confidence ?? 0,
      image: heroImage,
      details: current.details || null,
      facts: facts || null, // gem evt. hentede facts
      savedAt: Date.now(),
    });

    if (didSave) {
      Alert.alert("Saved", "Added to My Plants!");
    }
  };

  /** -----------------------------------------------------------
   *  API-hjælpere til plant.id
   * ---------------------------------------------------------- */
  const createIdentification = async (imagesArray) => {
    const res = await fetch("https://plant.id/api/v3/identification", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Api-Key": PLANT_ID_API_KEY },
      body: JSON.stringify({ images: imagesArray, similar_images: true }),
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`Create ${res.status}: ${txt}`);
    return JSON.parse(txt);
  };

  const retrieveIdentification = async (token) => {
    const params = new URLSearchParams({
      details: [
        "common_names",
        "url",
        "wiki_description",
        "edible_parts",
        "watering",
        "toxicity",
      ].join(","),
      language: "en",
    }).toString();

    const res = await fetch(`https://plant.id/api/v3/identification/${token}?${params}`, {
      headers: { "Api-Key": PLANT_ID_API_KEY },
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`Retrieve ${res.status}: ${txt}`);
    return JSON.parse(txt);
  };

  /** -----------------------------------------------------------
   *  Kør identifikation (mock eller rigtigt API)
   * ---------------------------------------------------------- */
  const identify = useCallback(async () => {
    if (USE_FAKE_RESULTS) {
      // Simulerer netværkstid + mock-svar
      await new Promise((r) => setTimeout(r, 500));
      const mock = [
        {
          label: "String of Buttons",
          sci: "Curio repens",
          confidence: 0.95,
          details: {
            common_names: ["String of Buttons"],
            wiki_description: { value: "A creeping succulent with blue-green, button-like leaves." },
            edible_parts: [],
            watering: { min: 0.1, max: 0.3 },
            url: "https://en.wikipedia.org/wiki/Curio_repens",
          },
          gallery: [
            "https://images.unsplash.com/photo-1545249390-5c6f2f9c2f5d?q=80&w=1200",
            "https://images.unsplash.com/photo-1520896696177-2c17c7c47a9f?q=80&w=1200",
          ],
        },
        {
          label: "Senecio serpens",
          sci: "Senecio serpens",
          confidence: 0.78,
          details: { common_names: ["Blue Chalksticks"], wiki_description: { value: "A blue-grey succulent." } },
          gallery: ["https://images.unsplash.com/photo-1604586374968-3e2fd1f3e3f5?q=80&w=1200"],
        },
        {
          label: "Crassula perforata",
          sci: "Crassula perforata",
          confidence: 0.62,
          details: { common_names: ["String of Buttons (Crassula)"], wiki_description: { value: "Stacked leaves on columns." } },
          gallery: ["https://images.unsplash.com/photo-1501004318641-b39e6451bec6?q=80&w=1200"],
        },
      ];
      setOrdered(mock);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }

    // Valider fil-URI inden læsning
    if (!uri || !String(uri).startsWith("file://")) {
      throw new Error("Invalid file URI");
    }

    // Læs billedet som base64
    const base64 = await FileSystem.readAsStringAsync(String(uri), { encoding: "base64" });

    // 1) Opret identifikation (faldbag til data-URL, hvis 400)
    let created;
    try {
      created = await createIdentification([base64]);
    } catch (e) {
      if (String(e.message).includes("Create 400")) {
        created = await createIdentification([`data:image/jpeg;base64,${base64}`]);
      } else {
        throw e;
      }
    }

    // 2) Hent fulde resultater
    const token = created?.id || created?.access_token;
    const full = token ? await retrieveIdentification(token) : created;

    // 3) Udtræk forslag (kompatibel med begge respons-strukturer)
    const suggestions =
      full?.result?.classification?.suggestions ??
      full?.result?.is_plant?.classification?.suggestions ??
      [];

    if (!suggestions.length) {
      setOrdered([]);
      setCurrentIndex(0);
      setLoading(false);
      Alert.alert("No matches", "Try a closer, well-lit photo of a single leaf/flower.");
      return;
    }

    // 4) Map & sorter
    const mapped = suggestions
      .map((s) => ({
        label: s?.name || "Unknown",
        sci: s?.name,
        confidence: Number(s?.probability ?? 0),
        details: s?.details || null,
        gallery: (s?.similar_images || []).map((img) => img?.url).filter(Boolean),
      }))
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

    // Sørg for at der er mindst ét billede til topforslaget
    if (!mapped[0].gallery?.length && uri) mapped[0].gallery = [String(uri)];

    // --- Log i historik (kun ved ny scanning; denne kode kører ikke når man åbner fra 'saved') ---
    try {
      const top = mapped[0];
      addHistory({
        name: top.details?.common_names?.[0] || top.label,
        sci: top.sci || top.label,
        confidence: top.confidence ?? null,
        image: (top.gallery && top.gallery[0]) || (uri ? String(uri) : null),
      });
    } catch (e) {
      // bevidst stille fejl — historik må ikke blokere flowet
      console.warn("addHistory failed:", e?.message || e);
    }

    setOrdered(mapped);
    setCurrentIndex(0);
    setLoading(false);
  }, [uri, addHistory]);

  /** -----------------------------------------------------------
   *  Mount: Hydrer fra gemt eller kør ny identifikation
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (savedData) {
      // Åbnet fra “My Plants” → hydrer og spring identify() over
      const hydrated = {
        label: savedData.name || savedData.sci || "Unknown",
        sci: savedData.sci || savedData.name || "Unknown",
        confidence: Number(savedData.confidence ?? 0),
        details: savedData.details || null,
        gallery: [savedData.image].filter(Boolean),
      };

      setOrdered([hydrated]);
      setCurrentIndex(0);
      setLoading(false);

      // Vis evt. gemte facts med det samme
      setFacts(savedData.facts || null);
      return;
    }

    // Ny scanning → nulstil facts og kør identifikation
    setFacts(null);
    setLoading(true);
    identify().catch((e) => {
      setLoading(false);
      Alert.alert("Identification failed", String(e?.message || "Unknown error").slice(0, 300));
    });
  }, [identify, savedData]);

  /** -----------------------------------------------------------
   *  Afledte værdier til UI
   * ---------------------------------------------------------- */
  const current = ordered[currentIndex];
  const others = useMemo(
    () => ordered.filter((_, i) => i !== currentIndex).slice(0, 2),
    [ordered, currentIndex]
  );

  /** -----------------------------------------------------------
   *  Hent “Quick Facts”, når aktuel plante ændrer sig
   * ---------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;

    async function go() {
      if (!current) return;
      setFacts(null);
      setFactsLoading(true);
      try {
        const q =
          current?.sci ||
          current?.details?.common_names?.[0] ||
          current?.label;

        const data = await fetchFactsForPlant(q);
        if (!cancelled) setFacts(data);
      } catch {
        // Bevidst stille fejlhåndtering (UI falder bare tilbage uden facts)
      } finally {
        if (!cancelled) setFactsLoading(false);
      }
    }

    go();
    return () => { cancelled = true; };
  }, [current?.sci, current?.details?.common_names?.[0], current?.label]);

  /** -----------------------------------------------------------
   *  Små helpers til labels/badges
   * ---------------------------------------------------------- */
  const percent = (n) => `${Math.round((Number(n) || 0) * 100)}%`;

  const careBadge = (d) => {
    if (!d?.watering) return "Moderate Care";
    const avg = ((d.watering.min ?? 0.5) + (d.watering.max ?? 0.5)) / 2;
    return avg <= 0.25 ? "Easy Care" : avg <= 0.55 ? "Moderate Care" : "Thirsty";
  };

  const edibleBadge = (d) => (d?.edible_parts?.length ? "Edible" : "Not edible");

  const floweringBadge = (d) =>
    d?.wiki_description?.value?.toLowerCase?.().includes("flower") ? "Flowering" : "Foliage";

  // Galleri & pager
  const gallery = current?.gallery || [];
  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setActive(i);
  };

  // Vælg alternativt forslag som aktivt
  const promote = (option) => {
    const idx = ordered.findIndex((x) => x.label === option.label);
    if (idx >= 0) {
      setCurrentIndex(idx);
      setShowOthers(false);
      setActive(0);
    }
  };

  // Tilbage-knap: hop til topforslag først, ellers router.back()
  const onBackPress = () => {
    if (currentIndex !== 0) {
      setCurrentIndex(0);
      setShowOthers(false);
    } else {
      router.back();
    }
  };

  // Udled “Learn more”-URL og kort beskrivelse
  const learnUrl = current?.details?.url || facts?.wikiUrl || null;
  const descText = current?.details?.wiki_description?.value || facts?.wikiSummary || null;

  return (
    <View style={styles.fill}>
      {/* Øverste bar (sikker zone til statusbar) */}
      <SafeAreaView style={styles.topBar}>
        <Pressable onPress={onBackPress} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color="#2c7a4b" />
        </Pressable>

        {!isFromSaved && <Text style={styles.topTitle}>Result</Text>}

        {/* Home-knap (øverste højre) */}
        <Pressable
          onPress={() => router.replace("/")} // brug .push("/") hvis du vil bevare historikken
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go to Home"
        >
          <Ionicons name="home-outline" size={22} color="#2c7a4b" />
        </Pressable>
      </SafeAreaView>

      {/* Hovedindhold */}
      {loading ? (
        // Loader-state
        <View style={[styles.fill, styles.center]}>
          <ActivityIndicator />
          <Text style={{ color: "#215a37", marginTop: 8 }}>Identifying…</Text>
        </View>
      ) : !current ? (
        // Tomt-state (ingen forslag)
        <View style={[styles.fill, styles.center]}>
          <Text style={{ color: "#215a37" }}>No result</Text>
        </View>
      ) : (
        // Resultatvisning
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Swipebart galleri */}
          <View style={{ width: "100%" }}>
            <FlatList
              data={gallery}
              keyExtractor={(u, i) => `${i}-${u}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onScrollEnd}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={[styles.hero, { width }]} />
              )}
            />
            <View style={styles.dotsRow}>
              {gallery.map((_, i) => (
                <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* Info-sektion */}
          <View style={styles.info}>
            <Text style={styles.plantName}>
              {current.details?.common_names?.[0] || current.label}
            </Text>
            <Text style={styles.sciName}>{current.sci || current.label}</Text>

            {!isFromSaved && (
              <View style={styles.confRow}>
                <Text style={styles.confLabel}>Confidence</Text>
                <Text style={styles.confValue}>{percent(current.confidence)}</Text>
              </View>
            )}

            <View style={styles.chips}>
              <Chip icon="leaf" label={careBadge(current.details)} />
              <Chip icon="restaurant" label={edibleBadge(current.details)} />
              <Chip icon="flower" label={floweringBadge(current.details)} />
            </View>

            {!!descText && (
              <Text style={styles.desc} numberOfLines={4}>
                {descText}
              </Text>
            )}

            <View style={styles.ctaRow}>
              {!isFromSaved && (
                <Pressable style={styles.addBtn} onPress={onAddToMyPlants}>
                  <Ionicons name="pricetag" size={18} color="#fff" />
                  <Text style={styles.addText}>Add to My Plants</Text>
                </Pressable>
              )}

              {learnUrl ? (
                <Pressable
                  onPress={() => Linking.openURL(learnUrl)}
                  style={styles.linkBtn}
                >
                  <Ionicons name="open-outline" size={18} color="#2c7a4b" />
                  <Text style={styles.linkBtnText}>Learn more</Text>
                </Pressable>
              ) : null}
            </View>

            {others.length > 0 && (
              <Pressable
                onPress={() => {
                  setShowOthers((s) => !s);
                  // Scroll en anelse efter render, så alternativer kommer i fokus
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 200);
                }}
                style={{ marginTop: 20 }}
              >
                <Text style={styles.linkBtnText}>
                  {showOthers ? "Hide alternatives" : "Not your plant?"}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Quick Facts */}
          {(factsLoading || facts) && (
            <View style={styles.qfWrap}>
              <View style={styles.qfHeaderRow}>
                <Text style={styles.qfTitle}>Quick Facts</Text>
                <Ionicons name="ellipsis-horizontal" size={18} color="rgba(33,90,55,0.6)" />
              </View>

              {factsLoading ? (
                <View style={[styles.qfCard, styles.qfRowCenter]}>
                  <ActivityIndicator />
                  <Text style={{ color: "rgba(33,90,55,0.9)", marginLeft: 8 }}>Fetching facts…</Text>
                </View>
              ) : (
                <>
                  {(facts?.toxicityHumans || facts?.toxicityPets) && (
                    <FactRow
                      icon="warning-outline"
                      label={
                        facts.toxicityHumans && facts.toxicityPets
                          ? "Toxic when eaten (Humans & Pets)"
                          : facts.toxicityHumans
                          ? "Toxic when eaten (Humans)"
                          : "Toxic when eaten (Pets)"
                      }
                      big
                    />
                  )}

                  <View style={styles.qfGrid}>
                    {facts?.sun && <FactTile icon="sunny-outline" text={facts.sun} />}
                    {(facts?.tempMinC || facts?.tempMaxC) && (
                      <FactTile
                        icon="thermometer-outline"
                        text={`${facts?.tempMinC || "?"} - ${facts?.tempMaxC || "?"}`}
                      />
                    )}
                    {facts?.waterFrequency && (
                      <FactTile icon="water-outline" text={facts.waterFrequency} />
                    )}
                  </View>

                  {facts?.toxicityHumans && (
                    <FactListRow title="Toxicity to Humans" subtitle={facts.toxicityHumans} />
                  )}
                  {facts?.toxicityPets && (
                    <FactListRow title="Toxicity to Pets" subtitle={facts.toxicityPets} />
                  )}
                  {facts?.weedPotential && (
                    <FactListRow title="Weed Potential" subtitle={facts.weedPotential} />
                  )}
                  {facts?.distribution && (
                    <FactListRow title="Distribution" subtitle={facts.distribution} />
                  )}
                  {facts?.plantType && (
                    <FactListRow title="Plant Type" subtitle={facts.plantType} />
                  )}
                </>
              )}
            </View>
          )}

          {/* Alternativer */}
          {showOthers && others.length > 0 && (
            <View style={styles.altWrap}>
              {others.map((opt, idx) => (
                <Pressable key={idx} style={styles.altCard} onPress={() => promote(opt)}>
                  <Image
                    source={{ uri: opt.gallery?.[0] || gallery?.[0] || String(uri) }}
                    style={styles.altImg}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.altTitle} numberOfLines={1}>
                      {opt.details?.common_names?.[0] || opt.label}
                    </Text>
                    <Text style={styles.altSub} numberOfLines={1}>
                      {opt.sci || opt.label}
                    </Text>
                  </View>
                  <Text style={styles.altPct}>{percent(opt.confidence)}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

/* -------------------------------------------------------------
 *  Små præsentationskomponenter
 * ------------------------------------------------------------*/
function Chip({ icon, label }) {
  return (
    <View style={chipStyles.wrap}>
      <Ionicons name={icon} size={14} color="#2c7a4b" style={{ marginRight: 6 }} />
      <Text style={chipStyles.text}>{label}</Text>
    </View>
  );
}

function FactRow({ icon, label, big }) {
  return (
    <View style={[styles.qfCard, big && { paddingVertical: 14 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name={icon} size={18} color="#e2574c" />
        <Text style={[styles.qfRowText, big && { fontWeight: "800" }]}>{label}</Text>
      </View>
    </View>
  );
}

function FactTile({ icon, text, cta, onPress }) {
  return (
    <View style={styles.qfTile}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Ionicons name={icon} size={18} color="#2c7a4b" />
        <Text style={styles.qfTileText}>{text}</Text>
      </View>
      {cta ? (
        <Pressable onPress={onPress} style={styles.qfCta}>
          <Text style={styles.qfCtaText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FactListRow({ title, subtitle }) {
  return (
    <View style={styles.qfListRow}>
      <Text style={styles.qfListTitle}>{title}</Text>
      <Text style={styles.qfListSub}>{subtitle}</Text>
    </View>
  );
}

/* -------------------------------------------------------------
 *  Styles (natur-tema)
 * ------------------------------------------------------------*/
const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#e9f7ef" },
  scroll: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { color: "#215a37", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.18)",
    shadowColor: "#215a37",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  content: { paddingTop: 125, paddingHorizontal: 16, paddingBottom: 28, gap: 16 },

  hero: {
    height: undefined,
    aspectRatio: 4 / 3,
    borderRadius: 18,
    backgroundColor: "#e6f3ec",
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.12)",
  },

  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(33,90,55,0.25)" },
  dotActive: { backgroundColor: "#2c7a4b" },

  info: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
    shadowColor: "#215a37",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  plantName: { color: "#1f4d31", fontSize: 24, fontWeight: "800", letterSpacing: 0.2 },
  sciName: { color: "rgba(33,90,55,0.7)", fontStyle: "italic" },

  confRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  confLabel: { color: "rgba(33,90,55,0.75)" },
  confValue: { color: "#1f4d31", fontWeight: "900" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },

  desc: { color: "rgba(33,90,55,0.9)", marginTop: 8, lineHeight: 20 },

  ctaRow: { flexDirection: "row", gap: 12, marginTop: 12, alignItems: "center" },
  addBtn: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#2c7a4b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    shadowColor: "#2c7a4b",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  addText: { color: "#fff", fontWeight: "800" },

  linkBtn: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.22)",
    backgroundColor: "rgba(44,122,75,0.08)",
  },
  linkBtnText: { color: "#2c7a4b", fontWeight: "700" },

  // Quick Facts
  qfWrap: { gap: 10, marginTop: 6 },
  qfHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  qfTitle: { color: "#1f4d31", fontSize: 18, fontWeight: "800", letterSpacing: 0.2 },

  qfCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qfRowCenter: { justifyContent: "flex-start" },
  qfRowText: { color: "#1f4d31", fontWeight: "700" },

  qfGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  qfTile: {
    flexBasis: "48%",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
  },
  qfTileText: { color: "#1f4d31", fontWeight: "700" },
  qfCta: {
    marginTop: 10,
    backgroundColor: "rgba(44,122,75,0.1)",
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.22)",
  },
  qfCtaText: { color: "#2c7a4b", fontWeight: "800" },

  qfListRow: {
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
    position: "relative",
  },
  qfListTitle: { color: "rgba(33,90,55,0.7)", fontSize: 12, marginBottom: 4 },
  qfListSub: { color: "#1f4d31", fontWeight: "700" },

  altWrap: { marginTop: 12, gap: 10 },
  altCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
    shadowColor: "#215a37",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  altImg: { width: 56, height: 56, borderRadius: 8, backgroundColor: "#e6f3ec" },
  altTitle: { color: "#1f4d31", fontWeight: "700" },
  altSub: { color: "rgba(33,90,55,0.7)", fontStyle: "italic", fontSize: 12 },
  altPct: { color: "#2c7a4b", fontWeight: "800" },
});

/* Opdateret chip-styling så den matcher temaet */
const chipStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(44,122,75,0.12)",
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.22)",
  },
  text: { color: "#1f4d31", fontSize: 12, fontWeight: "700" },
});
