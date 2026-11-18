import type { City, MaterialCategory, Unit } from "@/domain/types";

export const UNIT_LABELS: Record<Unit, string> = {
  bag_50kg: "bags (50 kg)",
  tonne: "tonnes",
  m3: "m³",
  m: "m",
  m2: "m²",
  roll: "rolls",
  piece: "pieces",
};

export const CATEGORY_LABELS: Record<MaterialCategory, string> = {
  cement: "Cement",
  rebar_steel: "Rebar & steel",
  ready_mix: "Ready-mix concrete",
  cables_electrical: "Cables & electrical",
  pipes_plumbing: "Pipes & plumbing",
  finishes: "Finishes",
  blocks_aggregates: "Blocks & aggregates",
};

export const CITIES: City[] = ["Riyadh", "Jeddah", "Dammam", "Jubail", "Makkah", "Madinah", "Tabuk"];
