"use client";
import { useState } from "react";
import { EXCLUDE_REASONS, type ExcludeReason, type NearMiss, type PriorDoc } from "@/lib/inpro/types";

export interface SearchMeta {
  path: { label: string; count: number; note: string }[];
  nearMiss: { total: number; items: NearMiss[] };
  outOfScope: { count: number; examples: { id: string; title: string; usage?: string; facet?: string }[] };
  extra: PriorDoc[];
}

function Highlight({ text, term }: { text: string; term: string }) {
  const i = text.indexOf(term);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="px-0.5" style={{ background: "rgba(110,11,20,.14)", color: "var(--ink)", fontWeight: 700 }}>
        {term}
      </mark>
      {text.slice(i + term.length)}
    </>
  );
}

// ① 걸러진 경로
export function SearchPath({ path, selectedCount }: { path: SearchMeta["path"]; selectedCount: number }) {
  const steps = [...path, { label: "담당자 선택", count: selectedCount, note: "비교표에 넣을 문헌" }];
  return (
    <div className="border bg-white" style={{ borderColor: "var(--rule)" }}>
      <div className="border-b px-4 py-2.5 text-[12px] font-extrabold" style={{ borderColor: "var(--rule)" }}>
        검색 경로 · 어떻게 여기까지 좁혀졌나
      </div>
      <ol className="grid divide-y sm:grid-cols-5 sm:divide-x sm:divide-y-0" style={{ borderColor: "var(--rule)" }}>
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={s.label} className="px-4 py-3" style={{ borderColor: "var(--rule)", background: last ? "var(--crimson)" : undefined, color: last ? "#fff" : undefined }}>
              <div className="text-[11px] font-bold opacity-75">{s.label}</div>
              <div className="font-[family-name:var(--font-display)] text-[24px] font-bold leading-tight">
                {s.count.toLocaleString()}
                <span className="ml-0.5 text-[11px] font-normal">건</span>
              </div>
              <div className="mt-1 text-[11px] leading-snug opacity-80">{s.note}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ② 문헌 한 건과 선정 이유
export function DocCard({
  doc,
  rank,
  selected,
  excluded,
  askReason,
  onToggle,
  onReason,
}: {
  doc: PriorDoc;
  rank: number;
  selected: boolean;
  excluded?: ExcludeReason;
  askReason: boolean;
  onToggle: () => void;
  onReason: (r: ExcludeReason) => void;
}) {
  const [open, setOpen] = useState(rank <= 3);
  const ex = doc.explain;
  const maxPts = Math.max(1, ...(ex?.details.map((d) => d.points) ?? [1]));
  return (
    <li className="border bg-white transition" style={{ borderColor: selected ? "var(--crimson)" : "var(--rule)", boxShadow: selected ? "inset 3px 0 0 var(--crimson)" : "none" }}>
      <div className="flex items-start gap-3 p-4">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-[#6e0b14]" checked={selected} onChange={onToggle} aria-label={`${doc.title} 비교에 포함`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
              #{rank}
            </span>
            <span className="text-[14px] font-bold leading-snug">{doc.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
            <span>{doc.applicant}</span>·<span>{doc.registrationDate}</span>·<span className="font-mono">{doc.id}</span>
            {doc.usage && <span>· {doc.usage}</span>}
            {doc.facet && <span>· {doc.facet}</span>}
            {doc.status && (
              <span
                className="px-1.5 py-0.5 text-[10.5px] font-bold"
                style={
                  doc.status === "등록"
                    ? { background: "var(--crimson)", color: "#fff" }
                    : doc.status === "공개"
                      ? { border: "1px solid var(--rule)", color: "var(--ink)" }
                      : { background: "#ecebe7", color: "var(--ink-mute)", textDecoration: "line-through" }
                }
                title={doc.status === "등록" ? "살아 있는 권리" : doc.status === "공개" ? "심사 중" : "권리 없음 · 선행기술로만 의미"}
              >
                {doc.status}
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {doc.matchedKeywords.map((k) => (
              <span key={k} className="px-1.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--crimson-soft)", color: "var(--crimson)" }}>
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-[family-name:var(--font-display)] text-[22px] font-bold leading-none" style={{ color: "var(--crimson)" }}>
            {doc.score}
          </div>
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-[11px] font-bold underline underline-offset-2" style={{ color: "var(--ink-soft)" }} aria-expanded={open}>
            {open ? "근거 접기" : "왜 선정?"}
          </button>
        </div>
      </div>

      {open && ex && (
        <div className="grid gap-4 border-t px-4 py-4 md:grid-cols-[1fr_1.2fr]" style={{ borderColor: "#eceae6", background: "#fcfbfa" }}>
          <div>
            <div className="mb-2 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
              점수 근거
            </div>
            <ul className="space-y-2">
              {ex.details.map((d) => (
                <li key={d.origin} className="text-[12px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">
                      {d.term}
                      {d.viaSynonym && <span style={{ color: "var(--ink-mute)" }}> (=&nbsp;{d.origin}, 동의어 70%)</span>}
                      {d.partialToken && <span style={{ color: "var(--ink-mute)" }}> (‘{d.partialToken}’만 일치, 점수 절반)</span>}
                    </span>
                    <span className="font-mono">+{d.points}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1" style={{ background: "#e6e5e1" }}>
                      <div className="h-full" style={{ width: `${(d.points / maxPts) * 100}%`, background: "var(--crimson)" }} />
                    </div>
                    <span className="text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
                      {d.fields.join(" · ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            {ex.bonus > 1 && (
              <div className="mt-2 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
                검색어 {ex.details.length}개 동시 일치 <b className="font-mono">×{ex.bonus}</b>
              </div>
            )}
          </div>
          <div>
            {ex.snippet && (
              <>
                <div className="mb-2 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
                  원문 ({ex.snippet.field})
                </div>
                <p className="border-l-2 pl-3 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--crimson)" }}>
                  <Highlight text={ex.snippet.text} term={ex.snippet.term} />
                </p>
              </>
            )}
            {ex.relatedComponents.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
                  관련된 발명 구성
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ex.relatedComponents.map((c) => (
                    <span key={c} className="border px-1.5 py-0.5 text-[11px] font-bold" style={{ borderColor: "var(--rule)" }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!selected && (askReason || excluded) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t px-4 py-2.5 text-[12px]" style={{ borderColor: "#eceae6" }}>
          <span className="mr-1 font-bold" style={{ color: "var(--ink-soft)" }}>
            제외 이유
          </span>
          {EXCLUDE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onReason(r)}
              aria-pressed={excluded === r}
              className="border px-2 py-0.5 font-bold"
              style={excluded === r ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : { borderColor: "var(--rule)" }}
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

// ③ 아깝게 탈락 + 범위 밖
export function NearMissPanel({ meta, onAdd }: { meta: SearchMeta; onAdd: (id: string) => void }) {
  if (meta.nearMiss.items.length === 0 && meta.outOfScope.count === 0) return null;
  return (
    <div className="border bg-white" style={{ borderColor: "var(--rule)" }}>
      {meta.nearMiss.items.length > 0 && (
        <>
          <div className="flex items-baseline justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--rule)" }}>
            <span className="text-[12px] font-extrabold">아깝게 탈락한 문헌</span>
            <span className="text-[11px]" style={{ color: "var(--ink-mute)" }}>
              상위 밖 {meta.nearMiss.total}건 중 {meta.nearMiss.items.length}건
            </span>
          </div>
          <ul className="divide-y" style={{ borderColor: "#eceae6" }}>
            {meta.nearMiss.items.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderColor: "#eceae6" }}>
                <span className="font-mono text-[11px]" style={{ color: "var(--ink-mute)" }}>
                  #{n.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{n.title}</div>
                  <div className="text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
                    {n.reason}
                  </div>
                </div>
                <button type="button" onClick={() => onAdd(n.id)} className="shrink-0 border px-2 py-1 text-[11.5px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]" style={{ borderColor: "var(--rule)" }}>
                  후보에 추가
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      {meta.outOfScope.count > 0 && (
        <div className="border-t px-4 py-3 text-[12px]" style={{ borderColor: "var(--rule)", color: "var(--ink-soft)" }}>
          <b style={{ color: "var(--ink)" }}>범위 밖에서도 검색어와 맞은 문헌 {meta.outOfScope.count}건</b>은 조사 범위(용도·분류) 설정 때문에 제외했습니다.
          {meta.outOfScope.examples.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {meta.outOfScope.examples.map((e) => (
                <li key={e.id}>
                  - {e.title}{" "}
                  <span style={{ color: "var(--ink-mute)" }}>
                    ({[e.usage, e.facet].filter(Boolean).join(" · ")})
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
