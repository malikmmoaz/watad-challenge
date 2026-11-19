# Reviewer walkthrough

**Live app:** https://watad-challenge.vercel.app · no login · about 3 minutes per role, 10 minutes for everything.

Pick a role on the landing page. The bar at the top switches role at any time and links to **About** and **How we built it**. Everything you do is saved in your browser, so an action in one role shows up in the others. **Reset demo data** (top bar) restores the samples. All companies, prices and credit files are sample data; AI results are simulated and labelled where they appear.

Each step says what to click and what to notice. **★** marks something we added beyond the brief.

---

## 1. Contractor: RFQ → offers → purchase order on credit (3 min)

You are **Najd Horizon Contracting Co.**, building schools and villas in Riyadh.

1. **Contractor** on the landing page. The workspace opens on live work: open RFQs, offers waiting, a PO in progress and your credit cap. Nothing starts empty.
2. **New RFQ** → **Try the sample BOQ**. The simulated BOQ reader turns the file into line items, each with a *Simulated AI · match %* label. Change a quantity or a spec; the estimate updates at 90-day benchmark prices incl. 15% VAT. (Or **Pick from catalog**: same form.) Set the delivery site and date → **Confirm RFQ**.
3. **Choose suppliers.** ★ An explainable shortlist: each distributor gets a score out of 100 and its reasons, with points: *stocks everything requested +20*, *delivers to Riyadh +15*, *88% on time*, *does not accept your terms*. One slot is kept for a vetted new supplier, and the suppliers left out are listed with why. Your credit cap and the Murabaha profit rate with APR sit above the list. Pick who receives it → **Send RFQ**.
4. Back to **My RFQs** → open **Structure package — Block C slabs and columns** (`rfq_1042`). **Compare offers (bids) · 3**: ★ landed cost incl. delivery and 15% VAT, coverage, lead time against your date, terms, reliability, *Made in Saudi*, price against the benchmark, and *Fits your credit cap* per offer. Open "how the score is made up" on any offer. ★ **Blind** hides supplier names until you choose.
5. **Choose offer** → **Pay with credit**. The draft shows the cap, what is already drawn, this PO, what is left, the Murabaha markup (3.0% for 60 days, 18.3% APR) and what you repay when. → **Place purchase order**. The confirmation gives the PO number, supplier, total incl. VAT, payment and what happens next.
6. ★ Open **Block C walls: rebar and blockwork** (`rfq_1045`): **Use this split** awards each line to the cheaper supplier and saves SAR 7,705.
7. **Credit cap, applications and progress**: the cap, each draw with its due date, **Repay** (the cap comes back), and **Apply for a higher cap**.
8. ★ Paperwork, Saudi style: open **PO 3007** (`/contractor/po/po_3007`, delivered and invoiced) → **Print / Save as PDF** gives an A4 purchase order with both parties' VAT numbers and the VAT breakdown; only the document prints. → **View tax invoice**: a simplified tax invoice `INV-2026-0412`, bilingual title, line items, VAT 15% and the **ZATCA Phase 1 QR code** (seller, VAT number, time, total and VAT, encoded as TLV and generated in the browser). It is clearly a sample: fictional VAT numbers, *not submitted to ZATCA*. Switch to Arabic (**ع**) and print again: the same invoice, right to left.

## 2. Supplier: inbox → offer → paid (2 min)

You are **Rawasi Building Materials Trading**, a Riyadh distributor of rebar and cement. Switch with **Supplier** in the top bar.

1. The inbox lists only requests you were matched to, and says why: *You stock rebar & steel and cement · You deliver to Riyadh*. A request you were not invited to cannot be opened.
2. Open **Villas 13 to 24: ground floor slabs** (`rfq_1044`, *Offer not sent*), or the request you sent in step 1.3 → **Your offer (bid)**: unit price per line against the 90-day benchmark, quantity you can supply, availability, brand, delivery fee, lead time, payment terms, validity and ★ *Made in Saudi*. The summary adds goods, delivery and 15% VAT and tells you where you stand against the benchmark. → **Submit offer**; it appears on the contractor's comparison at once.
3. The PO you placed in step 1.5 is under **Purchase orders** on the supplier home, marked *needs you* with its next step. Open it → **Accept purchase order** → **Mark as dispatched**. Switch to the contractor to **Confirm delivery on site**, back to the supplier for **Issue invoice** (ZATCA e-invoice reference). ★ On a credit PO the status moves to **Paid: supplier paid directly** by the financier; the contractor repays later.
4. ★ The **Activity** bell (top bar, next to **ع**) shows what the other roles did since you last looked, with an unread count. Submit an offer here, switch to the contractor: their bell shows *Rawasi Building Materials Trading sent an offer on …* with a link straight to the comparison. Each role has its own **Mark all as read**. After **Issue invoice**, **View tax invoice** opens your invoice with its ZATCA QR code.

## 3. Independent credit manager: application → decision (3 min)

The credit manager works for neither the buyer nor the seller. Switch with **Credit manager**.

1. **Credit applications**: the queue, sorted by what needs a decision, with score and band once scored.
2. Open **Hijaz Peaks Building Est.** (`cc_502`, *In assessment*) → **Run checks (simulated AI)**; the file is prepared in about 3 seconds:
   - ★ **Gated checks, cheapest first**: CR, VAT, bank, financials, SIMAH last; a failed gate stops the later ones.
   - **Documents and extracted fields**, each with its confidence; the evidence seals on a factor jump to the field it came from.
   - **Scorecard**: 10 weighted factors. Each says *why it matters* and shows its effect: what the score, band and limit would be at full marks and at zero.
   - **Proposed limit** and ★ **AI assist** (simulated, labelled): VAT vs bank vs financials consistency, tamper signals, and a drafted credit memo.
3. **Decision**: **Approve** (cap, conditions), **Request more information** (what to provide) or **Decline**, always with the reason the contractor will read. Disagreeing with the AI proposal needs a written reason, and it is logged.
4. ★ Close the loop: as the contractor, **Credit cap, applications and progress → Apply for a higher cap** (the form says why each Saudi document matters, and asks for SIMAH consent) → submit. As the credit manager, open the new case → **Run checks (simulated AI)** → **Request more information**. As the contractor, the tracker shows the request and its reason; answer it. As the credit manager, run checks again and **Approve**: the contractor sees the outcome and the new cap.

## 4. Why it is built this way (1 min)

**About** (top bar): who pays and why, priorities, stack, how AI is used (in the product and to build it), key assumptions, and the research behind the features. **How we built it**: the agent team, the process, the 24 hours and links to every issue, pull request, CI run and decision record.

---

Checked against production on 18 Nov 2026 at 1440 and 412 px, last after the redesign (`docs/BRIEF-CHECKLIST.md`, pass 4). The same journeys run on every pull request as Playwright end-to-end tests in `e2e/`.
