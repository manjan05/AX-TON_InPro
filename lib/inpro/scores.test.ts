import { describe, expect, it } from "vitest";
import { levelOf, patentabilityScore, scoreOfLevel, weakestAxes } from "./scores";

const verdict = (novelty: string, inventive: string, unique: string[]) =>
  ({ novelty: { level: novelty, text: "" }, inventive: { level: inventive, text: "" }, unique }) as Parameters<typeof patentabilityScore>[0];

describe("7-point scores", () => {
  it("maps scores to three levels and back", () => {
    expect([1, 3, 4, 5, 7].map(levelOf)).toEqual(["낮음", "낮음", "보통", "높음", "높음"]);
    expect(levelOf(scoreOfLevel("높음"))).toBe("높음");
    expect(levelOf(scoreOfLevel("낮음"))).toBe("낮음");
  });

  it("never gives a perfect patentability score and drops it when prior art overlaps", () => {
    expect(patentabilityScore(verdict("낮음", "낮음", ["C3 2차 주름"]))).toBe(6);
    expect(patentabilityScore(verdict("주의", "주의", ["C3 2차 주름"]))).toBe(4);
    expect(patentabilityScore(verdict("높음", "낮음", []))).toBe(4);
    expect(patentabilityScore(verdict("높음", "높음", []))).toBe(1);
  });

  it("names every weakest axis among the three rights-strength axes", () => {
    expect(weakestAxes({ patentability: 6, business: 6, designAround: 4, detectability: 4, provability: 6 })).toEqual(["우회 어려움", "침해 발견"]);
    expect(weakestAxes({ patentability: 2, business: 2, designAround: 5, detectability: 6, provability: 4 })).toEqual(["입증 용이성"]);
  });
});
