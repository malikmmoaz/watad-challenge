import type { Role } from "@/domain/types";

/**
 * In-app reviewer guide (#16): one dismissible panel per role, three steps each,
 * taken from docs/WALKTHROUGH.md. Copy owner: Noor; component: Layla.
 *
 * Rules for the copy: a step's `text` is one or two sentences (under 220
 * characters), names the exact button label in **bold**, and ends with what to
 * notice. `href` takes the reviewer to the right page; leave it out when the step
 * happens on the page the panel is shown on.
 */
export interface TourStep {
  /** Short imperative, under 40 characters. */
  title: string;
  /** What to do and what to notice. `**bold**` marks a button or link label. */
  text: string;
  /** Page to open for this step. Must be a real route or a seeded record. */
  href?: string;
  /** Link text for `href`. */
  linkLabel?: string;
}

export interface TourPanel {
  role: Role;
  /** Panel heading. */
  title: string;
  /** Who you are in this role, one sentence. */
  intro: string;
  steps: [TourStep, TourStep, TourStep];
  /** Where to go after the third step. */
  next: { label: string; href: string };
}

export interface Tour {
  /** Bump to show the guide again to reviewers who dismissed an older version. */
  version: number;
  /** localStorage key for "dismissed"; include the version. */
  storageKey: string;
  /** Top-bar link that reopens the guide on the current role. */
  restartLabel: string;
  dismissLabel: string;
  /** Shown under the steps; the full path is in the README and docs/WALKTHROUGH.md. */
  footer: string;
  panels: Record<Role, TourPanel>;
}

export const tour: Tour = {
  version: 2,
  storageKey: "watad-tour-dismissed-v2",
  restartLabel: "Restart tour",
  dismissLabel: "Hide guide",
  footer: "About 3 minutes per role. Your actions are saved in this browser and show up in the other roles; **Reset demo data** restores the samples.",
  panels: {
    contractor: {
      role: "contractor",
      title: "Reviewer guide: contractor",
      intro: "You are Najd Horizon Contracting Co., buying materials for schools and villas in Riyadh.",
      steps: [
        {
          title: "Turn a BOQ into an RFQ",
          text: "**New RFQ** → **Try the sample BOQ**. The simulated reader fills editable lines, each labelled; set site and date, **Confirm RFQ**, then **Choose suppliers** to see why each one is in or out.",
          href: "/contractor/rfq/new",
          linkLabel: "New RFQ",
        },
        {
          title: "Compare offers, pay with credit",
          text: "Compare 3 offers on landed cost incl. 15% VAT, terms and credit fit. **Choose offer** → **Pay with credit**: Murabaha markup and APR shown. ★ On Block C walls, **Use this split** saves SAR 7,705.",
          href: "/contractor/rfq/rfq_1042",
          linkLabel: "Structure package — Block C",
        },
        {
          title: "★ Print a PO and its tax invoice",
          text: "Open PO 3007: **Print / Save as PDF** gives an A4 PO with the VAT breakdown; **View tax invoice** shows INV-2026-0412 with its ZATCA Phase 1 QR code (a sample, not submitted to ZATCA).",
          href: "/contractor/po/po_3007",
          linkLabel: "PO 3007",
        },
      ],
      next: { label: "Next: the supplier who receives your RFQ", href: "/supplier" },
    },
    supplier: {
      role: "supplier",
      title: "Reviewer guide: supplier",
      intro: "You are Rawasi Building Materials Trading, a Riyadh distributor of rebar and cement.",
      steps: [
        {
          title: "★ Follow the activity bell",
          text: "The **Activity** bell in the top bar lists what the other roles just did, with an unread count and a link to each. Your inbox shows only requests you were matched to, and why.",
        },
        {
          title: "Send an offer (bid)",
          text: "Open **Villas 13 to 24** and price the lines: stock, lead time, payment terms, Made in Saudi. The total adds delivery and 15% VAT and shows where you stand against the 90-day benchmark.",
          href: "/supplier/rfq/rfq_1044",
          linkLabel: "Villas 13 to 24",
        },
        {
          title: "Deliver and get paid",
          text: "New POs wait under **Purchase orders** with your next step: **Accept purchase order** → **Mark as dispatched** → **Issue invoice**. On credit, the financier pays you directly.",
        },
      ],
      next: { label: "Next: the independent credit manager", href: "/credit" },
    },
    credit: {
      role: "credit",
      title: "Reviewer guide: credit manager",
      intro: "You work for neither buyer nor seller: you review credit applications and decide.",
      steps: [
        {
          title: "Open a file and run the checks",
          text: "Open **Hijaz Peaks Building Est.** → **Run checks (simulated AI)**: gated checks run cheapest first, SIMAH last, and each extracted field shows its confidence and source.",
          href: "/credit/cases/cc_502",
          linkLabel: "Hijaz Peaks Building Est.",
        },
        {
          title: "Read the scorecard",
          text: "Ten factors, each with why it matters and its effect on score, band and limit. The AI assist panel (simulated, labelled) checks VAT vs bank vs financials and drafts the memo.",
        },
        {
          title: "Decide, with reasons",
          text: "**Approve**, **Request more information** or **Decline**, always with the reason the contractor reads. Going against the AI proposal needs a written reason, and it is logged.",
        },
      ],
      next: { label: "Next: why we built it this way", href: "/about" },
    },
  },
};
