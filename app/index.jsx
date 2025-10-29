// app/index.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const BUTTON_SIZE = 180;

export default function Home() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [infoOpen, setInfoOpen] = useState(false);

  /** -----------------------------------------------------------
   *  ANIMATION: Pulserende glød bag Scan-knappen
   * ---------------------------------------------------------- */
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulse]);

  const glowStyle = {
    transform: [
      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
    ],
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
  };

  /** -----------------------------------------------------------
   *  NAVIGATION
   * ---------------------------------------------------------- */
  const onPressScan = () => router.push("/scan");
  const onPressPlants = () => router.push("/plants");
  const onPressHistory = () => router.push("/history"); // You can create this later

  return (
    <View style={styles.container}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Blød naturbaggrund med gradient */}
      <LinearGradient
        colors={["#e9f7ef", "#d6f0e0", "#cbead7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Dekorative “blobs” */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.blob, styles.blobA]} />
        <View style={[styles.blob, styles.blobB]} />
        <View style={[styles.blob, styles.blobC]} />
      </View>

      {/* SafeArea for kanter */}
      <SafeAreaView style={StyleSheet.absoluteFill} edges={["left", "right"]}>
        {/* App Bar */}
        <View style={[styles.appBar, { marginTop: 8 }]}>
          <View style={styles.appTitleRow}>
            <Ionicons name="leaf" size={22} color="#2c7a4b" style={{ marginRight: 8 }} />
            <Text style={styles.appTitle}>Botaniq</Text>
          </View>

          {/* Info button */}
          <Pressable
            onPress={() => setInfoOpen((v) => !v)}
            android_ripple={{ borderless: true, radius: 22 }}
            style={({ pressed }) => [
              styles.infoButton,
              pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Open information"
            accessibilityState={{ expanded: infoOpen }}
          >
            <Ionicons
              name={infoOpen ? "help-circle" : "help"}
              size={18}
              color={infoOpen ? "#fff" : "#2c7a4b"}
            />
          </Pressable>
        </View>

        {/* Info Box */}
        {infoOpen && (
          <>
            <Pressable
              onPress={() => setInfoOpen(false)}
              style={StyleSheet.absoluteFill}
              accessibilityLabel="Close info"
            />
            <View
              style={[
                styles.infoBox,
                { top: insets.top + 66, right: 16 },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.infoPointer} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>How scanning works</Text>
                <Text style={styles.infoText}>
                  Use good, even light. Hold your camera steady and fill the frame with
                  the plant’s leaf or flower. We’ll compare it to our database and
                  suggest the best matches.
                </Text>

                <View style={styles.infoRow}>
                  <Ionicons name="sunny-outline" size={16} color="#2c7a4b" />
                  <Text style={styles.infoBullet}> Better light → better results</Text>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="leaf-outline" size={16} color="#2c7a4b" />
                  <Text style={styles.infoBullet}> Try multiple angles if unsure</Text>
                </View>

                <Pressable
                  onPress={() => setInfoOpen(false)}
                  style={({ pressed }) => [
                    styles.infoClose,
                    pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
                  ]}
                  android_ripple={{ color: "rgba(0,0,0,0.06)", radius: 120 }}
                >
                  <Text style={styles.infoCloseText}>Got it</Text>
                </Pressable>
              </View>
            </View>
          </>
        )}

        {/* Hovedindhold */}
        <View style={styles.center}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Identify plants with a scan</Text>
            <Text style={styles.subtitle}>
              Simple and beginner-friendly — better light means better matches.
            </Text>
          </View>

          {/* Stor Scan-knap */}
          <View style={styles.buttonWrap}>
            <Animated.View style={[styles.glow, glowStyle]}>
              <LinearGradient
                colors={["rgba(64,180,109,0.35)", "rgba(64,180,109,0.0)"]}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View style={styles.leafyRing} />

            <Pressable
              onPress={onPressScan}
              android_ripple={{ borderless: true, radius: Math.round(BUTTON_SIZE / 2) }}
              style={({ pressed }) => [
                styles.scanButton,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.96 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Scan a plant"
            >
              <Ionicons name="camera" size={56} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Nederste handlingslinje */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={onPressPlants}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            ]}
            android_ripple={{ color: "rgba(44,122,75,0.08)", radius: 140 }}
          >
            <Ionicons name="leaf-outline" size={22} color="#2c7a4b" />
            <Text style={styles.secondaryActionText}>My Plants</Text>
          </Pressable>

          <Pressable
            onPress={onPressHistory}
            style={({ pressed }) => [
              styles.secondaryAction,
              pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] },
            ]}
            android_ripple={{ color: "rgba(44,122,75,0.08)", radius: 140 }}
          >
            <Ionicons name="time-outline" size={22} color="#2c7a4b" />
            <Text style={styles.secondaryActionText}>Recent Scans</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

/* -------------------------------------------------------------
 *  STYLES
 * ------------------------------------------------------------*/
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e9f7ef" },

  // App bar
  appBar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
  },
  appTitleRow: { flexDirection: "row", alignItems: "center" },
  appTitle: {
    color: "#215a37",
    fontSize: 20,
    fontWeight: Platform.select({ ios: "700", android: "bold" }),
    letterSpacing: 0.3,
  },

  infoButton: {
    height: 36,
    width: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#215a37",
    shadowColor: "#000",
    shadowOpacity: Platform.select({ ios: 0.08, android: 0.1 }),
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Decorative blobs
  blob: {
    position: "absolute",
    backgroundColor: "#7cf6aaff",
    opacity: 0.3,
    borderRadius: 200,
    transform: [{ rotate: "12deg" }],
  },
  blobA: { width: 220, height: 220, top: -40, left: -60 },
  blobB: { width: 160, height: 160, top: 120, right: -50, transform: [{ rotate: "-8deg" }] },
  blobC: { width: 260, height: 260, bottom: -70, left: -40, transform: [{ rotate: "18deg" }] },

  // Info box
  infoBox: { position: "absolute", maxWidth: 320, zIndex: 20 },
  infoPointer: {
    position: "absolute",
    top: -6,
    right: 16,
    width: 12,
    height: 12,
    backgroundColor: "#fff",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(44,122,75,0.18)",
    transform: [{ rotate: "45deg" }],
  },
  infoContent: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.18)",
    shadowColor: "#000",
    shadowOpacity: Platform.select({ ios: 0.12, android: 0.18 }),
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1f4d31",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "rgba(33,90,55,0.9)",
    marginBottom: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  infoBullet: { fontSize: 14, color: "#2c7a4b" },
  infoClose: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(44,122,75,0.08)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  infoCloseText: { color: "#2c7a4b", fontWeight: "700" },

  // Center section
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  headerCopy: { alignItems: "center", marginBottom: 10, paddingHorizontal: 8 },
  title: {
    color: "#1f4d31",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  subtitle: {
    color: "rgba(33,90,55,0.8)",
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },

  buttonWrap: {
    width: BUTTON_SIZE + 64,
    height: BUTTON_SIZE + 64,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginTop: 8,
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 999, overflow: "hidden" },

  leafyRing: {
    position: "absolute",
    height: BUTTON_SIZE + 24,
    width: BUTTON_SIZE + 24,
    borderRadius: 999,
    borderWidth: 8,
    borderColor: "rgba(44,122,75,0.12)",
    shadowColor: "#2BB94F",
    shadowOpacity: Platform.select({ ios: 0.15, android: 0.2 }),
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },

  scanButton: {
    height: BUTTON_SIZE,
    width: BUTTON_SIZE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2BB94F",
    borderWidth: 6,
    borderColor: "rgba(255,255,255,0.75)",
  },

  // Bottom bar
  bottomBar: {
    paddingTop: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 10,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(44,122,75,0.18)",
  },
  secondaryActionText: {
    color: "#2c7a4b",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
