"use client";
import { useState } from "react";

type Actor = "연구원" | "담당자" | "승인자" | "AI";

interface Step {
  title: string;
  oneLine: string;
  input: string[];
  output: string[];
  ai: string;
  human: { who: Actor; does: string };
}

const STEPS: Step[] = [
  {
    title: "발명 접수",
    oneLine: "연구원이 쓴 메모를 그대로 붙여넣으면, InPro가 출원 검토용으로 정리합니다.",
    input: ["발명 메모·실험 메모", "외부 공개 예정일 (논문·전시 등)"],
    output: ["기술 구성 초안", "빠진 항목 목록", "공개 전 출원 D-day"],
    ai: "구성 요소를 뽑고, 출원에 필요한데 빠진 정보를 짚습니다.",
    human: { who: "연구원", does: "평소 쓰던 메모를 그대로 올립니다." },
  },
  {
    title: "기술 이해·보완",
    oneLine: "조사 전에 발명자에게 꼭 필요한 것만 묻습니다. 메일로 몇 번 오가던 일이 한 번에 끝납니다.",
    input: ["AI가 만든 보완 질문에 대한 연구원 답변"],
    output: ["보강된 기술 구성", "선행조사 검색어"],
    ai: "빠진 항목을 연구원이 바로 답할 수 있는 질문으로 바꿉니다.",
    human: { who: "연구원", does: "질문 3개 정도에 답합니다." },
  },
  {
    title: "선행기술 조사",
    oneLine: "비슷한 특허를 찾아 구성 요소마다 비교하고, 겹친 구성은 발명자에게 그 문헌 문장을 보여주며 다시 물어 차별점을 함께 찾습니다.",
    input: ["검색어 확정", "비교할 문헌 선택"],
    output: ["원문 인용이 붙은 비교표", "검색 조건 기록"],
    ai: "300건을 후보 몇 건으로 줄이고, 인용이 원문에 진짜 있는지 다시 확인합니다.",
    human: { who: "담당자", does: "비교표를 한 줄씩 확인합니다." },
  },
  {
    title: "특허성·사업성",
    oneLine: "특허가 될지뿐 아니라, 우리 사업에 얼마나 중요한지와 경쟁사가 따라 할 가능성을 같이 봅니다.",
    input: ["확인된 비교표"],
    output: ["다른 점 후보", "사업 중요도", "경쟁사 모방 가능성"],
    ai: "검토서 초안을 쓰고 출원 방식을 추천합니다. 등록 가능성은 단정하지 않습니다.",
    human: { who: "담당자", does: "초안을 읽고 고칩니다." },
  },
  {
    title: "권리범위 설계",
    oneLine: "경쟁사라면 어떻게 피할지 먼저 시도해 봅니다. 피할 수 없는 핵심과, 넓게 써야 할 대체 가능 구성을 나눠 변리사와 논의합니다.",
    input: ["검토서", "구성별 구분 조정"],
    output: ["핵심·대체 가능·부가 구분", "경쟁사 우회 수단과 난이도"],
    ai: "구성마다 경쟁사가 대신 쓸 수 있는 수단을 찾아 우회 난이도를 매깁니다.",
    human: { who: "담당자", does: "핵심 구성을 최종으로 고릅니다." },
  },
  {
    title: "출원 결정·전달",
    oneLine: "담당자가 출원 방식을 정하고 승인자가 확정하면, 승인된 버전만 묶어 변리사에게 넘깁니다.",
    input: ["출원 방식 결정", "승인"],
    output: ["변리사 전달자료 (PDF·문서)", "남은 질문 목록", "조사·승인 기록"],
    ai: "연구원 확인 사실과 AI 제안을 나눠 표기한 전달자료를 만듭니다.",
    human: { who: "승인자", does: "결정을 확인하고 승인합니다." },
  },
];

const ACTOR_COLORS: Record<Actor, string> = {
  연구원: "#374151",
  담당자: "var(--crimson)",
  승인자: "var(--crimson)",
  AI: "#6b7280",
};

