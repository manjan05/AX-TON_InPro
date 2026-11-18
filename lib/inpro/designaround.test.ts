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

import { effectOf, needsConfirm, reclassify, trustOf } from "./designaround";
import { attemptEvidence } from "./search";

describe("attempt trust", () => {
  it("shows real-patent evidence only when the same expression exists in the data", () => {
    expect(attemptEvidence("엠보싱").count).toBeGreaterThan(0);
    expect(attemptEvidence("양자 나노 플라즈마 코팅").count).toBe(0);
  });

  it("ranks trust: inventor confirmation > real patent > AI guess, and asks only about unsupported guesses", () => {
    const guess = attempt("M자 주름", "유지");
    expect(trustOf(guess)).toBe("AI 추정");
    expect(needsConfirm(guess)).toBe(true);
    expect(trustOf({ ...guess, evidence: { count: 2, docs: [] } })).toBe("실제 특허");
    expect(needsConfirm({ ...guess, evidence: { count: 2, docs: [] } })).toBe(false);
    expect(trustOf({ ...guess, confirmed: "다름" })).toBe("발명자 확인");
    expect(needsConfirm(attempt("접착 비드", "안 됨"))).toBe(false);
  });

  it("lets the inventor's confirmation override the AI and recompute the role", () => {
    const first = classify({ componentName: "2차 주름", essential: true, attempts: [attempt("M자 주름", "유지")] });
    const item = { componentName: "2차 주름", ...first } as ScopeItem;
    expect(item.role).toBe("대체 가능");
    const fixed = reclassify(item, item.attempts!.map((a) => ({ ...a, confirmed: "다름" as const })));
    expect(effectOf(fixed.attempts![0])).toBe("안 됨");
    expect(fixed.role).toBe("핵심");
    expect(fixed.designAround).toBe("어려움");
  });
});
