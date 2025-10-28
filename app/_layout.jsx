// app/_layout.jsx
import React from "react";
import { Stack } from "expo-router";
import { PlantsProvider } from "./_lib/plantsStore";

export default function RootLayout() {
  return (
    <PlantsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PlantsProvider>
  );
}
