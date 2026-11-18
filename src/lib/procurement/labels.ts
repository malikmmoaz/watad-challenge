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

/** Singular unit names, for a quantity of exactly 1 and for "per unit" prices. */
export const UNIT_SINGULAR: Record<Unit, string> = {
  bag_50kg: "bag (50 kg)",
  tonne: "tonne",
  m3: "m³",
  m: "m",
  m2: "m²",
  roll: "roll",
  piece: "piece",
};

/** The unit name that agrees with the quantity: "1 tonne", "40 tonnes". */
export const unitLabel = (unit: Unit, quantity: number): string => (quantity === 1 ? UNIT_SINGULAR[unit] : UNIT_LABELS[unit]);

/** "1,200 bags (50 kg)", "1 tonne". */
export const formatQuantity = (quantity: number, unit: Unit): string => `${quantity.toLocaleString("en-US")} ${unitLabel(unit, quantity)}`;

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
