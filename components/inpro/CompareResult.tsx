"use client";
import { useState } from "react";
import { verdictLabels, type Matrix, type MatrixCell, type Presence } from "@/lib/inpro/matrix";
import type { ComparisonRow } from "@/lib/inpro/types";
import { CompareTable } from "./ui";

// 칸 표시: 있음(채운 원) · 일부(반쯤 찬 원) · 없음(빈 원) · 확인 필요(점선 원)
function Mark({ p }: { p: Presence }) {
  const base = "inline-block h-[18px] w-[18px] rounded-full border-[1.8px]";
  if (p === "있음") return <span className={base} style={{ background: "var(--crimson)", borderColor: "var(--crimson)" }} />;
  if (p === "일부") return <span className={base} style={{ background: "linear-gradient(90deg, var(--crimson) 50%, #fff 50%)", borderColor: "var(--crimson)" }} />;
  if (p === "없음") return <span className={base} style={{ background: "#fff", borderColor: "#c4ccd9" }} />;
  return <span className={`${base} border-dashed`} style={{ background: "#fff", borderColor: "#aab3c2" }} />;
}

// 위험 수준만 색을 준다 (높음·주의는 파랑, 낮음과 건수는 기본색)
const lvColor = (lv: string) => (lv === "높음" || lv === "주의" ? "var(--crimson)" : "var(--ink)");
const shortStatus = (s?: string) => (s ?? "").replace(/\s*\(.*\)\s*$/, "");

