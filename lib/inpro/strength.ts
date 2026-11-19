// 권리의 강도 (IP 실무자 피드백 3): 특허를 받을 수 있는지와 별개로,
// 받은 특허가 실제로 경쟁사를 막을 수 있는지를 세 가지로 본다.
//  - 우회 어려움: 경쟁사가 이 권리를 피해 같은 효과를 내기 어려운가
//  - 침해 발견: 시중 경쟁 제품을 보고 침해를 알아챌 수 있는가 (외관·구조 vs 내부 제어·공정)
//  - 입증 용이성: 분해·측정으로 침해 증거를 확보할 수 있는가
// AI는 축마다 수준과 근거(어느 구성 때문인지)를 내고, 종합 강도는 서버가 "가장 약한 축"으로 정한다.
import type { Level } from "./types";

export interface StrengthAxis {
  level: Level; // 높음 = 권리에 유리
  score?: number; // 1~7점 (7이 가장 유리). level은 이 점수에서 서버가 정한다
  reason: string;
  basis: string; // 근거가 된 구성 이름
}

export interface RightsStrength {
  designAround: StrengthAxis;
  detectability: StrengthAxis;
  provability: StrengthAxis;
}

export const STRENGTH_AXES: { key: keyof RightsStrength; label: string; question: string }[] = [
  { key: "designAround", label: "우회 어려움", question: "경쟁사가 피해 가기 어려운가" },
  { key: "detectability", label: "침해 발견", question: "경쟁 제품을 보고 침해를 알 수 있나" },
  { key: "provability", label: "입증 용이성", question: "분해·측정으로 증거를 잡을 수 있나" },
];

const rank: Record<Level, number> = { 낮음: 0, 보통: 1, 높음: 2 };

// 권리는 가장 약한 고리만큼만 강하다: 피하기 쉽거나, 침해를 몰라보거나, 증명하지 못하면 막지 못한다
export function overallStrength(s: RightsStrength): { level: Level; weakest: string; text: string } {
  const weakest = [...STRENGTH_AXES].sort((a, b) => rank[s[a.key].level] - rank[s[b.key].level])[0];
  const w = s[weakest.key];
  const level = w.level;
  const text =
    level === "높음"
      ? "세 축 모두 높습니다. 경쟁사를 실제로 막을 수 있는 권리가 될 가능성이 큽니다."
      : `가장 약한 축은 ${weakest.label}(${w.level})입니다. ${w.reason}`;
  return { level, weakest: weakest.label, text };
}

// 발견·입증이 모두 낮으면 특허로 공개하기보다 영업비밀이 나을 수 있다
export function secretHint(s: RightsStrength): string | null {
  return s.detectability.level === "낮음" && s.provability.level === "낮음"
    ? "침해를 발견하기도, 입증하기도 어렵습니다. 특허로 공개하기보다 영업비밀로 지키는 방안도 검토하세요."
    : null;
}
