"use client";
import { useState } from "react";
import type { InventionComponent, Purpose } from "@/lib/inpro/types";
import { Button } from "./ui";

export interface SearchTargets {
  applicants: { name: string; count: number }[];
  patents: { id: string; title: string; applicant: string; year: number }[];
}

export interface InvalidityTarget {
  doc: { id: string; title: string; applicant: string; status?: string; year: number | null; claims: string };
  components: InventionComponent[];
  keywords: string[];
}

const selectCls = "w-full border bg-white px-3 py-2 text-[13.5px] outline-none focus:border-[var(--crimson)]";

// 경쟁사 조사: 경쟁사 한 곳 고르기 / 무효자료 조사: 무너뜨릴 대상 특허 고르기
export function TargetPicker({
  purpose,
  targets,
  competitor,
  onCompetitor,
  target,
  onLoadTarget,
  loading,
}: {
  purpose: Purpose;
  targets: SearchTargets | null;
  competitor: string;
  onCompetitor: (name: string) => void;
  target: InvalidityTarget | null;
  onLoadTarget: (id: string) => void;
  loading: boolean;
}) {
  const [pick, setPick] = useState(target?.doc.id ?? "");
  if (!targets) return null;

  if (purpose === "경쟁사 조사") {
    return (
      <div className="mt-3 border p-4" style={{ borderColor: "var(--crimson)", background: "#fff" }}>
        <label htmlFor="pick-competitor" className="mb-1.5 block text-[13px] font-bold">
          조사할 경쟁사 <span className="font-normal" style={{ color: "var(--ink-mute)" }}>조사 범위 안 출원인, 특허 많은 순</span>
        </label>
        <select id="pick-competitor" value={competitor} onChange={(e) => onCompetitor(e.target.value)} className={selectCls} style={{ borderColor: "var(--rule)" }}>
          <option value="">경쟁사 선택</option>
          {targets.applicants.map((a) => (
            <option key={a.name} value={a.name}>
              {a.name} ({a.count}건)
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="mt-3 border p-4" style={{ borderColor: "var(--crimson)", background: "#fff" }}>
      <label htmlFor="pick-target" className="mb-1.5 block text-[13px] font-bold">
        무효로 만들 대상 특허 <span className="font-normal" style={{ color: "var(--ink-mute)" }}>살아 있는 등록 특허 · 최근 출원 순</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <select id="pick-target" value={pick} onChange={(e) => setPick(e.target.value)} className={`${selectCls} min-w-0 flex-1`} style={{ borderColor: "var(--rule)" }}>
          <option value="">대상 특허 선택</option>
          {targets.patents.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.year}] {p.title.slice(0, 40)} · {p.applicant}
            </option>
          ))}
        </select>
        <Button onClick={() => pick && onLoadTarget(pick)} loading={loading} disabled={!pick || pick === target?.doc.id}>
          청구항 구성 나누기
        </Button>
      </div>
      {target && (
        <div className="mt-3 border-t pt-3 text-[12.5px]" style={{ borderColor: "var(--hairline)" }}>
          <div className="font-bold">
            {target.doc.title} <span className="font-mono text-[11px]" style={{ color: "var(--ink-mute)" }}>{target.doc.id} · {target.doc.year}년 출원 · {target.doc.applicant}</span>
          </div>
          <div className="mt-1.5 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
            대표 청구항 구성요소 · 이 구성들을 {target.doc.year}년 이전 문헌에서 찾습니다
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "var(--ink-mute)" }}>
            검색어: {target.keywords.join(", ")} · 무효 근거는 다른 분야에서도 나오니 조사 범위를 ‘전체’로 넓혀 보세요.
          </div>
          <ul className="mt-1 space-y-0.5">
            {target.components.map((c) => (
              <li key={c.id}>
                <span className="mr-1.5 font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>
                  {c.id}
                </span>
                <b>{c.name}</b> — {c.description}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