// 비교 결과 화면: 어느 문헌에도 없는 구성 → 지표 → 비교표(확인 칸 포함) → 판단 근거(접힘)
export function CompareResult({
  m,
  rows,
  confirmed,
  changed,
  onToggle,
}: {
  m: Matrix;
  rows: ComparisonRow[];
  confirmed: Set<string>;
  changed: Set<string>;
  onToggle: (componentName: string) => void;
}) {
  const [pick, setPick] = useState<MatrixCell | null>(null);
  const v = m.verdict;
  const L = verdictLabels(v.mode);
  const cell = (c: string, d: string) => m.cells.find((x) => x.componentId === c && x.docId === d);
  const done = m.components.filter((c) => confirmed.has(c.name)).length;
  const stats: [string, string][] = [
    [L.cards[0][0], v.novelty.level],
    [L.cards[1][0], v.inventive.level],
    ...(v.fto ? ([["등록 특허와 겹침", v.fto.novelty.level]] as [string, string][]) : []),
    ["비교 문헌", `${m.docs.length}건`],
  ];
  const reasons: [string, string, string][] = [
    [L.cards[0][0], v.novelty.level, v.novelty.text],
    [L.cards[1][0], v.inventive.level, v.inventive.text],
    ...(v.fto ? ([["등록 특허와 겹침", v.fto.novelty.level, v.fto.novelty.text]] as [string, string, string][]) : []),
  ];

  return (
    <div>
      <section>
        <div className="text-[13px]" style={{ color: "var(--ink-mute)" }}>
          {L.unique[1]}
        </div>
        {/* 구성 번호는 네모 안에, 한 칸 띄우고 구성 이름 */}
        <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3">
          {v.unique.length ? (
            v.unique.map((u) => {
              const [id, ...rest] = u.split(" ");
              const small = v.unique.length > 2;
              return (
                <div key={u} className="flex items-center gap-4">
                  <span
                    className={`grid place-items-center rounded-[10px] font-[family-name:var(--font-display)] font-extrabold text-white ${small ? "h-9 min-w-[44px] px-2.5 text-[18px]" : "h-12 min-w-[60px] px-3.5 text-[26px]"}`}
                    style={{ background: "var(--crimson)" }}
                  >
                    {id}
                  </span>
                  <span className={`font-[family-name:var(--font-display)] font-extrabold leading-tight tracking-[-.03em] ${small ? "text-[26px]" : "text-[42px]"}`} style={{ color: "var(--crimson)" }}>
                    {rest.join(" ")}
                  </span>
                </div>
              );
            })
          ) : (
            <span className="text-[42px] font-extrabold tracking-[-.03em]" style={{ color: "var(--crimson)" }}>
              없음
            </span>
          )}
        </div>
        <dl className="mt-8 grid grid-cols-2 gap-y-5 border-t pt-6 sm:grid-cols-4" style={{ borderColor: "var(--rule)" }}>
          {stats.map(([k, val]) => (
            <div key={k}>
              <dt className="text-[13px]" style={{ color: "var(--ink-mute)" }}>
                {k}
              </dt>
              <dd className="mt-1 text-[26px] font-extrabold tracking-[-.02em]" style={{ color: lvColor(val) }}>
                {val}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-12">
        <h3 className="flex flex-wrap items-baseline gap-3 text-[18px] font-extrabold">
          구성과 문헌 비교표
          <span className="text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
            담당자 확인 {done} / {m.components.length}
            {changed.size > 0 ? ` · 판단 바뀐 구성 ${changed.size}개` : ""}
          </span>
        </h3>

        <div className="mt-4 overflow-x-auto rounded-[14px] border bg-white" style={{ borderColor: "var(--rule)" }}>
          <table className="w-full min-w-[640px] border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="px-5 py-4 text-left text-[12.5px] font-normal" style={{ color: "var(--ink-mute)" }}>
                  {v.mode === "무효자료 조사" ? "대상 특허 구성" : "발명 구성"}
                </th>
                {m.docs.map((d) => (
                  <th key={d.id} className="px-2 py-4 text-center align-bottom" title={d.title}>
                    <div className="font-[family-name:var(--font-display)] text-[13.5px] font-extrabold">{d.label}</div>
                    <div className="mt-0.5 text-[12px] font-normal" style={{ color: "var(--ink-mute)" }}>
                      {shortStatus(d.status) || (d.live ? "등록" : "")}
                    </div>
                  </th>
                ))}
                <th className="px-5 py-4 text-center text-[12.5px] font-bold">확인</th>
              </tr>
            </thead>
            <tbody>
              {m.components.map((c) => {
                const isUnique = v.unique.includes(`${c.id} ${c.name}`);
                return (
                  <tr key={c.id} className="border-t" style={{ borderColor: "var(--rule)" }}>
                    <th className="px-5 py-4 text-left font-normal" style={isUnique ? { color: "var(--crimson)", fontWeight: 800 } : undefined}>
                      {c.id} {c.name}
                    </th>
                    {m.docs.map((d) => {
                      const x = cell(c.id, d.id);
                      const on = pick && pick.componentId === c.id && pick.docId === d.id;
                      return (
                        <td key={d.id} className="px-2 py-3 text-center">
                          <button
                            type="button"
                            disabled={!x}
                            onClick={() => setPick(on ? null : (x ?? null))}
                            className="rounded-full p-1.5 transition hover:bg-[var(--crimson-soft)]"
                            style={on ? { boxShadow: "0 0 0 2px var(--ink)" } : undefined}
                            aria-label={`${c.name} · ${d.label}: ${x?.presence ?? "확인 필요"}`}
                          >
                            <Mark p={x?.presence ?? "확인 필요"} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-5 py-3 text-center">
                      <input type="checkbox" className="h-5 w-5 accent-[#1d4fd8]" checked={confirmed.has(c.name)} onChange={() => onToggle(c.name)} aria-label={`${c.name} 확인`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          {(["있음", "일부", "없음"] as Presence[]).map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5">
              <Mark p={p} />
              {p}
            </span>
          ))}
          <span className="ml-auto" style={{ color: "var(--ink-mute)" }}>
            칸을 누르면 원문 근거가 보입니다
          </span>
        </div>

        {pick && (
          <div className="lp-fade mt-4 rounded-[12px] border bg-white p-5" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[12.5px] font-bold" style={{ color: "var(--ink-mute)" }}>
              {m.components.find((c) => c.id === pick.componentId)?.name} × {m.docs.find((d) => d.id === pick.docId)?.label} ·{" "}
              <span style={{ color: "var(--crimson)" }}>{pick.presence}</span>
            </div>
            {pick.quote && (
              <p className="mt-2 border-l-2 pl-3 text-[14px] leading-[1.75]" style={{ borderColor: "var(--rule)" }}>
                “{pick.quote}”
              </p>
            )}
            <p className="mt-2 text-[13px]" style={{ color: "var(--ink-soft)" }}>
              {pick.note}
            </p>
          </div>
        )}
      </section>

      <details className="group mt-10 border-t" style={{ borderColor: "var(--rule)" }}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[14px] font-bold [&::-webkit-details-marker]:hidden">
          <span>
            구성별 판단 근거
            <span className="ml-3 text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
              비교한 문헌 {m.docs.length}건
            </span>
          </span>
          <span className="text-[13px] font-normal group-open:hidden" style={{ color: "var(--ink-soft)" }}>
            열기
          </span>
          <span className="hidden text-[13px] font-normal group-open:inline" style={{ color: "var(--ink-soft)" }}>
            접기
          </span>
        </summary>
        <div className="space-y-6 pb-4">
          <ul className="space-y-3 text-[14px] leading-[1.7]">
            {reasons.map(([k, lv, text]) => (
              <li key={k}>
                <b>{k}</b> <span className="font-bold" style={{ color: lvColor(lv) }}>{lv}</span>
                <p style={{ color: "var(--ink-soft)" }}>{text}</p>
              </li>
            ))}
          </ul>
          <CompareTable rows={rows} confirmed={confirmed} changed={changed} onToggle={onToggle} />
        </div>
      </details>
    </div>
  );
}
