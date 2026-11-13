"use client";
import { useState } from "react";
import type { CheckResult, CheckStatus } from "@/lib/inpro/checklist";

const MARK: Record<CheckStatus, { sym: string; style: React.CSSProperties }> = {
  충족: { sym: "●", style: { background: "var(--crimson)", color: "#fff" } },
  부족: { sym: "◐", style: { background: "#efe2e2", color: "var(--crimson)" } },
  없음: { sym: "○", style: { background: "#fff", color: "var(--ink-mute)", border: "1px solid var(--rule)" } },
};

// 출원 체크리스트: 빠진 항목(부족·없음)을 위로, 충족은 근거 문장과 함께 아래로
export function ChecklistView({ items }: { items: CheckResult[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const order: Record<CheckStatus, number> = { 없음: 0, 부족: 1, 충족: 2 };
  const sorted = [...items].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <ul className="space-y-1.5">
      {sorted.map((c) => {
        const mk = MARK[c.status];
        const isOpen = open === c.id;
        const missing = c.status !== "충족";
        return (
          <li key={c.id} className="border text-[13px]" style={{ borderColor: missing ? "#e3caca" : "var(--hairline)", background: missing ? "#faf3f3" : "#fff" }}>
            <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left" aria-expanded={isOpen}>
              <span className="grid h-5 shrink-0 place-items-center px-1.5 text-[10.5px] font-bold" style={mk.style}>
                {mk.sym} {c.status}
              </span>
              <b style={missing ? { color: "var(--crimson)" } : undefined}>{c.name}</b>
              <span className="ml-auto text-[11px]" style={{ color: "var(--ink-mute)" }}>
                {isOpen ? "닫기" : "근거"}
              </span>
            </button>
            {isOpen && (
              <div className="space-y-1 border-t px-3 py-2 text-[12px]" style={{ borderColor: "var(--hairline)", color: "var(--ink-soft)" }}>
                <div>왜 필요한가 · {c.why}</div>
                {c.quote && (
                  <div>
                    자료 속 근거 · <q className="font-bold" style={{ color: "var(--ink)" }}>{c.quote}</q>
                  </div>
                )}
                {c.note && <div>{c.note}</div>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
