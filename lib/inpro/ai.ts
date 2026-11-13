import { generateText, Output } from "ai";
import { z } from "zod";
import { MODEL_ID } from "../ai-client";
import type { IntakeResult, PriorDoc, ReviewDraft, ComparisonRow, InventionComponent, ScopeResult } from "./types";
import type { RawCell } from "./matrix";
import { GLOSSARY } from "./search";
import { CHECKLIST, missingFrom, verifyChecklist, type ChecklistId } from "./checklist";

const intakeSchema = z.object({
  title: z.string().describe("발명의 가칭, 20자 이내"),
  field: z.string().describe("기술 분야, 예: 열관리·배터리"),
  problem: z.string().describe("발명이 해결하려는 문제 한 문장"),
  components: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .describe("발명을 이루는 핵심 구성 요소 3~5개"),
  checklist: z
    .array(
      z.object({
        id: z.enum(CHECKLIST.map((c) => c.id) as [ChecklistId, ...ChecklistId[]]),
        status: z.enum(["충족", "부족", "없음"]),
        quote: z.string().describe("근거가 된 자료 속 문장을 글자 그대로 복사. 없음이면 빈 문자열"),
        note: z.string().describe("부족이면 무엇이 모자란지 한 문장. 충족이면 빈 문자열"),
      })
    )
    .describe("체크리스트 항목마다 하나씩"),
  questions: z.array(z.string()).describe("충족이 아닌 체크리스트 항목을 채우기 위한 보완 질문, 항목당 하나, 최대 4개"),
  keywords: z.array(z.string()).describe("선행기술 검색용 한국어 키워드 6~10개. 동의어 포함, 각 2~6자"),
});

export async function runIntake(description: string, answers?: string): Promise<IntakeResult> {
  const { output } = await generateText({
    model: MODEL_ID,
    output: Output.object({ schema: intakeSchema }),
    prompt: `너는 중소기업 특허 담당자를 돕는 InPro다. 연구원이 낸 발명 자료를 출원 검토용으로 정리한다.

규칙:
- 자료에 있는 내용만 구성 요소로 쓴다. 추측한 내용을 사실처럼 쓰지 않는다.
- 아래 체크리스트 항목마다 자료(보완 답변 포함)를 보고 판정한다.
  충족 = 자료에 구체적으로 있음, 부족 = 언급은 있지만 모자람(예: 수치 없이 "줄었다"), 없음 = 언급 없음.
  충족·부족이면 근거 문장을 자료에서 글자 그대로 복사한다. 지어내지 않는다.
- 보완 질문은 충족이 아닌 항목만, 연구원이 바로 답할 수 있게 구체적으로 쓴다.
- 검색 키워드는 특허 문서에 실제로 쓰이는 말로 쓴다. 아래 분야 용어 사전에 관련된 말이 있으면 그 표현을 쓴다.

[체크리스트]
${CHECKLIST.map((c) => `${c.id}: ${c.name} — ${c.why}`).join("\n")}

[분야 용어 사전 (같은 줄은 같은 뜻)]
${GLOSSARY.map((g) => g.join(" = ")).join("\n")}

[연구원 발명 자료]
${description}
${answers ? `\n[연구원 보완 답변]\n${answers}` : ""}`,
  });
  const checklist = verifyChecklist(output.checklist, `${description}\n${answers ?? ""}`);
  return {
    ...output,
    checklist,
    missing: missingFrom(checklist),
    components: output.components.slice(0, 6).map((c, i) => ({ id: `C${i + 1}`, ...c })),
    questions: output.questions.slice(0, 4),
    keywords: Array.from(new Set(output.keywords.map((k) => k.trim()).filter(Boolean))).slice(0, 12),
  };
}

const matrixSchema = z.object({
  cells: z.array(
    z.object({
      componentId: z.string(),
      docId: z.string(),
      presence: z.enum(["있음", "일부", "없음"]),
      quote: z.string().describe("판단 근거가 되는 초록·청구항 속 문장을 글자 그대로 복사. 없음이면 빈 문자열"),
      note: z.string().describe("판단 이유 한 문장. 일부면 무엇이 같고 무엇이 다른지"),
    })
  ),
  nextChecks: z.array(z.object({ componentId: z.string(), nextCheck: z.string().describe("담당자나 연구원이 다음에 확인할 것 한 문장") })),
});

// 구성 × 문헌 모든 칸을 판단한다 (매트릭스). 신규성·진보성 판정은 서버가 칸 결과로 계산한다.
export async function runMatrix(
  components: InventionComponent[],
  docs: PriorDoc[]
): Promise<{ cells: RawCell[]; nextChecks: Record<string, string> }> {
  const compList = components.map((c) => `- ${c.id} ${c.name}: ${c.description}`).join("\n");
  const docList = docs
    .map(
      (d) =>
        `### 문헌 id=${d.id}\n제목: ${d.title}\n출원인: ${d.applicant}\n초록: ${d.abstract}${d.claims ? `\n대표 청구항: ${d.claims}` : ""}`
    )
    .join("\n\n");
  const { output } = await generateText({
    model: MODEL_ID,
    output: Output.object({ schema: matrixSchema }),
    prompt: `발명의 구성 요소 하나하나를 선행 문헌 하나하나와 대조한다. 모든 (구성, 문헌) 쌍에 대해 한 칸씩 판단한다.
구성 ${components.length}개 × 문헌 ${docs.length}개 = ${components.length * docs.length}칸을 빠짐없이 채운다.

판단 기준:
- 있음: 그 문헌의 초록이나 청구항에 같은 구성이 명시돼 있다. quote에 그 문장을 글자 그대로 복사한다. 청구항이 있으면 청구항을 우선 본다.
- 일부: 비슷한 구성이 있지만 핵심 특징(형상·위치·수치·작동 방식 등)이 다르다. note에 무엇이 다른지 쓴다.
- 없음: 그 문헌에 이 구성이 없다.
- 등록 가능성이나 침해 여부는 판단하지 않는다. 문헌에 없는 내용을 지어내지 않는다.

[발명 구성 요소]
${compList}

[선행 문헌]
${docList}`,
  });
  const nextChecks = Object.fromEntries(output.nextChecks.map((n) => [n.componentId, n.nextCheck]));
  return { cells: output.cells, nextChecks };
}

