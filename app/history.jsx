// app/history.jsx
import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useHistory } from "./_lib/historyStore";

/** -----------------------------------------------------------
 *  Recent Scans
 *  - Viser liste over seneste identifikationer
 *  - Slet enkelt eller ryd alle
 * ---------------------------------------------------------- */
export default function History() {
  const router = useRouter();
  const { items, removeHistory, clearHistory } = useHistory();

  /** -----------------------------------------------------------
   *  HANDLERS
   * ---------------------------------------------------------- */
  const goBack = () => router.back();
  const goScan = () => router.push("/scan");
  const goPlants = () => router.push("/plants");

  const confirmRemove = useCallback(
    (item) => {
      Alert.alert(
        "Remove from history?",
        `This will remove "${item.name}" from Recent Scans.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => removeHistory(item.id) },
        ],
        { cancelable: true }
      );
    },
    [removeHistory]
  );

  const confirmClearAll = useCallback(() => {
    if (!items.length) return;
    Alert.alert(
      "Clear all history?",
      "This will remove all items from Recent Scans.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Clear", style: "destructive", onPress: clearHistory },
      ]
    );
  }, [items.length, clearHistory]);

  /** -----------------------------------------------------------
   *  RENDER: Én historik-post
   * ---------------------------------------------------------- */
  const renderItem = useCallback(
    ({ item }) => {
      const date = new Date(item.identifiedAt);
      const when = isNaN(date) ? "" : date.toLocaleString();
      return (
        <View style={styles.card}>
          <Image
            source={{
              uri:
                item.image ||
                "https://via.placeholder.com/200x150.png?text=Plant",
            }}
            style={styles.cardImg}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardSub} numberOfLines={1}>
              {item.sci}
            </Text>
            {!!item.confidence && (
              <Text style={styles.cardMeta}>Confidence: {Math.round(item.confidence * 100)}%</Text>
            )}
            {!!when && <Text style={styles.cardMeta}>{when}</Text>}
          </View>

          <Pressable
            onPress={() => confirmRemove(item)}
            style={styles.trashBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.name} from history`}
            android_ripple={{ color: "rgba(44,122,75,0.15)", radius: 22, borderless: true }}
          >
            <Ionicons name="trash-outline" size={18} color="#215a37" />
          </Pressable>
        </View>
      );
    },
    [confirmRemove]
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
        {/* Topbar: tilbage-knap + titel + ryd alle */}
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color="#215a37" />
          </Pressable>

          <Text style={styles.headerTitle}>Recent Scans</Text>

          <Pressable
            onPress={confirmClearAll}
            style={[styles.iconBtn, { opacity: items.length ? 1 : 0.5 }]}
            disabled={!items.length}
            accessibilityRole="button"
            accessibilityLabel="Clear all history"
          >
            <Ionicons name="trash-bin-outline" size={18} color="#215a37" />
          </Pressable>
        </View>

        {/* Tom tilstand */}
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={64} color="#8fd0a7" />
              <Text style={styles.emptyTitle}>No recent scans</Text>
              <Text style={styles.emptySub}>
                Scan a plant to see it appear here shortly after identification.
              </Text>

              <Pressable onPress={goScan} style={styles.primaryCta}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.primaryCtaText}>Scan a plant</Text>
              </Pressable>

              <Pressable onPress={goPlants} style={styles.secondaryCta}>
                <Ionicons name="leaf-outline" size={18} color="#2c7a4b" />
                <Text style={styles.secondaryCtaText}>My Plants</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 16 }}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------------------
 *  STYLES (matcher dit natur-tema)
 * ------------------------------------------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e9f7ef" },

  // Topbar
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

  // Tom tilstand
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
  emptySub: { color: "rgba(33,90,55,0.75)", marginTop: 6, marginBottom: 14, textAlign: "center" },

  // Listekort
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
  cardMeta: { color: "rgba(33,90,55,0.7)", fontSize: 12, marginTop: 2 },

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

  // CTA'er i tom tilstand
  primaryCta: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#2c7a4b",
    borderRadius: 999,
  },
  primaryCtaText: { color: "#fff", fontWeight: "700" },
  secondaryCta: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(44,122,75,0.08)",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.22)",
  },
  secondaryCtaText: { color: "#2c7a4b", fontWeight: "700" },
});
