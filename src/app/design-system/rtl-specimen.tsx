import { AiLabel, Badge, Button, CreditCapMeter, DecisionStamp, Icon, Input, LeadTimeBar, ScoreScale, StatStrip, StatusTimeline, Table, Td, Th, THead, Tr } from "@/components/ui";

const sar = (n: number) => `${(n / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })} ر.س`;

/**
 * The design language in Arabic, right to left: the same components with
 * dir="rtl" lang="ar". Copy is written in Arabic, in Watad's terms
 * (عروض، حد ائتماني، أمر شراء، ربح المرابحة), not translated word for word.
 */
export function RtlSpecimen() {
  return (
    <div lang="ar" dir="rtl" className="flex flex-col gap-8 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
      <div>
        <h3 className="text-4xl font-semibold text-ink sm:text-5xl">
          من طلب عرض السعر إلى أمر الشراء،
          <span className="block font-serif text-action">بائتمانٍ تعرف مصدره.</span>
        </h3>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">منصة محايدة لمواد البناء: يتنافس الموردون بعروض قابلة للمقارنة، ويحدد مدير ائتمان مستقل الحد الائتماني، وكل رقم يدلّك على المستند الذي جاء منه.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="primary" size="lg" className="rounded-full">
            ادخل كمقاول
            <Icon name="arrow-right" />
          </Button>
          <Button size="lg" className="rounded-full">مدير الائتمان</Button>
          <AiLabel agent="قارئ جدول الكميات" confidence={0.92} />
        </div>
      </div>

      <StatStrip
        items={[
          { label: "طلبات مفتوحة", value: "4", note: "مسودات ومرسلة وبها عروض" },
          { label: "عروض للمقارنة", value: "6" },
          { label: "أوامر شراء في الطريق", value: "1" },
          { label: "المتبقي من الحد الائتماني", value: sar(131604600), compact: true, note: `من ${sar(150000000)}` },
        ]}
      />

      <Table caption="عروض طلب rfq_1042" minWidth={640}>
        <THead>
          <tr>
            <Th>المورد</Th>
            <Th align="end">التكلفة الشاملة مع الضريبة ١٥٪</Th>
            <Th>مدة التوريد</Th>
            <Th align="end">التقييم</Th>
          </tr>
        </THead>
        <tbody>
          {(
            [
              ["رواسي لتجارة مواد البناء", 56099300, 4, 96, "recommended"],
              ["سواري لتوزيع الحديد والإسمنت", 50744325, 7, 88, "default"],
              ["خليج للاستيراد", 53433600, 16, 45, "default"],
            ] as const
          ).map(([name, cost, days, score, state]) => (
            <Tr key={name} state={state}>
              <Td>
                <span className="font-medium text-ink">{name}</span>
                {state === "recommended" ? <Badge tone="positive" className="ms-2">الأفضل إجمالًا</Badge> : null}
              </Td>
              <Td align="end">{sar(cost)}</Td>
              <Td>
                <LeadTimeBar days={days} maxDays={16} requiredInDays={14} />
              </Td>
              <Td align="end" className="text-lg font-semibold">
                {score}
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <ScoreScale score={74} label="درجة الائتمان" />
          <CreditCapMeter cap={75000000} drawn={56000000} thisPo={29820000} format={sar} />
          <Input label="سعر الوحدة" suffix="ر.س / طن" defaultValue="2,485.00" hint="بدون ضريبة القيمة المضافة ١٥٪" />
        </div>
        <div className="flex flex-col gap-5">
          <StatusTimeline
            label="حالة أمر الشراء po_3007"
            steps={[
              { label: "صدر أمر الشراء", state: "done", at: "٦ نوفمبر ٢٠٢٦", actor: "المقاول" },
              { label: "قبله المورد", state: "done", at: "٦ نوفمبر ٢٠٢٦", actor: "المورد" },
              { label: "في الطريق", state: "current" },
              { label: "تم التسليم", state: "upcoming" },
            ]}
          />
          <DecisionStamp decision="approve" by="ريم الحربي، مديرة ائتمان" at="٢٧ أكتوبر ٢٠٢٦" />
        </div>
      </div>
    </div>
  );
}
