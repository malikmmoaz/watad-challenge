/**
 * SIMULATED AI: "BOQ reader". No model is called. Text files (CSV / TXT) are
 * really parsed and matched to the catalog by keyword overlap; any other file
 * (PDF, XLSX, image) returns a fixed sample extraction. Every line carries a
 * `parsedBy` marker so the UI labels it as simulated and asks for review.
 */
import type { Material, RfqLine } from "@/domain/types";

export const BOQ_AGENT = "BOQ reader";
export const SAMPLE_BOQ_FILE = "BOQ-AlNarjis-structure-rev2.pdf";

export interface BoqExtraction {
  fileName: string;
  /** "text": rows were read from the file. "sample": fixed sample extraction for a file type we do not read. */
  mode: "text" | "sample";
  lines: RfqLine[];
  /** Rows that could not be matched to a catalog material; the contractor adds them from the catalog. */
  unmatched: string[];
}

const STOP = new Set(["mm", "cm", "kg", "bag", "bags", "x", "the", "of", "and", "for", "to", "no", "nr", "pcs", "m", "m2", "m3", "ton", "tonne", "tonnes", "grade", "supply", "deliver"]);
const ALIAS: Record<string, string> = { reinforcement: "rebar", reinforcing: "rebar", bars: "rebar", blockwork: "block", readymix: "ready-mix", wires: "wire" };

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(/[^a-z0-9.-]+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .map((t) => ALIAS[t] ?? (t.length > 3 && t.endsWith("s") ? t.slice(0, -1) : t))
    .filter((t) => t !== "" && !STOP.has(t));
}

export const lineIdFor = (materialId: string): string => `ln_${materialId.replace(/^mat_/, "")}`;

/** Best catalog match for a free-text description, or null when fewer than two keywords agree. */
export function matchMaterial(description: string, materials: Material[]): { material: Material; confidence: number } | null {
  const want = new Set(tokens(description));
  const scored = materials
    .map((material) => ({ material, score: new Set(tokens(material.name).filter((t) => want.has(t))).size }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 2) return null;
  const clear = (scored[1]?.score ?? 0) < best.score;
  const confidence = Math.min(0.97, Math.max(0.5, 0.5 + 0.12 * best.score + (clear ? 0.1 : -0.1)));
  return { material: best.material, confidence: Math.round(confidence * 100) / 100 };
}

const toLine = (material: Material, quantity: number, confidence: number, description = material.name): RfqLine => ({
  id: lineIdFor(material.id),
  materialId: material.id,
  description,
  spec: material.spec,
  quantity,
  unit: material.unit,
  parsedBy: { simulated: true, agent: BOQ_AGENT, confidence },
});

/**
 * Reads rows like `description; quantity; unit` (also comma, tab or pipe
 * separated, with an optional leading item number). Rows without a quantity
 * (headers, section titles) are skipped; rows for the same material are merged.
 */
export function parseBoqText(text: string, materials: Material[]): Pick<BoqExtraction, "lines" | "unmatched"> {
  const lines = new Map<string, RfqLine>();
  const unmatched: string[] = [];
  for (const row of text.split(/\r?\n/)) {
    const cells = row.split(/[;\t|]/.test(row) ? /[;\t|]/ : /,/).map((c) => c.trim());
    const numeric = cells.map((c, i) => ({ i, n: /^\d[\d ]*(\.\d+)?$/.test(c) ? Number(c.replace(/ /g, "")) : NaN })).filter((c) => !Number.isNaN(c.n));
    // A leading number followed by another number is the item number, not the quantity.
    const qty = numeric.length > 1 && numeric[0]!.i === 0 ? numeric[1]! : numeric[0];
    const description = cells.filter((c) => /[a-z]/i.test(c)).sort((a, b) => b.length - a.length)[0];
    if (!qty || qty.n <= 0 || !description) continue;
    const match = matchMaterial(description, materials);
    if (!match) {
      unmatched.push(description);
      continue;
    }
    const line = toLine(match.material, qty.n, match.confidence, description);
    const seen = lines.get(line.id);
    lines.set(line.id, seen ? { ...seen, quantity: seen.quantity + qty.n } : line);
  }
  return { lines: [...lines.values()], unmatched };
}

/** Fixed sample extraction: [materialId, quantity, confidence]. */
const SAMPLE_ROWS: [string, number, number][] = [
  ["mat_rebar_16", 42, 0.96],
  ["mat_rebar_12", 18, 0.94],
  ["mat_cement_opc", 1200, 0.91],
  ["mat_readymix_c30", 350, 0.88],
  ["mat_block_20", 8000, 0.71],
];

export function simulateBoqExtraction(fileName: string, text: string | null, materials: Material[]): BoqExtraction {
  if (text !== null && /\.(csv|txt|tsv)$/i.test(fileName)) {
    return { fileName, mode: "text", ...parseBoqText(text, materials) };
  }
  const byId = new Map(materials.map((m) => [m.id as string, m]));
  return {
    fileName,
    mode: "sample",
    lines: SAMPLE_ROWS.flatMap(([id, quantity, confidence]) => {
      const m = byId.get(id);
      return m ? [toLine(m, quantity, confidence)] : [];
    }),
    unmatched: ["Waterproofing membrane, 4 mm torch-applied (not in the catalog yet)"],
  };
}
