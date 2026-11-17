import { describe, expect, it } from "vitest";
import { componentEvidence, distinctionSummary, evidenceText, recommendationBasis } from "./basis";
import { buildMatrix } from "./matrix";
import type { IntakeResult, ReviewDraft } from "./types";

const comps = [
  { id: "C1", name: "1차 주름", description: "" },
  { id: "C2", name: "2차 주름", description: "" },
];
const docs = [
  { id: "A", title: "주름 필터", abstract: "여과재를 삼각 주름으로 접는다." },
  { id: "B", title: "프레임 필터", abstract: "프레임에 돌기를 둔다." },
];
const m = buildMatrix(comps, docs, [
  { componentId: "C1", docId: "A", presence: "있음", quote: "삼각 주름으로 접는다", note: "" },
  { componentId: "C1", docId: "B", presence: "없음", quote: "", note: "" },
  { componentId: "C2", docId: "A", presence: "일부", quote: "", note: "주름은 한 번만 접음" },
  { componentId: "C2", docId: "B", presence: "없음", quote: "", note: "" },
]);

describe("componentEvidence", () => {
  it("points to the closest document with its verified quote and lists where the component is absent", () => {
    const e = componentEvidence(m, "1차 주름")!;
    expect(e.closest).toMatchObject({ label: "문헌 A", presence: "있음", quote: "삼각 주름으로 접는다" });
    expect(e.absentIn).toEqual(["문헌 B"]);
    expect(evidenceText(e)).toBe('문헌 A에 있음 ("삼각 주름으로 접는다") · 문헌 B에는 없음');
  });
  it("explains a partial match with the AI's note", () => {
    expect(componentEvidence(m, "2차 주름")!.closest).toMatchObject({ presence: "일부", note: "주름은 한 번만 접음" });
  });
  it("returns null for an unknown component instead of guessing", () => {
    expect(componentEvidence(m, "모터")).toBeNull();
  });
});

describe("recommendationBasis", () => {
  it("lists the facts behind the recommendation", () => {
    const intake = { missing: [{ item: "도면", why: "" }] } as IntakeResult;
    const review = { businessImportance: "높음", imitationRisk: "보통" } as ReviewDraft;
    const facts = recommendationBasis(intake, review, m, null);
    expect(facts[0]).toBe("선행 문헌 대비: 구성 2개 중 그대로 있음 1 · 일부 1 · 어디에도 없음 0");
    expect(facts.some((f) => f.includes("사업 중요도 높음"))).toBe(true);
    expect(facts.some((f) => f.includes("빠진 항목 1개 (도면)"))).toBe(true);
  });
});

describe("distinctionSummary", () => {
  it("puts core components first with their prior-art evidence and claim advice", () => {
    const scope = {
      strategy: "",
      items: [
        { componentName: "1차 주름", role: "대체 가능" as const, reason: "", alternatives: "", designAround: "쉬움" as const, advice: "상위 개념으로" },
        { componentName: "2차 주름", role: "핵심" as const, reason: "", alternatives: "", designAround: "어려움" as const, advice: "독립항의 중심에 둡니다." },
      ],
    };
    const rows = distinctionSummary(scope, m);
    expect(rows.map((r) => r.componentName)).toEqual(["2차 주름", "1차 주름"]);
    expect(rows[1].evidence).toContain("문헌 A에 있음");
    expect(rows[0].advice).toBe("독립항의 중심에 둡니다.");
  });
});
