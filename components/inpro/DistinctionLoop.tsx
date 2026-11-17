"use client";
import { useState } from "react";
import type { FollowUpQuestion, SurveyRound } from "@/lib/inpro/followup";
import { Button } from "./ui";
import { InventorView } from "./InventorView";

const LOOP = ["기술 이해", "선행기술 조사", "발명자 재인터뷰", "차별점 재정의", "재검색"];

// 선행기술 → 발명자 재인터뷰 → 차별점 재정의 → 재검색을 회차로 반복한다.
export function DistinctionLoop({
  rounds,
  questions,
  answers,
  onAnswer,
  onRun,
  busy,
  inventor = "",
  children,
}: {
  rounds: SurveyRound[];
  questions: FollowUpQuestion[];
  answers: Record<string, string>;
  onAnswer: (question: string, answer: string) => void;
  onRun: () => void;
  busy: boolean;
  inventor?: string;
  children?: React.ReactNode; // 연구원에게 보내기
}) {
  const [view, setView] = useState<"담당자" | "발명자">("담당자");
  const answered = questions.filter((q) => answers[q.question]?.trim()).length;
  const current = rounds.length;
  return (
    <section className="border bg-white" style={{ borderColor: "var(--rule)" }}>
      <div className="border-b px-5 py-4" style={{ borderColor: "var(--rule)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-extrabold">발명자 재인터뷰 · 차별점 다시 정하기</h3>
          <div className="flex items-center gap-3">
            {questions.length > 0 && (
              <div className="flex" role="tablist" aria-label="화면 전환">
                {(["담당자", "발명자"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className="-ml-px border px-2.5 py-1 text-[12px] font-bold first:ml-0"
                    style={view === v ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)", position: "relative" } : { borderColor: "var(--rule)", background: "#fff" }}
                  >
                    {v} 화면
                  </button>
                ))}
              </div>
            )}
            <span className="font-[family-name:var(--font-display)] text-[13px] font-bold" style={{ color: "var(--crimson)" }}>
              조사 {current}회차
            </span>
          </div>
        </div>
        <p className="mt-1 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          겹친 구성을 발명자에게 다시 물어 차별점을 정하고, 재검색합니다.
        </p>
        <ol className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px] font-bold">
          {LOOP.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span
                className="px-2 py-0.5"
                style={
                  i === 2
                    ? { background: "var(--crimson)", color: "#fff" }
                    : i < 2
                      ? { background: "var(--crimson-soft)", color: "var(--crimson)" }
                      : { border: "1px solid var(--rule)", color: "var(--ink-soft)" }
                }
              >
                {s}
              </span>
              <span style={{ color: "var(--ink-mute)" }}>{i < LOOP.length - 1 ? "→" : "↺"}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {view === "발명자" && questions.length > 0 ? (
            <>
              <InventorView inventor={inventor} questions={questions} answers={answers} onAnswer={onAnswer} />
              <div className="mt-4">
                <Button arrow onClick={() => setView("담당자")} disabled={answered === 0}>
                  답변 보내기 · 담당자 화면으로
                </Button>
              </div>
            </>
          ) : questions.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>
              선행 문헌과 겹치는 구성이 없습니다. 지금 차별점으로 다음 단계로 가도 됩니다.
            </p>
          ) : (
            <ol className="space-y-3">
              {questions.map((q, i) => (
                <li key={q.question}>
                  <label htmlFor={`follow-${i}`} className="block text-[13px] leading-snug">
                    <span className="mr-1.5 font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>
                      Q{i + 1}
                    </span>
                    {q.question}
                  </label>
                  <textarea
                    id={`follow-${i}`}
                    rows={2}
                    value={answers[q.question] ?? ""}
                    onChange={(e) => onAnswer(q.question, e.target.value)}
                    placeholder="발명자 답변 (받은 내용을 붙여넣기)"
                    className="mt-1.5 w-full border bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--crimson)]"
                    style={{ borderColor: "var(--rule)" }}
                  />
                </li>
              ))}
            </ol>
          )}
          {view === "담당자" && questions.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button arrow onClick={onRun} loading={busy} disabled={answered === 0}>
                답변으로 차별점 재정의 · 재검색
              </Button>
              <span className="text-[12px]" style={{ color: "var(--ink-mute)" }}>
                답변 {answered}/{questions.length} · 기술 구성 갱신 → 재검색 → 비교표 다시 만들기
              </span>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {view === "담당자" && children}
          <div>
            <div className="mb-2 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
              회차별 변화
            </div>
            <ul className="space-y-1.5 text-[12px]">
              {rounds.map((r) => (
                <li key={r.n} className="border px-3 py-2" style={{ borderColor: r.n === current ? "var(--crimson)" : "var(--hairline)" }}>
                  <div className="flex justify-between font-bold">
                    <span>{r.n}회차</span>
                    {r.n > 1 && <span style={{ color: "var(--crimson)" }}>판단 바뀐 구성 {r.changed}개</span>}
                  </div>
                  <div style={{ color: "var(--ink-soft)" }}>
                    겹침 {r.common} · 일부 {r.partial} · 차별 {r.distinct}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
