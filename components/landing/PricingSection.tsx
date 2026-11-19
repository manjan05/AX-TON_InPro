// 기획안 7장 요금안 (부가세 별도, 변리사 비용 제외). 현직자 검증으로 시간 절감 숫자가 나오면 다시 맞춘다.
// 59만 원이 싼 것(건별 15만 원)과 비싼 것(확장형 119만 원) 사이, 가운데에 오도록 배치한다.
const PLANS = [
  { name: "건별 이용", price: "15", unit: "만 원 / 1건", items: ["비정기 이용", "기본 보고서", "변리사 전달자료"], hl: false },
  { name: "기본형", price: "59", unit: "만 원 / 월", items: ["월 5건, 사용자 5명", "6단계 사건 관리", "변리사 전달자료"], hl: true },
  { name: "확장형", price: "119", unit: "만 원 / 월", items: ["월 12건, 사용자 15명", "부서별 양식·승인", "개발 단계별 재조사"], hl: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="lp-rule scroll-mt-4 px-[var(--pad)] py-24">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="lp-label">Pricing</p>
          <h2 className="lp-h-section">
            Pay for
            <br />
            Time Saved
          </h2>
        </div>
        <p className="lp-body !max-w-[380px]">
          발명 1건에 쓰는 시간을 줄인 만큼보다 싸게 받습니다. 부가세 별도, 변리사 비용 제외.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className="flex flex-col px-8 py-9"
            style={{
              background: p.hl ? "var(--crimson)" : "var(--paper-2)",
              color: p.hl ? "#fff" : "var(--ink)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold" style={{ color: p.hl ? "#fff" : "var(--crimson)" }}>
                {p.name}
              </span>
              {p.hl && <span className="bg-white px-2 py-0.5 text-[10.5px] font-bold" style={{ color: "var(--crimson)" }}>추천</span>}
            </div>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="font-[family-name:var(--font-display)] text-[56px] font-extrabold leading-none tracking-[-.03em]">{p.price}</span>
              <span className="text-[13px] font-bold opacity-80">{p.unit}</span>
            </div>
            <ul className="mt-7 flex-1 space-y-2 text-[14px]" style={{ color: p.hl ? "rgba(255,255,255,.92)" : "var(--ink-soft)" }}>
              {p.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <dl className="mt-10 grid gap-x-10 gap-y-3 text-[13.5px] sm:grid-cols-[max-content_1fr]" style={{ color: "var(--ink-soft)" }}>
        <dt className="font-bold" style={{ color: "var(--ink)" }}>6주 유료 시범</dt>
        <dd>99만 원 · 기업 1곳, 최대 5건, 기본 양식 설정</dd>
        <dt className="font-bold" style={{ color: "var(--ink)" }}>사내 설치형</dt>
        <dd>별도 견적 · 사내 PC·서버에 설치하고 AI 모델까지 사내에서 돌려, 발명 내용이 밖으로 나가지 않습니다</dd>
      </dl>
    </section>
  );
}
