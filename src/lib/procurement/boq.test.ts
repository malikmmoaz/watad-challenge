import { describe, expect, it } from "vitest";
import { materials } from "@/data";
import { BOQ_AGENT, matchMaterial, parseBoqText, simulateBoqExtraction } from "./boq";

describe("matchMaterial", () => {
  it.each([
    ["Rebar 16mm grade 60", "mat_rebar_16"],
    ["Reinforcement bars 12 mm", "mat_rebar_12"],
    ["OPC cement 50kg bags", "mat_cement_opc"],
    ["Ready-mix concrete C30", "mat_readymix_c30"],
    ["Hollow concrete blocks 20cm", "mat_block_20"],
    ["Porcelain floor tiles 60x60", "mat_tile_porcelain_60"],
  ])("matches %s to %s", (text, id) => {
    expect(matchMaterial(text, materials)?.material.id).toBe(id);
  });

  it("returns null when nothing in the catalog fits", () => {
    expect(matchMaterial("Site office furniture", materials)).toBeNull();
    expect(matchMaterial("Waterproofing membrane 4 mm", materials)).toBeNull();
  });

  it("reports a confidence between 0.5 and 0.97", () => {
    const c = matchMaterial("Deformed rebar 16 mm", materials)!.confidence;
    expect(c).toBeGreaterThanOrEqual(0.5);
    expect(c).toBeLessThanOrEqual(0.97);
  });
});

describe("parseBoqText", () => {
  const csv = ["Item;Description;Qty;Unit", "1;Deformed rebar 16 mm;40;t", "2;OPC cement 50 kg bag;1 500;bag", "3;Scaffolding hire;3;month", "Section B - blockwork", "4;Deformed rebar 16mm;2.5;t"].join("\n");

  it("reads quantities, skips headers and the item number column", () => {
    const { lines } = parseBoqText(csv, materials);
    expect(lines.map((l) => [l.materialId, l.quantity])).toEqual([
      ["mat_rebar_16", 42.5],
      ["mat_cement_opc", 1500],
    ]);
  });

  it("takes unit and spec from the catalog and labels every line as simulated", () => {
    const [rebar] = parseBoqText(csv, materials).lines;
    expect(rebar).toMatchObject({ unit: "tonne", description: "Deformed rebar 16 mm", parsedBy: { simulated: true, agent: BOQ_AGENT } });
    expect(rebar!.spec).toContain("Grade 60");
  });

  it("reports rows it could not match", () => {
    expect(parseBoqText(csv, materials).unmatched).toEqual(["Scaffolding hire"]);
  });

  it("reads comma separated rows without an item number", () => {
    const { lines } = parseBoqText("Ready-mix concrete C30, 120, m3", materials);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ materialId: "mat_readymix_c30", quantity: 120 });
  });

  it("returns nothing for empty input", () => {
    expect(parseBoqText("", materials)).toEqual({ lines: [], unmatched: [] });
  });
});

describe("simulateBoqExtraction", () => {
  it("parses text files for real", () => {
    const r = simulateBoqExtraction("boq.csv", "Deformed rebar 12 mm;10;t", materials);
    expect(r.mode).toBe("text");
    expect(r.lines).toHaveLength(1);
  });

  it("returns the labelled sample extraction for other file types", () => {
    const r = simulateBoqExtraction("boq.pdf", null, materials);
    expect(r.mode).toBe("sample");
    expect(r.lines).toHaveLength(5);
    expect(r.lines.every((l) => l.parsedBy?.simulated === true && l.quantity > 0)).toBe(true);
    expect(new Set(r.lines.map((l) => l.id)).size).toBe(5);
    expect(r.unmatched).toHaveLength(1);
  });
});
