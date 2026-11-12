"use client";
import { useState } from "react";
import type { Matrix, MatrixCell, Presence, RiskLevel } from "@/lib/inpro/matrix";

const MARK: Record<Presence, { sym: string; label: string; style: React.CSSProperties }> = {
  있음: { sym: "●", label: "있음", style: { background: "var(--crimson)", color: "#fff" } },
  일부: { sym: "◐", label: "일부", style: { background: "#efe2e2", color: "var(--crimson)" } },
  없음: { sym: "○", label: "없음", style: { background: "#fff", color: "#b5b4b0" } },
  "확인 필요": { sym: "?", label: "확인 필요", style: { background: "#fff", color: "var(--ink-soft)", outline: "1px dashed #b5b4b0", outlineOffset: -4 } },
};

const RISK: Record<RiskLevel, React.CSSProperties> = {
  높음: { background: "var(--crimson)", color: "#fff" },
  주의: { background: "#efe2e2", color: "var(--crimson)" },
  낮음: { background: "#fff", color: "var(--ink)", border: "1px solid var(--rule)" },
};

export function MatrixVerdictCards({ m }: { m: Matrix }) {
  const fto = m.verdict.mode === "침해 위험";
  const cards: [string, string, RiskLevel, string][] = fto
    ? [
        ["겹침이 큰 특허", "우리 구성이 살아 있는 특허에 얼마나 나오나", m.verdict.novelty.level, m.verdict.novelty.text],
        ["클레임 차트 확인 순서", "상대 독립항의 모든 구성요소가 우리 제품에 있나", m.verdict.inventive.level, m.verdict.inventive.text],
      ]
    : [
        ["신규성", "문헌 하나에 우리 구성이 전부 있는가", m.verdict.novelty.level, m.verdict.novelty.text],
        ["진보성", "여러 문헌을 합치면 전부 나오는가", m.verdict.inventive.level, m.verdict.inventive.text],
      ];
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
      {cards.map(([title, q, level, text]) => (
        <div key={title} className="border bg-white p-4" style={{ borderColor: "var(--rule)" }}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-extrabold">{fto ? title : `${title} 위험`}</span>
            <span className="px-2 py-0.5 text-[11px] font-bold" style={RISK[level]}>
              {level}
            </span>
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--ink-mute)" }}>
            {q}
          </div>
          <p className="mt-2 text-[12.5px] leading-snug">{text}</p>
        </div>
      ))}
      <div className="p-4 text-white" style={{ background: "var(--ink)" }}>
        <div className="text-[13px] font-extrabold">{fto ? "우리 제품만의 구성" : "핵심 차별 구성"}</div>
        <div className="mt-0.5 text-[11px] opacity-70">{fto ? "비교한 살아 있는 특허 어디에도 없는 구성" : "어느 문헌에도 없는 구성"}</div>
        {m.verdict.unique.length ? (
          <ul className="mt-2 space-y-1 text-[13px] font-bold">
            {m.verdict.unique.map((u) => (
              <li key={u}>— {u}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] opacity-80">없음. ‘일부’ 칸의 차이를 정리해 차별점을 만들어야 합니다.</p>
        )}
      </div>
    </div>
  );
}

export function MatrixView({ m, readOnly }: { m: Matrix; readOnly?: boolean }) {
  const [pick, setPick] = useState<MatrixCell | null>(null);
  const cell = (c: string, d: string) => m.cells.find((x) => x.componentId === c && x.docId === d);

  return (
    <div className="space-y-4">
      <MatrixVerdictCards m={m} />

      <div className="overflow-x-auto border bg-white" style={{ borderColor: "var(--rule)" }}>
        <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
          <thead>
            <tr>
              <th className="sticky left-0 border-b bg-white px-3 py-2.5 text-left text-[11px] font-bold" style={{ borderColor: "var(--rule)", color: "var(--ink-mute)" }}>
                발명 구성 \ 선행 문헌
              </th>
              {m.docs.map((d) => (
                <th key={d.id} className="border-b border-l px-2 py-2 text-center align-bottom" style={{ borderColor: "var(--rule)" }} title={d.title}>
                  <div className="font-[family-name:var(--font-display)] text-[13px] font-bold" style={{ color: "var(--crimson)" }}>
                    {d.label}
                  </div>
                  <div className="mx-auto line-clamp-2 max-w-[130px] text-[10.5px] font-normal leading-tight" style={{ color: "var(--ink-soft)" }}>
                    {d.title}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {m.components.map((c) => {
              const isUnique = m.verdict.unique.includes(`${c.id} ${c.name}`);
              return (
                <tr key={c.id}>
                  <th className="sticky left-0 border-b bg-white px-3 py-2 text-left font-bold" style={{ borderColor: "var(--rule)" }}>
                    <span className="mr-1.5 font-mono text-[11px]" style={{ color: "var(--crimson)" }}>
                      {c.id}
                    </span>
                    {c.name}
                    {isUnique && (
                      <span className="ml-1.5 px-1 text-[10px] font-bold text-white" style={{ background: "var(--ink)" }}>
                        차별
                      </span>
                    )}
                  </th>
                  {m.docs.map((d) => {
                    const x = cell(c.id, d.id);
                    const mk = MARK[x?.presence ?? "확인 필요"];
                    const on = pick && pick.componentId === c.id && pick.docId === d.id;
                    return (
                      <td key={d.id} className="border-b border-l p-1 text-center" style={{ borderColor: "var(--rule)" }}>
                        <button
                          type="button"
                          disabled={!x}
                          onClick={() => setPick(on ? null : (x ?? null))}
                          className="grid h-10 w-full place-items-center text-[17px] font-bold transition hover:brightness-95"
                          style={{ ...mk.style, boxShadow: on ? "inset 0 0 0 2px var(--ink)" : undefined }}
                          aria-label={`${c.name} · ${d.label}: ${mk.label}`}
                        >
                          {mk.sym}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-[11px]" style={{ color: "var(--ink-soft)" }}>
          {(Object.keys(MARK) as Presence[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1">
              <span className="grid h-4 w-4 place-items-center text-[11px] font-bold" style={MARK[p].style}>
                {MARK[p].sym}
              </span>
              {MARK[p].label}
            </span>
          ))}
          {!readOnly && <span className="ml-auto">칸을 누르면 근거가 보입니다 · ‘있음’은 원문 인용이 확인된 칸만</span>}
        </div>
      </div>

      {pick && (
        <div className="lp-fade border-l-4 bg-white p-4" style={{ borderColor: "var(--crimson)" }}>
          <div className="text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
            {m.components.find((c) => c.id === pick.componentId)?.name} × {m.docs.find((d) => d.id === pick.docId)?.label} ·{" "}
            <span style={{ color: "var(--crimson)" }}>{pick.presence}</span>
          </div>
          {pick.quote && <p className="mt-1.5 border-l-2 pl-3 text-[13px] leading-relaxed" style={{ borderColor: "#d6d5d1" }}>“{pick.quote}”</p>}
          <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
            {pick.note}
          </p>
        </div>
      )}
    </div>
  );
}
