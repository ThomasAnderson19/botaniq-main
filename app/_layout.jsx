// app/_layout.jsx
import { Stack } from "expo-router";
import { PlantsProvider } from "./_lib/plantsStore";
import { HistoryProvider } from "./_lib/historyStore";

export default function RootLayout() {
  return (
    <HistoryProvider>
      <PlantsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
          }}
        />
      </PlantsProvider>
    </HistoryProvider>
  );
}
