import { SupplierHome } from "@/components/home/supplier-home";

/** Supplier first view: requests matched to this supplier and their record. */
export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <SupplierHome />
    </div>
  );
}
