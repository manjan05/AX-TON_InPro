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
