import { describe, expect, it } from "vitest";
import { meta, pageKeyOf, pageMetadata } from "./meta";

describe("page metadata", () => {
  it("maps every route to its page, most specific first", () => {
    expect(pageKeyOf("/")).toBe("home");
    expect(pageKeyOf("/contractor")).toBe("contractor");
    expect(pageKeyOf("/contractor/rfq/new")).toBe("rfqNew");
    expect(pageKeyOf("/contractor/rfq/rfq_1042")).toBe("rfq");
    expect(pageKeyOf("/contractor/credit/apply")).toBe("creditApply");
    expect(pageKeyOf("/supplier/po/po_3011")).toBe("supplierPo");
    expect(pageKeyOf("/credit/cases/cc_502")).toBe("creditCase");
    expect(pageKeyOf("/nope")).toBeUndefined();
  });

  it("has an Arabic title and description for every page, and never says interest", () => {
    for (const [key, en] of Object.entries(meta.en)) {
      const ar = meta.ar[key as keyof typeof meta.ar];
      expect(ar.title, key).toMatch(/[؀-ۿ]/);
      expect(ar.description, key).toMatch(/[؀-ۿ]/);
      expect(en.description.toLowerCase(), key).not.toContain("interest");
      expect(ar.description, key).not.toContain("فائدة");
    }
  });

  it("gives every page the share card and the large Twitter card", () => {
    const m = pageMetadata("creditCase");
    expect(m.openGraph.images[0]).toMatchObject({ url: "/opengraph-image.png", width: 1200, height: 630 });
    expect(m.twitter.card).toBe("summary_large_image");
  });
});