const level = z.enum(["높음", "보통", "낮음"]);
const reviewSchema = z.object({
  summary: z.string().describe("사내 검토서 요약 2~3문장"),
  differences: z.array(z.string()).describe("선행 문헌과 다른 점 후보"),
  patentability: z.string().describe("특허성 의견 1~2문장. 등록 가능성을 단정하지 않는다"),
  businessImportance: level.describe("이 발명이 회사 제품·사업에 얼마나 중요한지"),
  businessReason: z.string(),
  imitationRisk: level.describe("경쟁사가 이 기술을 모방·활용할 가능성"),
  imitationReason: z.string(),
  recommendation: z.enum(["국내 출원", "해외 출원", "영업비밀", "보류"]),
  reason: z.string().describe("추천 이유 한두 문장"),
  openIssues: z.array(z.string()).describe("변리사 전달 전에 남은 쟁점"),
});

export async function runReview(
  intake: IntakeResult,
  rows: ComparisonRow[],
  answers: string,
  context: string
): Promise<ReviewDraft> {
  const { output } = await generateText({
    model: MODEL_ID,
    output: Output.object({ schema: reviewSchema }),
    prompt: `중소기업 사내 출원 검토서 초안을 쓴다. 실무 IP팀처럼 특허성과 사업성을 함께 본다. 최종 결정은 담당자와 승인자가 한다.

규칙:
- "근거 부족" 행은 확정된 사실처럼 쓰지 않는다. 등록 가능성을 단정하지 않고, 다른 점은 "후보"로 쓴다.
- 사업성: 회사 제품에서의 중요도, 경쟁사가 모방·활용할 가능성을 본다.
- 추천: 국내 출원 / 해외 출원 / 영업비밀(외부에서 역설계로 알기 어려운 공정·제어 노하우일 때) / 보류(자료 부족·사업성 낮음).
- 남은 쟁점은 연구원이 아직 답하지 않은 질문과 근거 부족 항목에서 뽑는다.

발명: ${intake.title} (${intake.field})
해결 문제: ${intake.problem}
아직 빠진 항목: ${intake.missing.map((m) => m.item).join(", ") || "없음"}
연구원 보완 답변: ${answers || "없음"}
${context}

[비교표]
${table(rows)}`,
  });
  return output;
}

function table(rows: ComparisonRow[]) {
  return rows
    .map(
      (r) =>
        `- ${r.componentName} | ${r.relation} | 문헌: ${r.docTitle ?? "없음"} | 근거: ${r.quote ?? "없음"} | 다음 확인: ${r.nextCheck}`
    )
    .join("\n");
}

const scopeSchema = z.object({
  items: z.array(
    z.object({
      componentName: z.string(),
      role: z.enum(["핵심", "대체 가능", "부가"]),
      reason: z.string().describe("이렇게 분류한 이유 한 문장"),
      alternatives: z.string().describe("경쟁사가 이 구성 대신 쓸 수 있는 다른 기술 수단 2~4개. 각각 15자 이내 명사구, 쉼표로 구분. 예: 롤형 감기, M자 주름, 허니콤 구조"),
      designAround: z.enum(["어려움", "보통", "쉬움"]).describe("경쟁사가 이 구성을 피해 같은 효과를 내기가 얼마나 쉬운지"),
    })
  ),
  strategy: z.string().describe("권리범위 방향 2~3문장. 청구항 문장은 쓰지 않는다"),
});

// 권리범위 설계 보조: "경쟁사가 우회하기 어려운 어떤 권리를 만들 것인가" (팀장 인터뷰 질문 2)
export async function runScope(intake: IntakeResult, rows: ComparisonRow[], review: ReviewDraft): Promise<ScopeResult> {
  const { output } = await generateText({
    model: MODEL_ID,
    output: Output.object({ schema: scopeSchema }),
    prompt: `발명의 구성 요소를 권리범위 설계 관점에서 나눈다. 변리사가 청구항을 쓰기 전에 사내에서 방향을 잡는 용도다.

분류:
- 핵심: 효과를 내는 데 꼭 필요하고, 선행 문헌과 다른 점 후보에 해당하는 구성
- 대체 가능: 다른 수단으로 바꿔도 같은 효과가 나는 구성. 권리를 이 구체적 형태로 좁히면 경쟁사가 쉽게 피한다
- 부가: 효과와 직접 관계없는 구성
규칙: 청구항 문장을 쓰지 않는다. 각 구성마다 경쟁사가 바꿔 쓸 수 있는 수단을 구체적으로 적는다.

발명: ${intake.title} — ${intake.problem}
구성 요소:
${intake.components.map((c) => `- ${c.name}: ${c.description}`).join("\n")}
다른 점 후보: ${review.differences.join(" / ") || "없음"}

[비교표]
${table(rows)}`,
  });
  const names = new Set(intake.components.map((c) => c.name));
  return { ...output, items: output.items.filter((i) => names.has(i.componentName)) };
}
