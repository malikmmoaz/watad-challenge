/**
 * SAMPLE DATA. Benchmark prices are illustrative, anchored to public 2026
 * market reports where noted; they are not quotes from any company.
 */
import { sar } from "@/domain/money";
import type { Material, MaterialId } from "@/domain/types";

const mat = (s: string) => s as MaterialId;
const SAMPLE = "Sample benchmark (illustrative)";

export const materials: Material[] = [
  { id: mat("mat_cement_opc"), category: "cement", name: "Ordinary Portland Cement (OPC), 50 kg bag", nameAr: "أسمنت بورتلاندي عادي", spec: "SASO GSO 1914 CEM I 42.5N", unit: "bag_50kg", benchmarkUnitPrice: sar(15.81), benchmarkSource: "Market report, May 2026 (grey cement, 50 kg bag)", brands: ["Yamama Cement", "Saudi Cement", "Yanbu Cement", "Qassim Cement", "Southern Province Cement"] },
  { id: mat("mat_cement_src"), category: "cement", name: "Sulphate-Resisting Cement (SRC), 50 kg bag", nameAr: "أسمنت مقاوم للكبريتات", spec: "SASO GSO 1914 CEM I 42.5N-SR", unit: "bag_50kg", benchmarkUnitPrice: sar(17.4), benchmarkSource: SAMPLE, brands: ["Yamama Cement", "Saudi Cement", "Yanbu Cement"] },
  { id: mat("mat_rebar_12"), category: "rebar_steel", name: "Deformed rebar 12 mm", nameAr: "حديد تسليح 12 ملم", spec: "SASO ASTM A615 Grade 60, 12 m lengths", unit: "tonne", benchmarkUnitPrice: sar(3445), benchmarkSource: "Market report, Jun 2026 (rebar average SAR 3,419/t)", brands: ["Hadeed (SABIC)", "Rajhi Steel", "Al Ittefaq Steel"] },
  { id: mat("mat_rebar_16"), category: "rebar_steel", name: "Deformed rebar 16 mm", nameAr: "حديد تسليح 16 ملم", spec: "SASO ASTM A615 Grade 60, 12 m lengths", unit: "tonne", benchmarkUnitPrice: sar(3419), benchmarkSource: "Market report, Jun 2026 (rebar average SAR 3,419/t)", brands: ["Hadeed (SABIC)", "Rajhi Steel", "Al Ittefaq Steel"] },
  { id: mat("mat_rebar_20"), category: "rebar_steel", name: "Deformed rebar 20 mm", nameAr: "حديد تسليح 20 ملم", spec: "SASO ASTM A615 Grade 60, 12 m lengths", unit: "tonne", benchmarkUnitPrice: sar(3405), benchmarkSource: "Market report, Jun 2026 (rebar average SAR 3,419/t)", brands: ["Hadeed (SABIC)", "Rajhi Steel", "Al Ittefaq Steel"] },
  { id: mat("mat_mesh_a142"), category: "rebar_steel", name: "Welded wire mesh A142", nameAr: "شبك حديد ملحوم", spec: "BS 4483 A142, 6 mm @ 200 mm, 2.4 × 4.8 m sheet", unit: "piece", benchmarkUnitPrice: sar(92), benchmarkSource: SAMPLE, brands: ["Rajhi Steel", "Al Ittefaq Steel"] },
  { id: mat("mat_readymix_c30"), category: "ready_mix", name: "Ready-mix concrete C30", nameAr: "خرسانة جاهزة C30", spec: "C30/37, OPC, 20 mm aggregate, slump 100–150 mm", unit: "m3", benchmarkUnitPrice: sar(228), benchmarkSource: SAMPLE, brands: ["Local batching plants"] },
  { id: mat("mat_readymix_c40"), category: "ready_mix", name: "Ready-mix concrete C40 (SRC)", nameAr: "خرسانة جاهزة C40", spec: "C40/50, SRC, 20 mm aggregate, pumpable", unit: "m3", benchmarkUnitPrice: sar(262), benchmarkSource: SAMPLE, brands: ["Local batching plants"] },
  { id: mat("mat_block_20"), category: "blocks_aggregates", name: "Hollow concrete block 20 cm", nameAr: "بلك خرساني مفرغ 20 سم", spec: "SASO 1012, 400 × 200 × 200 mm, load-bearing", unit: "piece", benchmarkUnitPrice: sar(2.65), benchmarkSource: SAMPLE, brands: ["Local block factories"] },
  { id: mat("mat_cable_4c16"), category: "cables_electrical", name: "LV power cable 4C × 16 mm² Cu/XLPE/PVC", nameAr: "كابل قدرة جهد منخفض", spec: "IEC 60502-1, 0.6/1 kV, copper, XLPE insulated", unit: "m", benchmarkUnitPrice: sar(58.5), benchmarkSource: SAMPLE, brands: ["Riyadh Cables", "Bahra Electric"] },
  { id: mat("mat_wire_2_5"), category: "cables_electrical", name: "Building wire 2.5 mm² (100 m roll)", nameAr: "سلك مباني 2.5 ملم", spec: "SASO IEC 60227, 450/750 V, copper, PVC", unit: "roll", benchmarkUnitPrice: sar(168), benchmarkSource: SAMPLE, brands: ["Riyadh Cables", "Bahra Electric", "alfanar"] },
  { id: mat("mat_pipe_upvc_110"), category: "pipes_plumbing", name: "uPVC drainage pipe 110 mm, 6 m", nameAr: "ماسورة صرف يو بي في سي 110 ملم", spec: "SASO 14/15 Class 4, solvent-weld socket", unit: "piece", benchmarkUnitPrice: sar(74), benchmarkSource: SAMPLE, brands: ["Amiantit"] },
  { id: mat("mat_tile_porcelain_60"), category: "finishes", name: "Porcelain floor tile 60 × 60 cm", nameAr: "بلاط بورسلان 60 × 60", spec: "ISO 13006 BIa, matt, rectified, PEI 4", unit: "m2", benchmarkUnitPrice: sar(34), benchmarkSource: SAMPLE, brands: ["Saudi Ceramics"] },
  { id: mat("mat_gypsum_12_5"), category: "finishes", name: "Gypsum board 12.5 mm, 1.2 × 2.4 m", nameAr: "ألواح جبس 12.5 ملم", spec: "ASTM C1396 regular, tapered edge", unit: "piece", benchmarkUnitPrice: sar(23.5), benchmarkSource: SAMPLE, brands: ["National Gypsum"] },
];
