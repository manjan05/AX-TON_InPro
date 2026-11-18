import type { ComparisonRow, Decision, Disclosure, IntakeResult, ReviewDraft, ScopeResult } from "./types";
import { disclosureStatus } from "./disclosure";
import { STRENGTH_AXES, overallStrength } from "./strength";
import { componentEvidence, distinctionSummary, evidenceText, recommendationBasis } from "./basis";
import { effectOf, trustOf } from "./designaround";
import { verdictLabels, type Matrix } from "./matrix";

export interface CaseEvent {
  at: string; // ISO
  actor: "연구원" | "InPro AI" | "담당자" | "승인자";
  text: string;
}

export interface SurveyRecord {
  stage: string;
  at: string;
  changedCount: number;
  note: string;
}

export interface HandoffInput {
  description: string;
  intake: IntakeResult;
  qa: { question: string; answer: string }[];
  rows: ComparisonRow[];
  review: ReviewDraft;
  scope: ScopeResult | null;
  decision: Decision;
  decisionMemo: string;
  approver: string;
  approvedAt: string;
  searchLog: { searchedAt: string; keywords: string[]; corpus: string } | null;
  disclosure: Disclosure | null;
  surveys: SurveyRecord[];
  exclusions?: { id: string; title: string; reason: string }[];
  matrix?: Matrix | null;
  purpose?: string;
}

const SYM = { 있음: "●", 일부: "◐", 없음: "○", "확인 필요": "?" } as const;

export function matrixMarkdown(m: Matrix): string[] {
  const head = `| 구성 | ${m.docs.map((d) => d.label).join(" | ")} |`;
  const sep = `|---|${m.docs.map(() => "---").join("|")}|`;
  const body = m.components.map(
    (c) => `| ${c.id} ${c.name} | ${m.docs.map((d) => SYM[m.cells.find((x) => x.componentId === c.id && x.docId === d.id)?.presence ?? "확인 필요"]).join(" | ")} |`
  );
  const v = m.verdict;
  const lines = (x: Matrix["verdict"]) => {
    const L = verdictLabels(x.mode);
    return [`- ${L.cards[0][0]} ${x.novelty.level}: ${x.novelty.text}`, `- ${L.cards[1][0]} ${x.inventive.level}: ${x.inventive.text}`];
  };
  return [
    ...(v.fto ? ["[출원 검토 — 고른 문헌 전부]", ...lines(v), "[침해 위험 — 등록 특허만]", ...lines(v.fto)] : lines(v)),
    "",
    head,
    sep,
    ...body,
    "",
    ...m.docs.map((d) => `- ${d.label}: ${d.title} (${d.id})${d.live ? " · 등록" : ""}`),
    "- ● 있음(원문 인용 확인) ◐ 일부 ○ 없음 ? 확인 필요",
    "",
  ];
}

export function openQuestions(input: Pick<HandoffInput, "qa" | "review" | "rows">): string[] {
  const unanswered = input.qa.filter((q) => !q.answer.trim()).map((q) => q.question);
  const weak = input.rows
    .filter((r) => r.relation === "근거 부족")
    .map((r) => `${r.componentName}: ${r.nextCheck}`);
  return Array.from(new Set([...unanswered, ...input.review.openIssues, ...weak]));
}

const fmt = (iso: string) => new Date(iso).toLocaleString("ko-KR");

