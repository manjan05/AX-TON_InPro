"use client";
import type { Matrix } from "@/lib/inpro/matrix";
import type { ComparisonRow, IntakeResult, ReviewDraft, ScopeResult } from "@/lib/inpro/types";
import { componentEvidence, evidenceText, recommendationBasis } from "@/lib/inpro/basis";
import { SCALE, SCORE_AXES, reviewScores, weakestAxes, type ScoreKey } from "@/lib/inpro/scores";
import { STRENGTH_AXES } from "@/lib/inpro/strength";

// 오각형 그래프: 위에서 시계 방향으로 특허성 → 사업 중요도 → 우회 어려움 → 침해 발견 → 입증 용이성
function Radar({ scores }: { scores: Record<ScoreKey, number> }) {
  const W = 400;
  const H = 320;
  const cx = W / 2;
  const cy = 158;
  const R = 112;
  const pt = (i: number, ratio: number) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return [cx + R * ratio * Math.cos(a), cy + R * ratio * Math.sin(a)] as const;
  };
  const poly = (ratio: number) => SCORE_AXES.map((_, i) => pt(i, ratio).join(",")).join(" ");
  const data = SCORE_AXES.map((a, i) => pt(i, scores[a.key] / SCALE));
  const anchor = (i: number) => (i === 0 || i === 2 || i === 3 ? "middle" : i === 1 ? "start" : "end");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full max-w-[400px]" role="img" aria-label={`검토 결과 오각형 그래프: ${SCORE_AXES.map((a) => `${a.label} ${scores[a.key]}점`).join(", ")}`}>
      {Array.from({ length: SCALE }, (_, k) => (
        <polygon key={k} points={poly((k + 1) / SCALE)} fill="none" stroke="#dde3ec" strokeWidth="1" />
      ))}
      {SCORE_AXES.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#dde3ec" strokeWidth="1" />;
      })}
      <polygon points={data.map((p) => p.join(",")).join(" ")} fill="rgba(29,79,216,.14)" stroke="var(--crimson)" strokeWidth="1.8" strokeLinejoin="round" />
      {data.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="4.2" fill="var(--crimson)" />
      ))}
      {SCORE_AXES.map((a, i) => {
        const [x, y] = pt(i, 1.0);
        const dx = i === 1 ? 14 : i === 4 ? -14 : 0;
        const dy = i === 0 ? -26 : i === 2 || i === 3 ? 26 : -2;
        return (
          <text key={a.key} x={x + dx} y={y + dy} textAnchor={anchor(i)} fontSize="13.5" fontWeight="700" fill="var(--ink)">
            <tspan x={x + dx}>{a.label}</tspan>
            <tspan x={x + dx} dy="17" fill="var(--crimson)">
              {scores[a.key]} / {SCALE}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}

export interface ReviewMeta {
  caseNo: string | null;
  title: string;
  inventor: string;
  dept: string;
  stage: string;
  purpose: string;
  disclosure: string; // "학회·전시 2026-12-10 (D-21)" 또는 "없음"
}

// 문서의 칸막이: 가는 선으로 된 표 (실제 사내 서식처럼 머리칸에 옅은 바탕)
const TH = "border px-4 py-2.5 text-left text-[13px] font-bold align-top";
const TD = "border px-4 py-2.5 text-[13.5px] leading-[1.7] align-top";
const LINE = "#cfd6e2";
const HEAD_BG = "#f3f5f9";

function Sec({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h4 className="mb-3 text-[15.5px] font-extrabold">
        {n}. {title}
      </h4>
      {children}
    </section>
  );
}

function MetaCells({ k, val, wide }: { k: string; val: string; wide?: boolean }) {
  return (
    <>
      <th className={`${TH} w-[110px]`} style={{ borderColor: LINE, background: HEAD_BG }}>
        {k}
      </th>
      <td className={TD} style={{ borderColor: LINE }} colSpan={wide ? 3 : 1}>
        {val}
      </td>
    </>
  );
}

// 4단계 화면: 추천 출원 방식 → 검토 결과(그래프와 막대) → 사내 출원 검토서(문서 형식)
export function ReviewResult({ review, matrix, intake, scope, rows, meta }: { review: ReviewDraft; matrix: Matrix | null; intake: IntakeResult; scope: ScopeResult | null; rows: ComparisonRow[]; meta: ReviewMeta }) {
  const scores = reviewScores(review, matrix);
  const weak = scores ? weakestAxes(scores) : [];
  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  const v = matrix?.verdict;
  const opinions: [string, string, string][] = [
    ...(v
      ? ([
          ["신규성", `위험 ${v.novelty.level}`, v.novelty.text],
          ["진보성", `위험 ${v.inventive.level}`, v.inventive.text],
        ] as [string, string, string][])
      : []),
    ["특허성 의견", scores ? `${scores.patentability} / ${SCALE}` : "-", review.patentability],
    ["사업 중요도", scores ? `${scores.business} / ${SCALE}` : review.businessImportance, review.businessReason],
    ["경쟁사 모방 가능성", review.imitationRisk, review.imitationReason],
    ...(review.strength
      ? STRENGTH_AXES.map((a) => {
          const x = review.strength![a.key];
          const ev = x.basis ? componentEvidence(matrix, x.basis) : null;
          return [`권리의 강도 · ${a.label}`, scores ? `${scores[a.key]} / ${SCALE}` : x.level, `${x.reason}${ev ? ` (근거: ${evidenceText(ev)})` : ""}`] as [string, string, string];
        })
      : []),
  ];
  const metaRows: [string, string][][] = [
    [["발명 명칭", meta.title]],
    [
      ["발명자", [meta.inventor, meta.dept].filter(Boolean).join(" / ") || "-"],
      ["작성일", today],
    ],
    [
      ["조사 목적", meta.purpose],
      ["개발 단계", meta.stage],
    ],
    [["외부 공개 예정", meta.disclosure]],
  ];

  return (
    <div>
      <section className="grid gap-x-14 gap-y-4 md:grid-cols-[auto_1fr] md:items-end">
        <div>
          <div className="text-[13px]" style={{ color: "var(--ink-mute)" }}>
            추천 출원 방식
          </div>
          <div className="mt-1.5 font-[family-name:var(--font-display)] text-[48px] font-extrabold leading-none tracking-[-.04em]" style={{ color: "var(--crimson)" }}>
            {review.recommendation}
          </div>
        </div>
        <p className="max-w-[640px] pb-1 text-[14px] leading-[1.8]" style={{ color: "var(--ink-soft)" }}>
          {review.reason} 최종 결정은 6단계에서 담당자와 승인자가 확정합니다.
        </p>
      </section>

      {scores && (
        <section className="mt-12 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
          <h3 className="flex flex-wrap items-baseline gap-3 text-[18px] font-extrabold">
            검토 결과
            <span className="text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
              7단계 기준, 7이 가장 유리
            </span>
          </h3>
          <div className="mt-6 grid items-center gap-x-14 gap-y-8 md:grid-cols-[400px_1fr]">
            <Radar scores={scores} />
            <div>
              <ul>
                {SCORE_AXES.map((a) => (
                  <li key={a.key} className="grid grid-cols-[96px_1fr_44px] items-center gap-4 border-b py-3.5 text-[14px] first:pt-0" style={{ borderColor: "var(--rule)" }}>
                    <span>{a.label}</span>
                    <span className="h-2 overflow-hidden rounded-full" style={{ background: "#e3e8f0" }} aria-hidden="true">
                      <span className="block h-full rounded-full" style={{ width: `${(scores[a.key] / SCALE) * 100}%`, background: "var(--crimson)" }} />
                    </span>
                    <span className="text-right text-[13px] font-bold">
                      {scores[a.key]} / {SCALE}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[12.5px] leading-[1.7]" style={{ color: "var(--ink-mute)" }}>
                가장 약한 축은 {weak.join("과 ")}입니다. 5단계에서 경쟁사 회피 시도를 확인한 뒤 다시 계산합니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 사내 출원 검토서: 조사기관 보고서처럼 조사 개요 → 선행기술 대비 → 종합 의견 → 추천과 조치 */}
      <article className="mx-auto mt-14 max-w-[860px] border bg-white px-6 py-10 sm:px-12" style={{ borderColor: LINE }} aria-label="사내 출원 검토서">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="font-mono text-[11px] tracking-[.16em]" style={{ color: "var(--ink-mute)" }}>
              InPro · {meta.caseNo ?? "CASE"}
            </div>
            <h3 className="mt-2 text-[26px] font-extrabold tracking-[-.02em]">사내 출원 검토서</h3>
          </div>
          {/* 결재란 */}
          <table className="border-collapse text-center text-[12px]" aria-label="결재란">
            <tbody>
              <tr>
                {["작성", "검토", "승인"].map((h) => (
                  <th key={h} className="w-[76px] border px-2 py-1.5 font-bold" style={{ borderColor: LINE, background: HEAD_BG }}>
                    {h}
                  </th>
                ))}
              </tr>
              <tr>
                <td className="h-[52px] border px-2 text-[11px]" style={{ borderColor: LINE, color: "var(--ink-soft)" }}>
                  InPro AI
                  <br />
                  초안
                </td>
                <td className="border" style={{ borderColor: LINE }} />
                <td className="border" style={{ borderColor: LINE }} />
              </tr>
            </tbody>
          </table>
        </header>

        <table className="mt-7 w-full border-collapse">
          <tbody>
            {metaRows.map((pair) => (
              <tr key={pair[0][0]}>
                {pair.map(([k, val]) => (
                  <MetaCells key={k} k={k} val={val} wide={pair.length === 1} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <Sec n={1} title="검토 요약">
          <p className="text-[14px] leading-[1.85]">{review.summary}</p>
        </Sec>

        <Sec n={2} title="선행기술 대비">
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr style={{ background: HEAD_BG }}>
                    <th className={TH} style={{ borderColor: LINE }}>
                      발명 구성
                    </th>
                    <th className={TH} style={{ borderColor: LINE }}>
                      가장 가까운 문헌
                    </th>
                    <th className={`${TH} w-[84px]`} style={{ borderColor: LINE }}>
                      판단
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.componentId}-${r.docId}`}>
                      <td className={`${TD} font-bold`} style={{ borderColor: LINE }}>
                        {r.componentId} {r.componentName}
                      </td>
                      <td className={TD} style={{ borderColor: LINE }}>
                        {r.docTitle || "해당 없음"}
                        {r.quote && (
                          <div className="mt-1 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                            “{r.quote.length > 90 ? `${r.quote.slice(0, 90)}…` : r.quote}”
                          </div>
                        )}
                      </td>
                      <td className={TD} style={{ borderColor: LINE }}>
                        {r.relation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {review.differences.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-[13.5px] font-bold">선행 문헌과 다른 점 후보</div>
              <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-[1.8]">
                {review.differences.map((d, i) => {
                  const ev = review.differenceBasis?.[i] ? componentEvidence(matrix, review.differenceBasis[i]) : null;
                  return (
                    <li key={d}>
                      {d}
                      {ev && (
                        <div className="text-[12.5px] leading-[1.6]" style={{ color: "var(--ink-soft)" }}>
                          근거 · {ev.componentName} — {evidenceText(ev)}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </Sec>

        <Sec n={3} title="종합 의견">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr style={{ background: HEAD_BG }}>
                  <th className={`${TH} w-[170px]`} style={{ borderColor: LINE }}>
                    평가 항목
                  </th>
                  <th className={`${TH} w-[96px]`} style={{ borderColor: LINE }}>
                    평가
                  </th>
                  <th className={TH} style={{ borderColor: LINE }}>
                    의견
                  </th>
                </tr>
              </thead>
              <tbody>
                {opinions.map(([k, val, text]) => (
                  <tr key={k}>
                    <td className={`${TD} font-bold`} style={{ borderColor: LINE }}>
                      {k}
                    </td>
                    <td className={TD} style={{ borderColor: LINE }}>
                      {val}
                    </td>
                    <td className={TD} style={{ borderColor: LINE }}>
                      {text}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>

        <Sec n={4} title="추천 및 조치 사항">
          <p className="text-[14px] leading-[1.85]">
            <b>추천 출원 방식: {review.recommendation}</b> — {review.reason}
          </p>
          <div className="mt-4 text-[13.5px] font-bold">추천에 쓴 사실</div>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] leading-[1.75]" style={{ color: "var(--ink-soft)" }}>
            {recommendationBasis(intake, review, matrix, scope).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          {review.openIssues.length > 0 && (
            <>
              <div className="mt-5 text-[13.5px] font-bold">변리사 전달 전 조치 필요 사항</div>
              <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[14px] leading-[1.8]">
                {review.openIssues.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ol>
            </>
          )}
        </Sec>

        <p className="mt-10 border-t pt-4 text-[12px] leading-[1.7]" style={{ borderColor: LINE, color: "var(--ink-mute)" }}>
          ※ 이 문서는 InPro AI가 쓴 초안입니다. 인용은 원문 확인을 거쳤으나 신규성·진보성·침해 여부의 최종 판단은 담당자와 변리사가 합니다.
        </p>
      </article>
    </div>
  );
}
