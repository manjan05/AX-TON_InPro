// 4단계 검토 결과를 7단계 점수로 보여준다 (멘토링: 높음/낮음 한쪽으로 쏠리지 않게 홀수 7단계).
// 점수가 높을수록 출원에 유리하다. 7점 만점은 쓰지 않는다: 특허 등록은 단정할 수 없다.
import type { Level, ReviewDraft } from "./types";
import type { Matrix } from "./matrix";
import { overallStrength } from "./strength";

export const SCALE = 7;

// 점수 → 세 단계 수준 (기존 화면·전달자료가 쓰는 높음/보통/낮음)
export const levelOf = (n: number): Level => (n >= 5 ? "높음" : n <= 3 ? "낮음" : "보통");

// 예전에 만든 검토서(수준만 있는 경우)를 점수로 바꿀 때
export const scoreOfLevel = (l: Level): number => (l === "높음" ? 6 : l === "낮음" ? 2 : 4);

// 특허성 점수는 AI가 아니라 비교표 판정(신규성·진보성 위험, 어느 문헌에도 없는 구성)으로 서버가 계산한다
export function patentabilityScore(v: Pick<Matrix["verdict"], "novelty" | "inventive" | "unique">): number {
  const pts = (lv: string) => (lv === "낮음" ? 3 : lv === "주의" ? 1 : 0);
  return Math.min(SCALE - 1, 1 + pts(v.novelty.level) + pts(v.inventive.level) + (v.unique.length >= 1 ? 1 : 0));
}

export type ScoreKey = "patentability" | "business" | "designAround" | "detectability" | "provability";
export const SCORE_AXES: { key: ScoreKey; label: string }[] = [
  { key: "patentability", label: "특허성" },
  { key: "business", label: "사업 중요도" },
  { key: "designAround", label: "우회 어려움" },
  { key: "detectability", label: "침해 발견" },
  { key: "provability", label: "입증 용이성" },
];

export function reviewScores(review: ReviewDraft, matrix: Matrix | null): Record<ScoreKey, number> | null {
  if (!review.strength) return null;
  const s = review.strength;
  return {
    patentability: matrix ? patentabilityScore(matrix.verdict) : 4,
    business: review.businessScore ?? scoreOfLevel(review.businessImportance),
    designAround: s.designAround.score ?? scoreOfLevel(s.designAround.level),
    detectability: s.detectability.score ?? scoreOfLevel(s.detectability.level),
    provability: s.provability.score ?? scoreOfLevel(s.provability.level),
  };
}

// 권리의 강도 세 축 중 가장 낮은 축들 (같으면 모두)
export function weakestAxes(scores: Record<ScoreKey, number>): string[] {
  const strength = SCORE_AXES.filter((a) => a.key === "designAround" || a.key === "detectability" || a.key === "provability");
  const min = Math.min(...strength.map((a) => scores[a.key]));
  return strength.filter((a) => scores[a.key] === min).map((a) => a.label);
}

export { overallStrength };
