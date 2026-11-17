import { describe, expect, it } from "vitest";
import { appendFollowUp, priorArtQuestions, summarizeRound } from "./followup";
import type { ComparisonRow } from "./types";

const row = (componentName: string, relation: ComparisonRow["relation"], docId: string | null, quote: string | null = null): ComparisonRow => ({
  componentId: componentName,
  componentName,
  docId,
  docTitle: docId ? `문헌 ${docId}` : null,
  relation,
  quote,
  note: "",
  nextCheck: "",
});

const rows = [row("2차 주름", "차이 후보", "B"), row("여과재", "공통", "A", "삼각 주름으로 접는다"), row("돌기", "차이 후보", null), row("프레임", "근거 부족", "C")];

describe("priorArtQuestions", () => {
  it("asks about overlapping components first, quoting the prior art, and skips unique or unverified ones", () => {
    const qs = priorArtQuestions(rows);
    expect(qs.map((q) => q.componentName)).toEqual(["여과재", "2차 주름"]);
    expect(qs[0].question).toContain("삼각 주름으로 접는다");
    expect(qs[0].question).toContain("무엇이 다른가요");
  });
});

describe("summarizeRound / appendFollowUp", () => {
  it("counts common, partial and distinct components", () => {
    expect(summarizeRound(2, rows, 1)).toMatchObject({ n: 2, common: 1, partial: 1, distinct: 1, changed: 1 });
  });
  it("appends only answered questions under a round header", () => {
    const d = appendFollowUp("원래 자료", 1, [
      { question: "Q1", answer: "높이가 1/4" },
      { question: "Q2", answer: " " },
    ]);
    expect(d).toContain("[선행기술 대비 발명자 재인터뷰 1회차]");
    expect(d).toContain("A. 높이가 1/4");
    expect(d).not.toContain("Q2");
  });
});

describe("inventor view data", () => {
  it("carries the prior-art quote and our component description side by side", () => {
    const q = priorArtQuestions(rows, 4, { 여과재: "삼각 주름으로 접은 기본 여과재" })[0];
    expect(q).toMatchObject({ relation: "공통", quote: "삼각 주름으로 접는다", componentDescription: "삼각 주름으로 접은 기본 여과재" });
  });
});
