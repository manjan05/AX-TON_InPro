import Link from "next/link";

// 기획안 7장 요금안 (부가세 별도, 변리사 비용 제외). 현직자 검증으로 시간 절감 숫자가 나오면 다시 맞춘다.
const PLANS = [
  { name: "유료 파일럿", price: "99", unit: "만 원 / 6주", items: ["기업 1곳, 최대 5건", "기본 양식 설정", "결과 점검 미팅"], hl: false },
  { name: "기본형", price: "59", unit: "만 원 / 월", items: ["월 5건, 사용자 5명", "6단계 사건 관리", "변리사 전달자료"], hl: true },
  { name: "확장형", price: "119", unit: "만 원 / 월", items: ["월 12건, 사용자 15명", "부서별 양식·승인", "개발 단계별 재조사"], hl: false },
  { name: "로컬 설치형", price: "별도", unit: "견적", items: ["사내 PC·서버에 설치", "AI 모델까지 사내에서", "발명 내용이 밖으로 안 나감"], hl: false },
];

export function PricingSection() {
  return (
    <section id="pricing" className="lp-rule scroll-mt-4 px-[var(--pad)] py-[var(--pad)]">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="lp-label">Pricing</p>
          <h2 className="lp-h-section">
            Pay for
            <br />
            Time Saved
          </h2>
        </div>
        <p className="lp-body !max-w-[380px]">
          특허 담당자가 발명 1건에 쓰는 시간을 줄인 만큼보다 싸게 받습니다. 부가세 별도, 변리사 비용 제외.
        </p>
      </div>

      <div className="grid border sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: "var(--rule)" }}>
        {PLANS.map((p, i) => (
          <div
            key={p.name}
            className={`flex flex-col p-6 ${i > 0 ? "border-t sm:border-t-0 sm:border-l" : ""}`}
            style={{
              borderColor: "var(--rule)",
              background: p.hl ? "var(--crimson)" : "var(--paper-2)",
              color: p.hl ? "#fff" : "var(--ink)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-display)] text-[13px] font-bold uppercase tracking-[.04em]" style={{ color: p.hl ? "#fff" : "var(--crimson)" }}>
                {p.name}
              </span>
              {p.hl && <span className="bg-white px-2 py-0.5 text-[10px] font-bold" style={{ color: "var(--crimson)" }}>추천</span>}
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-display)] text-[48px] font-black leading-none tracking-[-.02em]">{p.price}</span>
              <span className="text-[13px] font-bold opacity-80">{p.unit}</span>
            </div>
            <ul className="mt-5 flex-1 space-y-1.5 text-[13px]" style={{ color: p.hl ? "rgba(255,255,255,.9)" : "var(--ink-soft)" }}>
              {p.items.map((x) => (
                <li key={x}>- {x}</li>
              ))}
            </ul>
            {p.hl && (
              <Link href="/workspace" className="mt-6 inline-flex items-center justify-between bg-white px-4 py-2.5 text-[13px] font-bold" style={{ color: "var(--crimson)" }}>
                데모 먼저 해보기 <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
        비정기 이용은 발명 1건 15만 원. 파일럿에서 전환하면 초기 설정비를 받지 않습니다.
      </p>
    </section>
  );
}
