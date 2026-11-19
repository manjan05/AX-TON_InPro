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

// 구성 하나: 한 줄에 이름·한 줄 조언·우회 정도, 오른쪽에 구분 선택. 경쟁사의 회피 시도는 눌러서 본다.
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
  const attempts = it.attempts ?? [];
  return (
    <li className="border-b py-6" style={{ borderColor: "var(--rule)" }}>
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 flex-1 basis-[320px]">
          <div className="text-[17px] font-extrabold">{it.componentName}</div>
          {it.advice && <p className="mt-1.5 text-[14px] leading-[1.7]">{it.advice}</p>}
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--ink-mute)" }}>
            우회 {it.designAround}
          </p>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-2 text-[13px]" style={{ color: "var(--ink-soft)" }}>
            {open ? "접기" : `회피 시도와 이유 보기${attempts.length ? ` (${attempts.length})` : ""}`}
          </button>
        </div>
        <div className="flex rounded-full border bg-white p-1" style={{ borderColor: "var(--rule)" }} role="group" aria-label={`${it.componentName} 구분`}>
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRole(r)}
              aria-pressed={it.role === r}
              className="rounded-full px-5 py-2 text-[13.5px] font-bold transition"
              style={it.role === r ? { background: "var(--crimson)", color: "#fff" } : { color: "var(--ink-soft)" }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
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
          <p className="text-[13px] leading-snug" style={{ color: "var(--ink-soft)" }}>
            <b style={{ color: "var(--ink)" }}>{it.role}인 이유 ·</b> {it.reason}
          </p>
        </div>
      )}
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
