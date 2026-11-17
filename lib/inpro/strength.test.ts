import { describe, expect, it } from "vitest";
import { overallStrength, secretHint, type RightsStrength } from "./strength";

const ax = (level: "높음" | "보통" | "낮음", reason = "이유") => ({ level, reason, basis: "2차 주름" });

describe("overallStrength", () => {
  it("is as strong as its weakest axis and names it", () => {
    const s: RightsStrength = { designAround: ax("높음"), detectability: ax("낮음", "내부 구조라 밖에서 안 보입니다."), provability: ax("보통") };
    const o = overallStrength(s);
    expect(o.level).toBe("낮음");
    expect(o.weakest).toBe("침해 발견");
    expect(o.text).toContain("내부 구조라 밖에서 안 보입니다.");
  });
  it("suggests a trade secret only when infringement can neither be detected nor proven", () => {
    expect(secretHint({ designAround: ax("높음"), detectability: ax("낮음"), provability: ax("낮음") })).toContain("영업비밀");
    expect(secretHint({ designAround: ax("높음"), detectability: ax("낮음"), provability: ax("보통") })).toBeNull();
  });
});
