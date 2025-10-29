// app/plants.jsx
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Alert, // ← til bekræftelsesdialog
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePlants } from "./_lib/plantsStore";

/** -----------------------------------------------------------
 *  KONSTANTER
 *  - Fallback-billede til gemte planter uden eget billede
 * ---------------------------------------------------------- */
const PLACEHOLDER_IMG = "https://via.placeholder.com/200x150.png?text=Plant";

export default function Plants() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plants, removePlant } = usePlants();

  /** -----------------------------------------------------------
   *  SLET: Bekræft inden sletning
   * ---------------------------------------------------------- */
  const confirmRemove = useCallback(
    (plant) => {
      Alert.alert(
        "Remove plant?",
        `This will remove "${plant.name}" from My Plants.`,
        [
          // Annullér bevarer planten
          { text: "Cancel", style: "cancel" },
          // Slet kalder store-handleren
          {
            text: "Delete",
            style: "destructive",
            onPress: () => removePlant(plant.id),
          },
        ],
        { cancelable: true }
      );
    },
    [removePlant]
  );

  /** -----------------------------------------------------------
   *  RENDER: Én plante i listen
   *  - Tryk på kort (undtagen skraldespand) åbner detaljer
   * ---------------------------------------------------------- */
  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.card}>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/details",
              params: { saved: JSON.stringify(item) },
            })
          }
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${item.name}`}
        >
          <Image
            source={{ uri: item.image || PLACEHOLDER_IMG }}
            style={styles.cardImg}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.cardSub} numberOfLines={1}>{item.sci}</Text>
          </View>
        </Pressable>

        {/* Separat slet-knap så navigation ikke trigges ved tryk */}
        <Pressable
          onPress={() => confirmRemove(item)}
          style={styles.trashBtn}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.name} from My Plants`}
          android_ripple={{ color: "rgba(44,122,75,0.15)", radius: 22, borderless: true }}
        >
          <Ionicons name="trash-outline" size={18} color="#215a37" />
        </Pressable>
      </View>
    ),
    [confirmRemove, router]
  );

  /** -----------------------------------------------------------
   *  RENDER
   * ---------------------------------------------------------- */
  return (
    <View style={{ flex: 1, backgroundColor: "#e9f7ef" }}>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        {/* Topbar med tilbage-knap og titel */}
        <View style={[styles.header, { marginTop: insets.top ? 0 : 8 }]}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#215a37" />
          </Pressable>
          <Text style={styles.headerTitle}>My Plants</Text>
          {/* Spacer for visuel balance */}
          <View style={{ width: 40 }} />
        </View>

        {/* Tom-tilstand vs. liste */}
        {plants.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCard}>
              <Ionicons name="leaf" size={64} color="#8fd0a7" />
              <Text style={styles.emptyTitle}>No plants yet</Text>
              <Text style={styles.emptySub}>Scan a plant and save it here.</Text>
              <Pressable
                onPress={() => router.push("/scan")}
                style={styles.cta}
                accessibilityRole="button"
                accessibilityLabel="Scan a plant"
              >
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.ctaText}>Scan a plant</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            data={plants}
            keyExtractor={(p) => p.id}
            renderItem={renderItem}
            contentContainerStyle={{
              padding: 16,
              gap: 10,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------------------
 *  STYLES
 * ------------------------------------------------------------*/
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#215a37", fontSize: 20, fontWeight: "800" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.18)",
  },

  // Tom-tilstand (kort med call-to-action)
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyCard: {
    width: "100%",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
  },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "800", color: "#215a37" },
  emptySub: { color: "rgba(33,90,55,0.75)", marginTop: 6, marginBottom: 12 },

  // Primær CTA i tom-tilstand
  cta: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#2c7a4b",
    borderRadius: 999,
  },
  ctaText: { color: "#fff", fontWeight: "700" },

  // Plantekort i liste
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.14)",
  },
  cardImg: { width: 72, height: 56, borderRadius: 8, backgroundColor: "#e6f3ec" },
  cardTitle: { color: "#1f4d31", fontWeight: "800" },
  cardSub: { color: "rgba(33,90,55,0.7)", fontStyle: "italic", fontSize: 12 },

  // Slet-knap
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(44,122,75,0.1)",
    marginLeft: 4,
  },
});
