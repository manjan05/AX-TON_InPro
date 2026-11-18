"use client";
import type { ReactNode } from "react";

export type Sub3 = "설정" | "후보" | "결과";
const SUBS: { key: Sub3; label: string }[] = [
  { key: "설정", label: "조사 설정" },
  { key: "후보", label: "후보 고르기" },
  { key: "결과", label: "비교 결과" },
];

// 3단계 안의 작은 단계 표시: 지금 어디인지, 지나온 곳으로는 돌아갈 수 있다
export function SubRail({ view, canCandidates, canResult, onPick }: { view: Sub3; canCandidates: boolean; canResult: boolean; onPick: (s: Sub3) => void }) {
  const enabled: Record<Sub3, boolean> = { 설정: true, 후보: canCandidates, 결과: canResult };
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-2 text-[12.5px] font-bold" aria-label="3단계 진행">
      {SUBS.map((s, i) => {
        const on = s.key === view;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!enabled[s.key]}
              aria-current={on ? "step" : undefined}
              onClick={() => onPick(s.key)}
              className="flex items-center gap-1.5 px-2.5 py-1 transition disabled:cursor-default"
              style={on ? { background: "var(--crimson)", color: "#fff" } : enabled[s.key] ? { border: "1px solid var(--crimson)", color: "var(--crimson)" } : { border: "1px solid var(--rule)", color: "var(--ink-mute)" }}
            >
              <span className="font-mono text-[11px]">{i + 1}</span>
              {s.label}
            </button>
            {i < SUBS.length - 1 && <span style={{ color: "var(--ink-mute)" }}>→</span>}
          </li>
        );
      })}
    </ol>
  );
}

// 근거와 설명은 접어 둔다. 필요할 때만 펼친다.
export function Fold({ summary, children, defaultOpen = false }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group border bg-white" style={{ borderColor: "var(--rule)" }} open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-bold [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span className="text-[11px] font-normal underline underline-offset-2 group-open:hidden" style={{ color: "var(--ink-soft)" }}>
          펼치기
        </span>
        <span className="hidden text-[11px] font-normal underline underline-offset-2 group-open:inline" style={{ color: "var(--ink-soft)" }}>
          접기
        </span>
      </summary>
      <div className="border-t p-4" style={{ borderColor: "var(--hairline)" }}>
        {children}
      </div>
    </details>
  );
}

// 선행조사 실행을 누르면 조사가 좁혀지는 과정을 한 단계씩 보여준다
export function SearchRun({ steps, shown }: { steps: { label: string; count: number; note: string }[]; shown: number }) {
  return (
    <div className="mt-5 border bg-white p-4" style={{ borderColor: "var(--crimson)" }} role="status" aria-live="polite">
      <div className="mb-3 text-[13px] font-extrabold">조사 중…</div>
      <ol className="space-y-2">
        {steps.map((s, i) => {
          const done = i < shown;
          const now = i === shown;
          if (i > shown) return null;
          return (
            <li key={s.label} className="flex items-baseline gap-3 text-[13px]">
              <span className="w-4 text-center font-bold" style={{ color: done ? "var(--crimson)" : "var(--ink-mute)" }}>
                {done ? "✓" : now ? "…" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <b>{s.label}</b>
                <span className="ml-2 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
                  {done ? s.note : ""}
                </span>
              </span>
              <span className="font-[family-name:var(--font-display)] text-[20px] font-bold" style={{ color: done ? "var(--ink)" : "var(--ink-mute)" }}>
                {done ? s.count.toLocaleString() : "…"}
                <span className="ml-0.5 text-[11px] font-normal">{done ? "건" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px]" style={{ color: "var(--ink-mute)" }}>
        데모는 팀원이 KIPRIS에서 미리 모은 데이터에서 조사합니다. 실제 서비스는 이 단계에서 특허 DB를 검색합니다.
      </p>
    </div>
  );
}
