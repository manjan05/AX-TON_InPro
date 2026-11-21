"use client";
import { useEffect, useState } from "react";
import type { PriorDoc } from "@/lib/inpro/types";
import type { SearchMeta } from "./SearchResults";
import { Select } from "./FormParts";

const KIPRIS = "https://www.kipris.or.kr/khome/main.do";

// 검색 경로를 한 줄로: 564건 전체 > 36건 가정용 형상 > 10건 검색어 일치 상위 > … > 6건 선택
function pathStages(path: SearchMeta["path"], scopeLabel: string, total: number, selected: number) {
  const out: { count: number; label: string; hl?: boolean }[] = [];
  path.forEach((s, i) => {
    if (i === 0) out.push({ count: s.count, label: "전체" });
    else if (s.label === "조사 범위 안") out.push({ count: s.count, label: scopeLabel || "조사 범위" });
    else if (s.label === "검색어 일치") return;
    else if (/^상위 \d+건/.test(s.label)) out.push({ count: s.count, label: "검색어 일치 상위" });
    else if (s.label === "살아 있는 특허 보충") out.push({ count: total, label: `등록 특허 ${s.count}건 보충` });
    else out.push({ count: s.count, label: s.label });
  });
  out.push({ count: selected, label: "선택", hl: true });
  return out;
}

const matchedName = (k: string) => k.split("(")[0].trim();
// "소멸 (등록료불납)" → "소멸": 목록에는 상태 이름만, 이유는 자세히 보기에서
const shortStatus = (s?: string) => (s ?? "").replace(/\s*\(.*\)\s*$/, "");

