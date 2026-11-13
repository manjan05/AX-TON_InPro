// 발명 접수 체크리스트: "빠진 항목"을 AI 감이 아니라 고정 기준으로 정한다.
// 특허 명세서(발명의 설명)를 쓰려면 꼭 있어야 하는 항목들이다.
// AI는 항목마다 자료에서 근거 문장을 찾아오고, 서버가 그 문장이 자료에 실제로 있는지 확인한다.
import { quoteExists } from "./evidence";
import type { MissingItem } from "./types";

export const CHECKLIST = [
  { id: "problem", name: "해결 과제", why: "기존 기술의 어떤 문제를 푸는지 있어야 발명의 목적을 쓸 수 있습니다." },
  { id: "components", name: "핵심 구성", why: "발명을 이루는 부품·단계가 있어야 청구항을 쓸 수 있습니다." },
  { id: "operation", name: "구성 간 연결·작동", why: "구성끼리 어떻게 연결되고 작동하는지 있어야 단순 나열이 아닌 발명이 됩니다." },
  { id: "conditions", name: "구체적 조건", why: "치수·재질·범위 같은 수치 조건이 있어야 실시 예를 쓰고 권리 범위를 정할 수 있습니다." },
  { id: "effect", name: "효과 수치", why: "효과를 숫자로 보여야 진보성을 주장할 수 있습니다." },
  { id: "baseline", name: "비교 대상", why: "무엇보다 나아졌는지(기존 제품·종래 기술)가 있어야 효과가 설득력을 가집니다." },
  { id: "drawings", name: "도면·형상 자료", why: "형상 발명은 도면 없이 명세서를 쓰기 어렵습니다." },
  { id: "variants", name: "변형 예", why: "다른 형태로도 되는지 있어야 권리 범위를 넓게 잡을 수 있습니다." },
] as const;

export type ChecklistId = (typeof CHECKLIST)[number]["id"];
export type CheckStatus = "충족" | "부족" | "없음";

export interface RawCheck {
  id: string;
  status: CheckStatus;
  quote: string;
  note: string;
}

export interface CheckResult {
  id: ChecklistId;
  name: string;
  why: string;
  status: CheckStatus;
  quote: string | null; // 자료에서 확인된 근거 문장만
  note: string;
}

// '충족'은 근거 문장이 자료에 실제로 있을 때만 인정한다. 아니면 '부족'으로 낮춘다.
export function verifyChecklist(raw: RawCheck[], source: string): CheckResult[] {
  return CHECKLIST.map((item) => {
    const r = raw.find((x) => x.id === item.id);
    if (!r) return { ...item, status: "없음", quote: null, note: "AI가 이 항목을 판단하지 않았습니다." };
    const verified = quoteExists(source, r.quote);
    if (r.status === "충족" && !verified) {
      return { ...item, status: "부족", quote: null, note: `자료에서 근거 문장을 확인하지 못했습니다. ${r.note}`.trim() };
    }
    return { ...item, status: r.status, quote: verified ? r.quote.trim() : null, note: r.note };
  });
}

// 빠진 항목 = 체크리스트에서 '충족'이 아닌 칸
export function missingFrom(checks: CheckResult[]): MissingItem[] {
  return checks
    .filter((c) => c.status !== "충족")
    .map((c) => ({ item: c.name, why: c.status === "부족" && c.note ? `${c.note} (${c.why})` : c.why }));
}
