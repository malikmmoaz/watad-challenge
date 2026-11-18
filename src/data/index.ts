/** Seeded sample data. Everything exported here is fictional and labelled as sample data in the UI. */
import { contractors, suppliers } from "./orgs";
import { materials } from "./materials";
import { offers, purchaseOrders, rfqs } from "./procurement";
import { creditCases, creditFacilities } from "./credit";
import type { Contractor, CreditCase, CreditFacility, Material, Offer, PurchaseOrder, Rfq, Supplier } from "@/domain/types";

export * from "./orgs";
export * from "./materials";
export * from "./procurement";
export * from "./credit";

/** Reference data: read-only, import directly. */
export interface ReferenceData {
  contractors: Contractor[];
  suppliers: Supplier[];
  materials: Material[];
}

/** Mutable demo state: read and change it through `@/store` so all three roles see the same data. */
export interface DemoState {
  rfqs: Rfq[];
  offers: Offer[];
  purchaseOrders: PurchaseOrder[];
  creditCases: CreditCase[];
  creditFacilities: CreditFacility[];
}

export const reference: ReferenceData = { contractors, suppliers, materials };

export const seedState: DemoState = { rfqs, offers, purchaseOrders, creditCases, creditFacilities };

/** The persona each role signs in as in the demo (no login). */
export const demoPersona = {
  contractor: "con_najd",
  supplier: "sup_rawasi",
  credit: "Reem Al-Harbi, Credit Manager (fictional)",
} as const;