export function WorkflowSection() {
  const [active, setActive] = useState(0);
  const pick = (i: number) => setActive(i);
  const s = STEPS[active];

  return (
    <section id="workflow" className="lp-rule scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-4 px-[var(--pad)] pt-[var(--pad)]">
        <h2 className="lp-h-section">
          Find the Difference,
          <br />
          Design the Right
        </h2>
      </div>

      {/* 단계 레일 */}
      <div className="px-[var(--pad)] pt-10" role="tablist" aria-label="InPro 6단계">
        <div className="relative">
          <div className="absolute top-[19px] h-px" style={{ background: "var(--rule)", left: "8.333%", right: "8.333%" }} />
          <div
            className="absolute top-[18px] h-[3px] transition-all duration-500"
            style={{ background: "var(--crimson)", left: "8.333%", width: `${(active / (STEPS.length - 1)) * 83.333}%` }}
          />
          <ol className="relative grid grid-cols-6">
            {STEPS.map((st, i) => {
              const on = i === active;
              const done = i < active;
              return (
                <li key={st.title} className="flex flex-col items-center text-center">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => pick(i)}
                    className="group flex flex-col items-center gap-2 outline-none"
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-full border font-[family-name:var(--font-display)] text-[15px] font-bold transition-all duration-300 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-[var(--crimson)]"
                      style={
                        on
                          ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)", transform: "scale(1.15)" }
                          : done
                            ? { background: "var(--paper-2)", color: "var(--crimson)", borderColor: "var(--crimson)" }
                            : { background: "var(--paper)", color: "var(--ink-mute)", borderColor: "var(--rule)" }
                      }
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-[12.5px] font-bold leading-tight max-sm:hidden"
                      style={{ color: on ? "var(--crimson)" : "var(--ink-soft)" }}
                    >
                      {st.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {/* 되돌아가는 흐름 */}
          <div className="mt-3 grid grid-cols-6 text-[10.5px] max-sm:hidden" style={{ color: "var(--ink-mute)" }}>
            <div className="col-span-1" />
            <div className="col-span-2 border-b border-l border-r border-dashed px-2 pb-1 text-center" style={{ borderColor: "var(--crimson)" }}>
              ↺ 새 선행기술이 나오면 발명자에게 다시 묻기
            </div>
          </div>
        </div>
      </div>

      {/* 선택한 단계 상세 */}
      <div className="mt-10 border-t px-[var(--pad)] pb-24 pt-14" style={{ borderColor: "var(--rule)" }}>
        <div key={active} className="lp-fade grid gap-x-20 gap-y-12 md:grid-cols-2 md:items-start">
          {/* 왼쪽: 어떤 단계인가 */}
          <div>
            <div className="mb-3 font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--crimson)" }}>
              STEP {String(active + 1).padStart(2, "0")} / 06
            </div>
            <h3 className="font-[family-name:var(--font-display)] text-[40px] font-extrabold leading-tight tracking-[-.03em]">{s.title}</h3>
            <p className="mt-5 max-w-[440px] text-[16px] leading-[1.75]" style={{ color: "var(--ink-soft)" }}>
              {s.oneLine}
            </p>
            <div className="mt-10 flex items-center gap-5 text-[14px] font-bold">
              <button type="button" onClick={() => pick((active + STEPS.length - 1) % STEPS.length)} className="transition hover:text-[var(--crimson)]" style={{ color: "var(--ink-soft)" }}>
                이전 단계
              </button>
              <span className="h-3.5 w-px" style={{ background: "var(--rule)" }} aria-hidden="true" />
              <button type="button" onClick={() => pick((active + 1) % STEPS.length)} className="transition hover:text-[var(--crimson)]" style={{ color: "var(--crimson)" }}>
                다음 단계
              </button>
            </div>
          </div>

          {/* 오른쪽: 넣는 것, 받는 것, 누가 하는가 (첫 화면 강점 목록과 같은 선 목록) */}
          <dl className="text-[14px]">
            {(
              [
                ["넣는 것", "var(--ink)", s.input],
                ["받는 것", "var(--crimson)", s.output],
                ["InPro AI", ACTOR_COLORS.AI, [s.ai]],
                [s.human.who, ACTOR_COLORS[s.human.who], [s.human.does]],
              ] as [string, string, string[]][]
            ).map(([label, color, lines]) => (
              <div key={label} className="grid grid-cols-[84px_1fr] gap-x-4 border-b py-5 first:pt-0 last:border-b-0 last:pb-0" style={{ borderColor: "var(--rule)" }}>
                <dt className="font-bold" style={{ color }}>
                  {label}
                </dt>
                <dd className="space-y-1 leading-[1.7]">
                  {lines.map((x) => (
                    <div key={x}>{x}</div>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

    </section>
  );
}