// 변리사 전달자료 (Markdown). 연구원이 확인한 사실과 AI 제안을 나눠 표기한다.
export function buildHandoffMarkdown(input: HandoffInput): string {
  const { intake, rows, review, scope } = input;
  const answered = input.qa.filter((q) => q.answer.trim());
  const disc = input.disclosure ? disclosureStatus(input.disclosure) : null;
  const lines: string[] = [
    `# 변리사 전달자료: ${intake.title}`,
    "",
    `- 기술 분야: ${intake.field}`,
    input.purpose ? `- 조사 목적: ${input.purpose}` : "",
    `- 사내 결정: ${input.decision} (승인: ${input.approver}, ${fmt(input.approvedAt)})`,
    input.decisionMemo ? `- 결정 메모: ${input.decisionMemo}` : "",
    disc && input.disclosure ? `- 공개 예정: ${input.disclosure.date} ${input.disclosure.type} (${disc.message})` : "",
    `- 표기: [연구원 확인] 연구원이 제출·답변한 사실 / [AI 제안] InPro가 만든 초안, 담당자 검토 완료`,
    "",
    ...(scope
      ? [
          "## 0. 차별점과 권리범위 요약 [경쟁사 회피 검토 + 원문 확인된 비교표]",
          "",
          scope.strategy,
          "",
          "| 구성 | 구분 | 선행 문헌 근거 | 권리에 담는 방법 |",
          "|---|---|---|---|",
          ...distinctionSummary(scope, input.matrix ?? null).map((r) => `| ${r.componentName} | ${r.role} | ${r.evidence} | ${r.advice} |`),
          "",
        ]
      : []),
    "## 1. 발명 설명 [연구원 확인]",
    "",
    input.description.trim(),
    "",
    ...(answered.length
      ? ["### 발명자 인터뷰 답변 [연구원 확인]", "", ...answered.flatMap((q) => [`- Q. ${q.question}`, `  - A. ${q.answer.trim()}`]), ""]
      : []),
    "## 2. 해결하려는 문제와 구성 요소 [AI 제안]",
    "",
    intake.problem,
    "",
    ...intake.components.map((c) => `- ${c.id} ${c.name}: ${c.description}`),
    "",
    "## 3. 선행 문헌 비교표 [AI 제안, 원문 인용 확인됨]",
    "",
    ...(input.matrix ? ["### 구성 × 문헌 매트릭스", "", ...matrixMarkdown(input.matrix), "### 구성별 요약", ""] : []),
    "| 구성 | 가장 가까운 문헌 | 판단 | 원문 근거 | 다음 확인 |",
    "|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.componentName} | ${r.docTitle ? `${r.docTitle} (${r.docId})` : "없음"} | ${r.relation} | ${r.quote ? `"${r.quote}"` : "근거 없음"} | ${r.nextCheck} |`
    ),
    "",
    "## 4. 특허성·사업성 검토 [AI 초안 → 담당자 확정]",
    "",
    review.summary,
    "",
    `- 특허성: ${review.patentability}`,
    `- 사업 중요도: ${review.businessImportance} — ${review.businessReason}`,
    `- 경쟁사 모방 가능성: ${review.imitationRisk} — ${review.imitationReason}`,
    ...(review.strength
      ? [
          "",
          `권리의 강도: ${overallStrength(review.strength).level} — ${overallStrength(review.strength).text}`,
          ...STRENGTH_AXES.map((a) => `- ${a.label} ${review.strength![a.key].level}: ${review.strength![a.key].reason} (근거 구성: ${review.strength![a.key].basis})`),
        ]
      : []),
    ...(review.differences.length
      ? [
          "",
          "다른 점 후보 (근거: 원문 확인된 매트릭스):",
          ...review.differences.map((d, i) => {
            const ev = review.differenceBasis?.[i] ? componentEvidence(input.matrix ?? null, review.differenceBasis[i]) : null;
            return `- ${d}${ev ? `\n  - 근거: ${ev.componentName} — ${evidenceText(ev)}` : ""}`;
          }),
        ]
      : []),
    "",
    `AI 추천 ${review.recommendation}의 근거:`,
    ...recommendationBasis(intake, review, input.matrix ?? null, scope ?? null).map((f) => `- ${f}`),
    input.decision !== review.recommendation ? `- 담당자는 AI 추천과 다르게 '${input.decision}'로 결정 (이유: ${input.decisionMemo || "-"})` : "",
    "",
    ...(scope
      ? [
          "## 5. 권리범위 설계 방향 [AI 제안 → 담당자 확정, 청구항 작성은 변리사님께]",
          "",
          scope.strategy,
          "",
          "| 구성 | 구분 | 경쟁사 회피 시도 (효과) | 우회 난이도 | 권리에 담는 방법 |",
          "|---|---|---|---|---|",
          ...scope.items.map(
            (i) =>
              `| ${i.componentName} | ${i.role} | ${i.attempts?.length ? i.attempts.map((a) => `${a.method}(${effectOf(a)}·${trustOf(a)})`).join(", ") : i.alternatives} | ${i.designAround} | ${i.advice ?? ""} |`
          ),
          "",
        ]
      : []),
    "## 6. 변리사님께 드리는 질문과 남은 쟁점",
    "",
    ...openQuestions(input).map((q) => `- ${q}`),
    "",
    "## 7. 조사 기록",
    "",
    input.searchLog
      ? `- 최근 조사: ${fmt(input.searchLog.searchedAt)} / ${input.searchLog.corpus} / 키워드: ${input.searchLog.keywords.join(", ")}`
      : "- 기록 없음",
    ...input.surveys.map((s) => `- [${s.stage}] ${fmt(s.at)} · 판단 바뀐 구성 ${s.changedCount}개${s.note ? ` · ${s.note}` : ""}`),
    ...(input.exclusions?.length
      ? ["", "제외한 후보 문헌 (담당자 판단):", ...input.exclusions.map((e) => `- ${e.title} (${e.id}) — ${e.reason}`)]
      : []),
    "- 신규성·진보성, 침해 여부의 최종 판단은 변리사님께 요청드립니다.",
  ];
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}

// 무효자료 조사 보고서: 대상 특허 구성 × 먼저 나온 문헌. 무효 여부의 판단은 변리사 감정으로.
export function buildInvalidityMarkdown(input: {
  target: { doc: { id: string; title: string; applicant: string; year: number | null; claims: string }; components: { id: string; name: string; description: string }[] };
  matrix: Matrix;
  rows: ComparisonRow[];
  searchLog?: { searchedAt: string; corpus: string; keywords: string[] } | null;
}): string {
  const { target, matrix, rows } = input;
  const lines = [
    `# 무효자료 조사 보고서: ${target.doc.title}`,
    "",
    `- 대상 특허: ${target.doc.id} · ${target.doc.applicant} · ${target.doc.year ?? "-"}년 출원`,
    `- 조사 범위: 대상 특허보다 먼저 출원된 문헌 (같은 해 출원은 날짜 확인 필요로 제외)`,
    input.searchLog ? `- 조사 기록: ${fmt(input.searchLog.searchedAt)} / ${input.searchLog.corpus} / 키워드: ${input.searchLog.keywords.join(", ")}` : "",
    "",
    "## 1. 대상 특허 대표 청구항",
    "",
    target.doc.claims,
    "",
    "## 2. 청구항 구성요소 [AI 제안 → 담당자 확인]",
    "",
    ...target.components.map((c) => `- ${c.id} ${c.name}: ${c.description}`),
    "",
    "## 3. 구성 × 먼저 나온 문헌",
    "",
    ...matrixMarkdown(matrix),
    "## 4. 구성별 가장 가까운 문헌",
    "",
    "| 구성 | 문헌 | 판단 | 원문 근거 |",
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.componentName} | ${r.docTitle ? `${r.docTitle} (${r.docId})` : "없음"} | ${r.relation} | ${r.quote ? `"${r.quote}"` : "근거 없음"} |`),
    "",
    "- 무효 여부의 최종 판단은 변리사 감정으로 요청드립니다.",
  ];
  return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
}
