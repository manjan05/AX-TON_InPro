"use client";
import { useState } from "react";
import { effectOf, trustOf, type DesignAroundAttempt, type KeepsEffect, type Trust } from "@/lib/inpro/designaround";
import type { ScopeItem, ScopeRole } from "@/lib/inpro/types";
import { splitAlternatives } from "./StepParts";

const ROLES: ScopeRole[] = ["핵심", "대체 가능", "부가"];

const EFFECT: Record<KeepsEffect, { label: string; style: React.CSSProperties }> = {
  유지: { label: "효과 유지 → 회피됨", style: { background: "var(--crimson)", color: "#fff" } },
  일부: { label: "효과 일부", style: { background: "#e7eefc", color: "var(--crimson)" } },
  "안 됨": { label: "효과 없음 → 회피 실패", style: { border: "1px solid var(--rule)", color: "var(--ink-soft)" } },
};

const TRUST: Record<Trust, { style: React.CSSProperties; hint: string }> = {
  "발명자 확인": { style: { background: "var(--ink)", color: "#fff" }, hint: "발명자가 직접 확인했습니다" },
  "실제 특허": { style: { background: "#e5f4e4", color: "#2c5f2a" }, hint: "데이터의 실제 특허에 비슷한 표현이 있습니다. 같은 효과인지는 확인이 필요합니다" },
  "AI 추정": { style: { border: "1px dashed var(--ink-mute)", color: "var(--ink-soft)" }, hint: "AI의 추정입니다. 발명자·변리사 확인이 필요합니다" },
};

// 구성 하나: 먼저 결론(구분 · 우회 · 권리에 담는 방법), 경쟁사의 회피 시도는 눌러서 본다.
// 회피 시도마다 믿을 근거(발명자 확인 / 실제 특허 / AI 추정)를 표시하고, 발명자 확인을 받으면 구분이 다시 계산된다.
export function ScopeItemCard({
  it,
  onRole,
  onConfirm,
}: {
  it: ScopeItem;
  onRole: (r: ScopeRole) => void;
  onConfirm: (method: string, v: "같음" | "다름" | null) => void;
}) {
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
          <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: "#e9edf3" }}>
            {attempts.length ? (
              <ul className="space-y-3">
                {attempts.map((a) => (
                  <AttemptRow key={a.method} a={a} onConfirm={onConfirm} />
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

function AttemptRow({ a, onConfirm }: { a: DesignAroundAttempt; onConfirm: (method: string, v: "같음" | "다름" | null) => void }) {
  const eff = effectOf(a);
  const trust = trustOf(a);
  return (
    <li className="text-[12.5px]">
      <div className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[150px_auto_1fr] sm:items-baseline">
        <b className="border border-dashed px-2 py-0.5 text-center" style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}>
          {a.method}
        </b>
        <span className="w-fit px-1.5 py-0.5 text-[11px] font-bold" style={EFFECT[eff].style}>
          {EFFECT[eff].label}
        </span>
        <span style={{ color: "var(--ink-soft)" }}>{a.why}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 sm:pl-[162px]">
        <span className="px-1.5 py-0.5 text-[10.5px] font-bold" style={TRUST[trust].style} title={TRUST[trust].hint}>
          {trust}
        </span>
        {a.evidence && a.evidence.count > 0 && !a.confirmed && (
          <span className="text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
            실제 특허 {a.evidence.count}건에 비슷한 표현 · {a.evidence.docs.map((d) => `${d.title.slice(0, 22)}${d.status ? `(${d.status})` : ""}`).join(", ")}
          </span>
        )}
        {a.confirmed ? (
          <span className="text-[11.5px]">
            발명자 확인: <b>효과 {a.confirmed}</b>{" "}
            <button type="button" onClick={() => onConfirm(a.method, null)} className="underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
              취소
            </button>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
            발명자 확인
            {(["같음", "다름"] as const).map((v) => (
              <button key={v} type="button" onClick={() => onConfirm(a.method, v)} className="border px-1.5 py-0.5 font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]" style={{ borderColor: "var(--rule)" }}>
                효과 {v}
              </button>
            ))}
          </span>
        )}
      </div>
    </li>
  );
}
