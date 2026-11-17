import { describe, expect, it } from "vitest";
import { classify, strengthConflict } from "./designaround";
import type { ScopeItem } from "./types";

const attempt = (method: string, keepsEffect: "유지" | "일부" | "안 됨") => ({ method, keepsEffect, why: "" });

describe("classify", () => {
  it("calls a component replaceable when a competitor's substitute keeps the effect", () => {
    const r = classify({ componentName: "2차 주름", essential: true, attempts: [attempt("M자 주름", "유지"), attempt("엠보싱", "일부")] });
    expect(r.role).toBe("대체 가능");
    expect(r.designAround).toBe("쉬움");
    expect(r.reason).toContain("‘M자 주름’");
    expect(r.advice).toContain("상위 개념");
  });
  it("calls a component core only when every design-around attempt fails", () => {
    const r = classify({ componentName: "간격 돌기", essential: true, attempts: [attempt("별도 스페이서", "일부"), attempt("접착 비드", "안 됨")] });
    expect(r.role).toBe("핵심");
    expect(r.designAround).toBe("보통");
    expect(r.reason).toContain("2가지");
    expect(r.advice).toContain("독립항");
  });
  it("marks non-essential components as add-ons", () => {
    expect(classify({ componentName: "프레임", essential: false, attempts: [attempt("금속 프레임", "유지")] }).role).toBe("부가");
  });
});

describe("strengthConflict", () => {
  const item = { componentName: "2차 주름", ...classify({ componentName: "2차 주름", essential: true, attempts: [attempt("M자 주름", "유지")] }) } as ScopeItem;
  it("flags a step-4 'hard to design around' that the competitor view contradicts", () => {
    const c = strengthConflict([item], { level: "높음", basis: "2차 주름" });
    expect(c?.suggested).toBe("낮음");
  });
  it("stays quiet when step 4 was already cautious", () => {
    expect(strengthConflict([item], { level: "낮음", basis: "2차 주름" })).toBeNull();
  });
});
