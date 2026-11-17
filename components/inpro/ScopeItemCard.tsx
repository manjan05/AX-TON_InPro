"use client";
import { useState } from "react";
import type { KeepsEffect } from "@/lib/inpro/designaround";
import type { ScopeItem, ScopeRole } from "@/lib/inpro/types";
import { splitAlternatives } from "./StepParts";

const ROLES: ScopeRole[] = ["핵심", "대체 가능", "부가"];

const EFFECT: Record<KeepsEffect, { label: string; style: React.CSSProperties }> = {
  유지: { label: "효과 유지 → 회피됨", style: { background: "var(--crimson)", color: "#fff" } },
  일부: { label: "효과 일부", style: { background: "#efe2e2", color: "var(--crimson)" } },
  "안 됨": { label: "효과 없음 → 회피 실패", style: { border: "1px solid var(--rule)", color: "var(--ink-soft)" } },
};

// 구성 하나: 먼저 결론(구분 · 우회 · 권리에 담는 방법), 경쟁사의 회피 시도와 이유는 눌러서 본다
export function ScopeItemCard({ it, onRole }: { it: ScopeItem; onRole: (r: ScopeRole) => void }) {
  const [open, setOpen] = useState(false);
  const core = it.role === "핵심";
  const attempts = it.attempts ?? [];
  return (
    <li className="border bg-white" style={{ borderColor: core ? "var(--crimson)" : "var(--rule)", boxShadow: core ? "inset 3px 0 0 var(--crimson)" : "none" }}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="text-[14.5px] font-bold">{it.componentName}</div>
          <div className="mt-0.5 text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            우회 {it.designAround}
          </div>
        </div>
        <div className="flex" role="group" aria-label={`${it.componentName} 구분`}>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRole(r)}
              aria-pressed={it.role === r}
              className="-ml-px border px-2.5 py-1.5 text-[12px] font-bold first:ml-0"
              style={it.role === r ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)", position: "relative" } : { borderColor: "var(--rule)", background: "#fff" }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-4 pt-2">
        {it.advice && <p className="text-[13.5px] font-bold leading-snug">{it.advice}</p>}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-[11.5px] font-bold underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
          {open ? "접기" : `경쟁사 회피 시도와 이유 보기${attempts.length ? ` (${attempts.length})` : ""}`}
        </button>

        {open && (
          <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: "#eceae6" }}>
            {attempts.length ? (
              <ul className="space-y-1.5">
                {attempts.map((a) => (
                  <li key={a.method} className="grid gap-x-3 gap-y-0.5 text-[12.5px] sm:grid-cols-[150px_auto_1fr] sm:items-baseline">
                    <b className="border border-dashed px-2 py-0.5 text-center" style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}>
                      {a.method}
                    </b>
                    <span className="w-fit px-1.5 py-0.5 text-[11px] font-bold" style={EFFECT[a.keepsEffect].style}>
                      {EFFECT[a.keepsEffect].label}
                    </span>
                    <span style={{ color: "var(--ink-soft)" }}>{a.why}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {splitAlternatives(it.alternatives).map((a) => (
                  <span key={a} className="border border-dashed px-2 py-0.5 text-[12px] font-bold" style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}>
                    {a}
                  </span>
                ))}
              </div>
            )}
            <p className="text-[12.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
              <b style={{ color: "var(--ink)" }}>{it.role}인 이유 ·</b> {it.reason}
            </p>
          </div>
        )}
      </div>
    </li>
  );
}
