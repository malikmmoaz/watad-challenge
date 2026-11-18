import { ContractorHome } from "@/components/home/contractor-home";

/** Contractor first view: live RFQs, credit cap and the latest PO from the seeded data. */
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <ContractorHome />
    </div>
  );
}
