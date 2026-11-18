import { CreditQueue } from "@/components/credit/manager/queue";
import { PageHeader, SampleDataLabel } from "@/components/ui";
import { demoPersona } from "@/data";

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Credit applications"
        status={<SampleDataLabel />}
        meta={`Independent credit manager: ${demoPersona.credit}. Agents prepare the file; you decide.`}
      />
      <CreditQueue />
    </div>
  );
}
