// 6단계를 한 줄로: 동그라미가 선으로 이어지고, 단계마다 이름과 한 줄 설명만 둔다.
const STEPS = [
  { title: "발명 접수", desc: "메모를 붙여넣으면 구성과 빠진 항목 정리" },
  { title: "기술 이해·보완", desc: "빠진 내용만 발명자에게 질문" },
  { title: "선행기술 조사", desc: "범위를 좁혀 문헌을 고르고 구성별 비교" },
  { title: "특허성·사업성", desc: "특허성과 사업성을 한 장으로" },
  { title: "권리범위 설계", desc: "경쟁사 회피 시도를 보고 방향 결정" },
  { title: "출원 결정·전달", desc: "승인한 내용만 변리사에게 전달" },
];

export function WorkflowSection() {
  return (
    <section id="workflow" className="lp-rule scroll-mt-4 px-[var(--pad)] py-24">
      <h2 className="mb-16 text-[clamp(26px,3.4vw,38px)] font-extrabold leading-tight tracking-[-.03em]">발명 접수에서 변리사 전달까지의 6단계</h2>

      <ol className="relative grid gap-y-10 md:grid-cols-6 md:gap-y-0">
        {/* 동그라미를 잇는 선 (가운데 4칸 지점 사이) */}
        <span className="absolute top-6 hidden h-[2px] md:block" style={{ background: "var(--crimson)", left: "8.333%", right: "8.333%" }} aria-hidden="true" />
        {STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-5 md:flex-col md:items-center md:gap-0 md:px-3 md:text-center">
            {/* 작은 화면에서는 세로 선 */}
            {i < STEPS.length - 1 && <span className="absolute left-6 top-12 -bottom-10 w-[2px] md:hidden" style={{ background: "var(--crimson)" }} aria-hidden="true" />}
            <span
              className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full font-[family-name:var(--font-display)] text-[17px] font-bold text-white"
              style={{ background: "var(--crimson)" }}
            >
              {i + 1}
            </span>
            <div className="md:mt-5">
              <h3 className="text-[16px] font-bold leading-snug">{s.title}</h3>
              <p className="mt-1.5 max-w-[190px] text-[13.5px] leading-[1.65] md:mx-auto" style={{ color: "var(--ink-soft)" }}>
                {s.desc}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
