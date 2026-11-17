// 판단 근거 (IP 실무자 피드백 5): AI의 결론("다른 점", "우회 어려움", "추천")마다
// 어느 선행 문헌의 어느 문장과 비교했는지, 어떤 사실을 썼는지를 서버가 붙인다.
// AI는 근거가 된 구성 이름만 고르고, 문헌·인용은 원문 확인을 거친 매트릭스에서 가져온다.
import type { Matrix, Presence } from "./matrix";
import type { IntakeResult, ReviewDraft, ScopeResult } from "./types";
import { overallStrength, secretHint } from "./strength";

export interface ComponentEvidence {
  componentName: string;
  closest: { label: string; title: string; presence: Presence; quote: string | null; note: string } | null;
  absentIn: string[]; // 이 구성이 없는 문헌
  total: number;
}

const rank: Record<Presence, number> = { 있음: 3, 일부: 2, "확인 필요": 1, 없음: 0 };

export function componentEvidence(m: Matrix | null, componentName: string): ComponentEvidence | null {
  if (!m) return null;
  const comp = m.components.find((c) => c.name === componentName) ?? m.components.find((c) => componentName.includes(c.name) || c.name.includes(componentName));
  if (!comp) return null;
  const cells = m.cells.filter((c) => c.componentId === comp.id).sort((a, b) => rank[b.presence] - rank[a.presence]);
  const label = (id: string) => m.docs.find((d) => d.id === id);
  const top = cells[0] && rank[cells[0].presence] >= rank["일부"] ? cells[0] : null;
  return {
    componentName: comp.name,
    closest: top ? { label: label(top.docId)?.label ?? "", title: label(top.docId)?.title ?? "", presence: top.presence, quote: top.quote, note: top.note } : null,
    absentIn: cells.filter((c) => c.presence === "없음").map((c) => label(c.docId)?.label ?? ""),
    total: m.docs.length,
  };
}

// 한 줄 설명: "문헌 B에 일부 있음 ('…') · 문헌 A, C에는 없음"
export function evidenceText(e: ComponentEvidence): string {
  const head = e.closest
    ? `${e.closest.label}에 ${e.closest.presence === "있음" ? "있음" : "일부만 있음"}${e.closest.quote ? ` ("${e.closest.quote}")` : ""}`
    : `비교한 문헌 ${e.total}건 어디에도 없음`;
  const tail = e.closest && e.absentIn.length ? ` · ${e.absentIn.join(", ")}에는 없음` : "";
  return head + tail;
}

// AI 추천 출원 방식의 근거로 쓴 사실들
export function recommendationBasis(intake: IntakeResult, review: ReviewDraft, matrix: Matrix | null, scope: ScopeResult | null): string[] {
  const facts: string[] = [];
  if (matrix) {
    const per = matrix.components.map((c) => componentEvidence(matrix, c.name)!);
    const full = per.filter((e) => e.closest?.presence === "있음").length;
    const partial = per.filter((e) => e.closest && e.closest.presence !== "있음").length;
    facts.push(`선행 문헌 대비: 구성 ${per.length}개 중 그대로 있음 ${full} · 일부 ${partial} · 어디에도 없음 ${per.length - full - partial}`);
    facts.push(`매트릭스 판정: 신규성 위험 ${matrix.verdict.novelty.level} · 진보성 위험 ${matrix.verdict.inventive.level}`);
  }
  facts.push(`사업 중요도 ${review.businessImportance} · 경쟁사 모방 가능성 ${review.imitationRisk}`);
  if (review.strength) {
    const o = overallStrength(review.strength);
    facts.push(`권리의 강도 ${o.level}${o.level !== "높음" ? ` (가장 약한 축: ${o.weakest})` : ""}`);
    const hint = secretHint(review.strength);
    if (hint) facts.push("침해 발견·입증이 모두 어려움 → 영업비밀 검토 대상");
  }
  if (scope) {
    const core = scope.items.filter((i) => i.role === "핵심").length;
    const alt = scope.items.filter((i) => i.role === "대체 가능").length;
    facts.push(`경쟁사 회피 검토: 핵심 ${core} · 대체 가능 ${alt}`);
  }
  if (intake.missing.length) facts.push(`출원 체크리스트 빠진 항목 ${intake.missing.length}개 (${intake.missing.map((m) => m.item).join(", ")})`);
  return facts;
}

// 변리사 전달자료 첫 장: 차별점 → 권리범위. 구성마다 경쟁사 회피 검토 구분, 선행 문헌 근거, 권리에 담는 방법.
export interface DistinctionRow {
  componentName: string;
  role: string;
  evidence: string;
  advice: string;
}

export function distinctionSummary(scope: ScopeResult | null, matrix: Matrix | null): DistinctionRow[] {
  if (!scope) return [];
  const order: Record<string, number> = { 핵심: 0, "대체 가능": 1, 부가: 2 };
  return [...scope.items]
    .sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3))
    .map((i) => {
      const ev = componentEvidence(matrix, i.componentName);
      return { componentName: i.componentName, role: i.role, evidence: ev ? evidenceText(ev) : "비교표에 없음", advice: i.advice ?? "" };
    });
}