export function CandidateList({
  docs,
  path,
  scopeLabel,
  keywords,
  selected,
  onToggle,
  onBack,
  onCompare,
  comparing,
}: {
  docs: PriorDoc[];
  path: SearchMeta["path"];
  scopeLabel: string;
  keywords: string[];
  selected: Set<string>;
  onToggle: (d: PriorDoc) => void;
  onBack: () => void;
  onCompare: () => void;
  comparing: boolean;
}) {
  const [kw, setKw] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<PriorDoc | null>(null);
  const statuses = Array.from(new Set(docs.map((d) => shortStatus(d.status)).filter(Boolean)));
  const shown = docs.filter((d) => (!kw || d.matchedKeywords.some((m) => m.includes(kw))) && (!status || shortStatus(d.status) === status));

  return (
    <div>
      <section>
        <h3 className="text-[18px] font-extrabold">검색 경로</h3>
        <ol className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3">
          {pathStages(path, scopeLabel, docs.length, selected.size).map((s, i, arr) => (
            <li key={`${s.label}-${i}`} className="flex items-end gap-4">
              <span>
                <span className="font-[family-name:var(--font-display)] text-[32px] font-extrabold leading-none tracking-[-.03em]" style={{ color: s.hl ? "var(--crimson)" : undefined }}>
                  {s.count.toLocaleString()}
                </span>
                <span className="ml-0.5 text-[13px] font-bold">건</span>
                <span className="ml-1.5 text-[13px]" style={{ color: "var(--ink-soft)" }}>
                  {s.label}
                </span>
              </span>
              {i < arr.length - 1 && (
                <span className="pb-1 text-[16px]" style={{ color: "var(--ink-mute)" }} aria-hidden="true">
                  &gt;
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h3 className="flex flex-wrap items-baseline gap-3 text-[18px] font-extrabold">
          후보 문헌 {docs.length}건
          <span className="text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
            비교할 문헌 최대 6건 선택
          </span>
        </h3>

        <div className="mt-5 flex flex-wrap gap-3">
          <div className="w-[190px]">
            <Select id="cand-kw" value={kw} onChange={setKw}>
              <option value="">전체 검색어</option>
              {keywords.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </Select>
          </div>
          <div className="w-[190px]">
            <Select id="cand-status" value={status} onChange={setStatus}>
              <option value="">전체 상태</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>

        <ul className="mt-4">
          {shown.map((d) => {
            const on = selected.has(d.id);
            return (
              <li key={d.id} className="flex items-start gap-4 border-b py-5" style={{ borderColor: "var(--rule)" }}>
                <input type="checkbox" className="mt-1.5 h-5 w-5 shrink-0 accent-[#1074d1]" checked={on} onChange={() => onToggle(d)} aria-label={`${d.title} 비교에 포함`} />
                <div className="min-w-0 flex-1">
                  <div className="text-[17px] font-bold leading-snug">{d.title}</div>
                  <div className="mt-1.5 text-[14px]" style={{ color: "var(--ink-soft)" }}>
                    {d.applicant}, {d.registrationDate}, {d.id}
                  </div>
                  <div className="mt-1 text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
                    겹치는 검색어 {d.matchedKeywords.length}개
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {d.status && (
                    <div className="text-[13px] font-bold" style={{ color: d.status === "등록" ? "var(--crimson)" : "var(--ink-soft)" }}>
                      {shortStatus(d.status)}
                    </div>
                  )}
                  <button type="button" onClick={() => setOpen(d)} className="mt-2 text-[13px] underline underline-offset-4 transition hover:text-[var(--crimson)]" style={{ color: "var(--ink-soft)" }}>
                    자세히 보기
                  </button>
                </div>
              </li>
            );
          })}
          {shown.length === 0 && (
            <li className="py-8 text-[14px]" style={{ color: "var(--ink-soft)" }}>
              조건에 맞는 후보가 없습니다.
            </li>
          )}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
        <button type="button" onClick={onBack} className="h-[46px] rounded-[10px] border bg-white px-5 text-[14.5px] font-bold transition hover:bg-[var(--crimson-soft)]" style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}>
          조사 설정으로
        </button>
        <button
          type="button"
          onClick={onCompare}
          disabled={selected.size === 0 || comparing}
          className="inline-flex h-[52px] items-center gap-2 rounded-[10px] px-7 text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-35 disabled:hover:brightness-100"
          style={{ background: "var(--crimson)" }}
        >
          {comparing && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          선택한 {selected.size}건 비교
        </button>
      </div>

      {open && <DocModal doc={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// 자세히 보기: 출원인·날짜·번호·상태와 대표 청구항
function DocModal({ doc, onClose }: { doc: PriorDoc; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const rep = doc.matchedKeywords[0] ? matchedName(doc.matchedKeywords[0]) : "";
  const rows: [string, string][] = [
    ["출원인", doc.applicant],
    ["날짜", doc.registrationDate],
    ["출원번호", doc.id],
    ["법적 상태", doc.status ?? "-"],
    ["겹치는 검색어", `${doc.matchedKeywords.length}개${rep ? ` (대표 ${rep})` : ""}`],
  ];
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={doc.title} className="max-h-[88vh] w-full max-w-[640px] overflow-y-auto rounded-[16px] bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-[12.5px]" style={{ color: "var(--ink-mute)" }}>
          {[doc.status && `${doc.status} 특허`, doc.usage && `용도 ${doc.usage}`, doc.facet && `분류 ${doc.facet}`].filter(Boolean).join(", ")}
        </div>
        <h4 className="mt-1.5 text-[22px] font-extrabold leading-snug tracking-[-.02em]">{doc.title}</h4>
        <dl className="mt-6 border-t text-[14px]" style={{ borderColor: "var(--rule)" }}>
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[110px_1fr] gap-x-4 border-b py-3" style={{ borderColor: "var(--rule)" }}>
              <dt className="font-bold">{k}</dt>
              <dd style={{ color: "var(--ink-soft)" }}>{v}</dd>
            </div>
          ))}
        </dl>
        <h5 className="mt-6 text-[14px] font-extrabold">대표 청구항</h5>
        <p className="mt-2 text-[14px] leading-[1.8]">{doc.claims ?? doc.abstract}</p>
        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5" style={{ borderColor: "var(--rule)" }}>
          <a href={KIPRIS} target="_blank" rel="noopener" className="text-[13px] underline underline-offset-4" style={{ color: "var(--ink-soft)" }}>
            KIPRIS에서 원문 보기
          </a>
          <button type="button" onClick={onClose} className="h-10 rounded-[10px] border bg-white px-5 text-[14px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]" style={{ borderColor: "var(--rule)" }}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
