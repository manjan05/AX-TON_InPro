// 권리범위 설계 (IP 실무자 피드백 4): 청구항을 쓰기 전에 "경쟁사라면 이 권리를 어떻게 피할까"를 먼저 본다.
// AI는 구성마다 경쟁사의 회피 시도를 내고(바꿀 수단, 효과가 유지되는지), 핵심/대체 가능/부가 구분은
// 서버가 그 결과로 정한다. 그래서 "왜 핵심인가"가 회피 시도로 설명된다.
import type { Level, ScopeItem, ScopeRole } from "./types";

export type KeepsEffect = "유지" | "일부" | "안 됨";

export interface DesignAroundAttempt {
  method: string; // 경쟁사가 바꿔 쓸 수단
  keepsEffect: KeepsEffect; // 바꿔도 같은 효과가 나는가
  why: string;
}

export interface RawScopeItem {
  componentName: string;
  essential: boolean; // 발명의 효과를 내는 데 꼭 필요한 구성인가
  attempts: DesignAroundAttempt[];
}

export function classify(raw: RawScopeItem): Pick<ScopeItem, "role" | "designAround" | "reason" | "alternatives" | "advice" | "attempts"> {
  const keeps = raw.attempts.filter((a) => a.keepsEffect === "유지");
  const partial = raw.attempts.filter((a) => a.keepsEffect === "일부");
  const designAround: ScopeItem["designAround"] = keeps.length ? "쉬움" : partial.length ? "보통" : "어려움";
  const role: ScopeRole = !raw.essential ? "부가" : keeps.length ? "대체 가능" : "핵심";
  const names = (xs: DesignAroundAttempt[]) => xs.map((a) => `‘${a.method}’`).join(", ");
  const reason =
    role === "부가"
      ? "발명의 효과를 내는 데 꼭 필요한 구성이 아닙니다."
      : role === "대체 가능"
        ? `경쟁사가 ${names(keeps)}(으)로 바꿔도 같은 효과가 납니다. 이 구체적 형태로 권리를 좁히면 쉽게 피합니다.`
        : raw.attempts.length && partial.length === raw.attempts.length
          ? `경쟁사의 회피 시도 ${raw.attempts.length}가지(${names(raw.attempts)}) 모두 효과를 일부만 냅니다. 같은 효과를 내는 대체 수단은 없습니다.`
          : raw.attempts.length
          ? `경쟁사의 회피 시도 ${raw.attempts.length}가지(${names(raw.attempts)}) 모두 같은 효과를 내지 못합니다.${partial.length ? ` 다만 ${names(partial)}은(는) 효과 일부를 냅니다.` : ""}`
          : "효과에 꼭 필요하고, 바꿔 쓸 수단이 보이지 않습니다.";
  const advice =
    role === "핵심"
      ? "독립항의 중심에 둡니다."
      : role === "대체 가능"
        ? `구체적 형태 대신 상위 개념으로 표현하거나, ${names(keeps)}을(를) 실시예로 함께 적어 회피를 막습니다.`
        : "종속항이나 실시예로 둡니다.";
  return { role, designAround, reason, alternatives: raw.attempts.map((a) => a.method).join(", "), advice, attempts: raw.attempts };
}

// 4단계 '권리의 강도'와 어긋나는지: 4단계는 우회 어려움을 높게 봤는데, 그 근거 구성이 실제로는 대체 가능할 때
export function strengthConflict(
  items: ScopeItem[],
  designAroundAxis: { level: Level; basis: string } | undefined
): { item: ScopeItem; suggested: Level } | null {
  if (!designAroundAxis) return null;
  const item = items.find((i) => i.componentName === designAroundAxis.basis) ?? items.find((i) => i.role === "핵심" || i.role === "대체 가능");
  if (!item) return null;
  const suggested: Level = item.designAround === "쉬움" ? "낮음" : item.designAround === "보통" ? "보통" : "높음";
  const rank: Record<Level, number> = { 낮음: 0, 보통: 1, 높음: 2 };
  return rank[designAroundAxis.level] > rank[suggested] ? { item, suggested } : null;
}
