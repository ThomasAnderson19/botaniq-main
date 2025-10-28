// app/lib/factsProvider.js  (or app/_lib/factsProvider.js depending on your path)
const USE_FAKE_FACTS = true; // 👈 MOCKS ON

// You can ignore the key while mocking
export const PERENUAL_API_KEY = "";

// Standard shape the UI expects
function emptyFacts() {
  return {
    toxicityHumans: null,
    toxicityPets: null,
    sun: null,
    tempMinC: null,
    tempMaxC: null,
    waterFrequency: null,
    distribution: null,
    weedPotential: null,
    plantType: null,
    wikiSummary: null,
    wikiUrl: null,
  };
}

// ---- MOCK DATA (what shows in Quick Facts) ----
const MOCK = {
  toxicityHumans: "Toxic in all parts if eaten",
  toxicityPets: "Toxic to dogs & cats",
  sun: "Full sun",
  tempMinC: "5°C",
  tempMaxC: "43°C",
  waterFrequency: "Every 12 days",
  distribution: "Cultivated in Denmark",
  weedPotential: "Not considered weeds",
  plantType: "Herb",
  wikiSummary: "A creeping succulent with blue-green, button-like leaves.",
  wikiUrl: "https://en.wikipedia.org/wiki/Curio_repens",
};

// Simple helpers kept for future live mode
async function safeJson(res) {
  const txt = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${txt.slice(0, 200)}`);
  try { return JSON.parse(txt); } catch { return {}; }
}
const asRange = (v) => {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

// Live sources (won’t be used while USE_FAKE_FACTS = true)
async function perenualFacts(_q) { return null; }
async function wikipediaFacts(_q) { return null; }

function mergeFacts(...list) {
  const out = emptyFacts();
  for (const f of list) {
    if (!f) continue;
    for (const k of Object.keys(out)) {
      if (out[k] == null && f[k] != null && f[k] !== "") out[k] = f[k];
    }
  }
  return out;
}

export async function fetchFactsForPlant(nameLike) {
  if (!nameLike) return emptyFacts();

  if (USE_FAKE_FACTS) {
    // tiny delay so your loader shows
    await new Promise(r => setTimeout(r, 250));
    return { ...emptyFacts(), ...MOCK };
  }

  // (live mode – left here for later)
  const q = String(nameLike).trim();
  const [per, wik] = await Promise.allSettled([perenualFacts(q), wikipediaFacts(q)]);
  return mergeFacts(
    per.status === "fulfilled" ? per.value : null,
    wik.status === "fulfilled" ? wik.value : null
  );
}
