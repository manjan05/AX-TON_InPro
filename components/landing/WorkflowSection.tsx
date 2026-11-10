"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type Actor = "연구원" | "담당자" | "승인자" | "AI";

interface Step {
  title: string;
  oneLine: string;
  input: string[];
  output: string[];
  ai: string;
  human: { who: Actor; does: string };
  preview: ReactNode;
}

const chip = (text: string, on = false) => (
  <span
    className="inline-block px-2 py-0.5 text-[10.5px] font-bold"
    style={on ? { background: "var(--crimson)", color: "#fff" } : { background: "#ecebe7", color: "#5f5e5a" }}
  >
    {text}
  </span>
);
const bar = (w: string) => <div className="mb-1.5 h-[5px]" style={{ width: w, background: "#d6d5d1" }} />;

const STEPS: Step[] = [
  {
    title: "발명 접수",
    oneLine: "연구원이 쓴 메모를 그대로 붙여넣으면, InPro가 출원 검토용으로 정리합니다.",
    input: ["발명 메모·실험 메모", "외부 공개 예정일 (논문·전시 등)"],
    output: ["기술 구성 초안", "빠진 항목 목록", "공개 전 출원 D-day"],
    ai: "구성 요소를 뽑고, 출원에 필요한데 빠진 정보를 짚습니다.",
    human: { who: "연구원", does: "평소 쓰던 메모를 그대로 올립니다." },
    preview: (
      <>
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-widest text-[#77756f]">연구원 메모</span>
          {chip("공개 D-10", true)}
        </div>
        {bar("92%")}
        {bar("84%")}
        {bar("70%")}
        <div className="mt-4 space-y-1.5 text-[11.5px]">
          <div className="font-bold text-[#3a3936]">빠진 항목 3</div>
          {["비교 실험 수치", "제어 조건", "도면"].map((t) => (
            <div key={t} className="px-2 py-1" style={{ background: "#efe2e2", color: "var(--crimson)" }}>
              {t}
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    title: "기술 이해·보완",
    oneLine: "조사 전에 발명자에게 꼭 필요한 것만 묻습니다. 메일로 몇 번 오가던 일이 한 번에 끝납니다.",
    input: ["AI가 만든 보완 질문에 대한 연구원 답변"],
    output: ["보강된 기술 구성", "선행조사 검색어"],
    ai: "빠진 항목을 연구원이 바로 답할 수 있는 질문으로 바꿉니다.",
    human: { who: "연구원", does: "질문 3개 정도에 답합니다." },
    preview: (
      <div className="space-y-2.5 text-[11.5px]">
        <div className="max-w-[85%] px-3 py-2" style={{ background: "#ecebe7", color: "#3a3936" }}>
          <b>Q.</b> 유량을 바꾸는 온도 기준은 몇 도인가요?
        </div>
        <div className="ml-auto max-w-[80%] px-3 py-2 text-white" style={{ background: "var(--crimson)" }}>
          <b>A.</b> 35℃ 이상이면 유량 2배로 올립니다.
        </div>
        <div className="max-w-[85%] px-3 py-2" style={{ background: "#ecebe7", color: "#3a3936" }}>
          <b>Q.</b> 기존 구조와 실험 조건을 같게 맞췄나요?
        </div>
        <div className="pt-1 text-[10.5px] text-[#77756f]">→ 답변 반영해 기술 구성 갱신</div>
      </div>
    ),
  },
  {
    title: "선행기술 조사",
    oneLine: "비슷한 특허를 찾아 구성 요소마다 비교합니다. 근거는 원문에서 그대로 인용하고, 확인 안 되면 '근거 부족'으로 표시합니다.",
    input: ["검색어 확정", "비교할 문헌 선택"],
    output: ["원문 인용이 붙은 비교표", "검색 조건 기록"],
    ai: "300건을 후보 몇 건으로 줄이고, 인용이 원문에 진짜 있는지 다시 확인합니다.",
    human: { who: "담당자", does: "비교표를 한 줄씩 확인합니다." },
    preview: (
      <div className="text-[11.5px]">
        {[
          ["냉각 채널 구조", "공통", false],
          ["지그재그 유로", "차이 후보", false],
          ["온도 기반 유량 제어", "근거 부족", true],
        ].map(([n, r, hl]) => (
          <div key={n as string} className="flex items-center justify-between border-t py-2.5" style={{ borderColor: "#e3e2de" }}>
            <span className="font-bold text-[#3a3936]">{n}</span>
            {chip(r as string, hl as boolean)}
          </div>
        ))}
        <div className="mt-2 border-l-2 pl-2 text-[10.5px] text-[#6c6b66]" style={{ borderColor: "#8f8e8a" }}>
          “…온도 센서의 측정값에 따라 펌프의 유량을 조절…”
        </div>
      </div>
    ),
  },
  {
    title: "특허성·사업성",
    oneLine: "특허가 될지뿐 아니라, 우리 사업에 얼마나 중요한지와 경쟁사가 따라 할 가능성을 같이 봅니다.",
    input: ["확인된 비교표"],
    output: ["다른 점 후보", "사업 중요도", "경쟁사 모방 가능성"],
    ai: "검토서 초안을 쓰고 출원 방식을 추천합니다. 등록 가능성은 단정하지 않습니다.",
    human: { who: "담당자", does: "초안을 읽고 고칩니다." },
    preview: (
      <div className="space-y-3 text-[11.5px]">
        {[
          ["사업 중요도", 3],
          ["경쟁사 모방 가능성", 2],
        ].map(([label, n]) => (
          <div key={label as string}>
            <div className="mb-1 font-bold text-[#3a3936]">{label}</div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-2 flex-1" style={{ background: i < (n as number) ? "var(--crimson)" : "#dad9d5" }} />
              ))}
            </div>
          </div>
        ))}
        <div className="border-t pt-2" style={{ borderColor: "#e3e2de" }}>
          <span className="text-[#77756f]">AI 추천 </span>
          {chip("국내 출원", true)}
        </div>
      </div>
    ),
  },
  {
    title: "권리범위 설계",
    oneLine: "“무엇을 출원할까”보다 “경쟁사가 피해 가기 어려운 권리”를 고민합니다. 지켜야 할 핵심을 정해 변리사와 논의합니다.",
    input: ["검토서", "구성별 구분 조정"],
    output: ["핵심·대체 가능·부가 구분", "경쟁사 우회 수단과 난이도"],
    ai: "구성마다 경쟁사가 대신 쓸 수 있는 수단을 찾아 우회 난이도를 매깁니다.",
    human: { who: "담당자", does: "핵심 구성을 최종으로 고릅니다." },
    preview: (
      <div className="text-[11.5px]">
        {[
          ["지그재그 냉각 채널", "핵심", "우회 어려움"],
          ["온도 센서", "대체 가능", "우회 쉬움"],
          ["펌프 유량 조절", "대체 가능", "우회 쉬움"],
        ].map(([n, r, d]) => (
          <div key={n} className="flex items-center justify-between gap-2 border-t py-2.5" style={{ borderColor: "#e3e2de" }}>
            <span className="font-bold text-[#3a3936]">{n}</span>
            <span className="flex gap-1">
              {chip(r, r === "핵심")}
              <span className="text-[10px] text-[#77756f]">{d}</span>
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "출원 결정·전달",
    oneLine: "담당자가 출원 방식을 정하고 승인자가 확정하면, 승인된 버전만 묶어 변리사에게 넘깁니다.",
    input: ["출원 방식 결정", "승인"],
    output: ["변리사 전달자료 (PDF·문서)", "남은 질문 목록", "조사·승인 기록"],
    ai: "연구원 확인 사실과 AI 제안을 나눠 표기한 전달자료를 만듭니다.",
    human: { who: "승인자", does: "결정을 확인하고 승인합니다." },
    preview: (
      <div className="text-[11.5px]">
        <div className="mb-3 flex flex-wrap gap-1">
          {chip("국내 출원", true)}
          {chip("해외 출원")}
          {chip("영업비밀")}
          {chip("보류")}
        </div>
        <div className="mb-3 flex items-center gap-2 font-bold text-[#3a3936]">
          <span className="grid h-5 w-5 place-items-center text-white" style={{ background: "var(--crimson)" }}>✓</span>
          연구소장 승인
        </div>
        <div className="border p-2.5" style={{ borderColor: "#e3e2de" }}>
          <div className="font-mono text-[10px] text-[#77756f]">변리사_전달자료.pdf</div>
          {bar("80%")}
          {bar("64%")}
        </div>
      </div>
    ),
  },
];

const ACTOR_COLORS: Record<Actor, string> = {
  연구원: "#3a3936",
  담당자: "var(--crimson)",
  승인자: "var(--crimson)",
  AI: "#77756f",
};

export function WorkflowSection() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  // 처음에는 단계가 자동으로 넘어가고, 사용자가 누르면 멈춘다
  useEffect(() => {
    if (!auto) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STEPS.length), 4500);
    return () => clearInterval(t);
  }, [auto]);

  const pick = (i: number) => {
    setActive(i);
    setAuto(false);
  };
  const s = STEPS[active];

  return (
    <section id="workflow" className="lp-rule scroll-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-4 px-[var(--pad)] pt-[var(--pad)]">
        <h2 className="lp-h-section">
          One Case,
          <br />
          Six Steps
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
      <div className="lp-split mt-8">
        <div key={active} className="lp-fade">
          <div className="mb-1 font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--crimson)" }}>
            STEP {String(active + 1).padStart(2, "0")} / 06
          </div>
          <h3 className="font-[family-name:var(--font-display)] text-[30px] font-extrabold leading-tight">{s.title}</h3>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {s.oneLine}
          </p>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3 max-sm:grid-cols-1">
            <div className="border p-3" style={{ borderColor: "var(--rule)", background: "var(--paper-2)" }}>
              <div className="lp-label ink !mb-1.5 !text-[11px]">넣는 것</div>
              <ul className="lp-dash !text-[12.5px]">
                {s.input.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div className="grid place-items-center text-xl max-sm:rotate-90" style={{ color: "var(--crimson)" }}>
              →
            </div>
            <div className="border p-3" style={{ borderColor: "var(--crimson)", background: "#fff" }}>
              <div className="lp-label !mb-1.5 !text-[11px]">받는 것</div>
              <ul className="lp-dash !text-[12.5px]">
                {s.output.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>

          <dl className="mt-5 space-y-2.5 text-[13px]">
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 font-bold" style={{ color: ACTOR_COLORS.AI }}>
                InPro AI
              </dt>
              <dd>{s.ai}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="w-16 shrink-0 font-bold" style={{ color: ACTOR_COLORS[s.human.who] }}>
                {s.human.who}
              </dt>
              <dd>{s.human.does}</dd>
            </div>
          </dl>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              onClick={() => pick((active + STEPS.length - 1) % STEPS.length)}
              className="grid h-10 w-10 place-items-center border text-lg transition hover:bg-[var(--crimson)] hover:text-white"
              style={{ borderColor: "var(--rule)" }}
              aria-label="이전 단계"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => pick((active + 1) % STEPS.length)}
              className="grid h-10 w-10 place-items-center border text-lg transition hover:bg-[var(--crimson)] hover:text-white"
              style={{ borderColor: "var(--rule)" }}
              aria-label="다음 단계"
            >
              →
            </button>
            <Link href="/workspace" className="ml-auto text-[13px] font-bold underline underline-offset-4" style={{ color: "var(--crimson)" }}>
              이 단계 직접 해보기
            </Link>
          </div>
        </div>

        <div className="lp-frame grid min-h-[340px] place-items-center p-8">
          <div key={active} className="lp-fade w-full max-w-[340px] bg-white p-5 shadow-[0_30px_40px_-30px_rgba(0,0,0,.5)]">
            <div className="mb-3 flex items-center justify-between border-b pb-2" style={{ borderColor: "#e3e2de" }}>
              <span className="font-[family-name:var(--font-display)] text-[11px] font-bold uppercase tracking-[.1em]" style={{ color: "var(--crimson)" }}>
                InPro · {s.title}
              </span>
              <span className="flex gap-1">
                <i className="block h-1.5 w-1.5 rounded-full bg-[#d6d5d1]" />
                <i className="block h-1.5 w-1.5 rounded-full bg-[#d6d5d1]" />
              </span>
            </div>
            {s.preview}
          </div>
        </div>
      </div>

      {/* 단계 밖에서 계속 도는 기능 */}
      <div className="grid border-t sm:grid-cols-2" style={{ borderColor: "var(--rule)" }}>
        <div className="flex gap-4 p-[var(--pad)] sm:border-r" style={{ borderColor: "var(--rule)" }}>
          <span className="font-[family-name:var(--font-display)] text-3xl font-bold" style={{ color: "var(--crimson)" }}>
            D-10
          </span>
          <div>
            <p className="lp-label ink !mb-1">공개 전 출원 알림</p>
            <p className="lp-body">논문·전시·제안 전에 출원 여부를 정해야 합니다. 공개 예정일을 넣으면 남은 날을 계속 알려줍니다.</p>
          </div>
        </div>
        <div className="flex gap-4 p-[var(--pad)]">
          <span className="font-[family-name:var(--font-display)] text-3xl font-bold" style={{ color: "var(--crimson)" }}>
            ↻
          </span>
          <div>
            <p className="lp-label ink !mb-1">개발 단계별 재조사</p>
            <p className="lp-body">설계가 바뀌면 다시 조사하고, 판단이 바뀐 구성만 재승인합니다. 사건은 출시 후까지 이어집니다.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
