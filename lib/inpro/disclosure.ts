import type { Disclosure } from "./types";

export const DISCLOSURE_TYPES = ["논문 발표", "학회·전시", "고객 제안·IR", "웹·SNS 공개", "제품 출시"];

export function daysUntil(dateStr: string, today: Date = new Date()): number {
  const target = new Date(`${dateStr}T00:00:00`);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86_400_000);
}

export type DisclosureLevel = "지남" | "긴급" | "주의" | "여유";

// 공개 전 출원 알림 (팀장 인터뷰 질문 5: "외부 공개, 전시, 제안, 논문 발표 전에 출원 필요성을 확인")
export function disclosureStatus(d: Disclosure, today: Date = new Date()) {
  const days = daysUntil(d.date, today);
  const level: DisclosureLevel = days < 0 ? "지남" : days <= 14 ? "긴급" : days <= 60 ? "주의" : "여유";
  const message =
    level === "지남"
      ? `${d.type}로 이미 공개됐을 수 있습니다(${-days}일 지남). 국내 공지예외 적용 가능성과 해외 출원 영향을 변리사에게 바로 확인하세요.`
      : level === "긴급"
        ? `${d.type}까지 ${days}일. 공개 전에 출원 여부를 결정해야 합니다. 해외는 공개 후 출원이 어려운 국가가 많습니다.`
        : level === "주의"
          ? `${d.type}까지 ${days}일. 출원이 필요하면 지금 변리사 일정을 잡으세요.`
          : `${d.type}까지 ${days}일 남았습니다.`;
  return { days, level, message };
}
