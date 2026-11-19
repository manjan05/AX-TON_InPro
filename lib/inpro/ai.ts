import { generateText, Output } from "ai";
import { z } from "zod";
import { MODEL_ID } from "../ai-client";
import type { IntakeResult, PriorDoc, ReviewDraft, ComparisonRow, InventionComponent, ScopeResult } from "./types";
import type { RawCell } from "./matrix";
import { GLOSSARY } from "./search";
import { CHECKLIST, missingFrom, verifyChecklist, type ChecklistId } from "./checklist";
import { classify } from "./designaround";
import { levelOf } from "./scores";
import { attemptEvidence } from "./search";

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
  questions: z.array(z.string()).describe("충족이 아닌 체크리스트 항목을 채우기 위한 보완 질문, 항목당 하나, 최대 4개. 각 질문은 40자 이내의 짧은 한 문장. 예: 압력 손실이 기존 대비 얼마나 줄었는지 수치"),
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
- 보완 질문은 충족이 아닌 항목만, 연구원이 한 줄로 바로 답할 수 있게 짧고 구체적으로 쓴다(40자 이내).
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
const axis = (what: string) =>
  z.object({
    score: z.number().int().min(1).max(7).describe(`${what} 1~7점, 7이 가장 유리, 4가 보통. 근거에 맞게 세분해서 매긴다`),
    reason: z.string().describe("판단 이유 한 문장. 비교표의 어느 문헌·차이 때문인지 구체적으로"),
    basis: z.string().describe("근거가 된 발명 구성 이름 하나 (구성 목록의 이름 그대로)"),
  });
const reviewSchema = z.object({
  summary: z.string().describe("사내 검토서 요약 2~3문장"),
  differences: z
    .array(z.object({ point: z.string().describe("다른 점 후보 한 문장"), componentName: z.string().describe("이 차이가 걸린 발명 구성 이름 (구성 목록의 이름 그대로)") }))
    .describe("선행 문헌과 다른 점 후보"),
  patentability: z.string().describe("특허성 의견 1~2문장. 등록 가능성을 단정하지 않는다"),
  businessScore: z.number().int().min(1).max(7).describe("이 발명이 회사 제품·사업에 얼마나 중요한지 1~7점, 7이 가장 중요, 4가 보통"),
  businessReason: z.string(),
  imitationRisk: level.describe("경쟁사가 이 기술을 모방·활용할 가능성"),
  imitationReason: z.string(),
  strength: z
    .object({
      designAround: axis("경쟁사가 이 권리를 피해 같은 효과를 내기 어려운 정도. 7 = 피하기 가장 어려움."),
      detectability: axis("시중 경쟁 제품을 보고 침해를 알아챌 수 있는 정도. 외관·구조로 보이면 높은 점수, 내부 제어·제조 공정이면 낮은 점수."),
      provability: axis("제품 분해·측정으로 침해 증거를 확보할 수 있는 정도. 7 = 입증이 가장 쉬움."),
    })
    .describe("권리의 강도"),
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
- 다른 점 후보는 비교표에서 '차이 후보'이거나 문헌에 일부만 있는 구성에서 뽑고, 어느 구성의 차이인지 적는다.
- 권리의 강도: 특허를 받을 수 있는지와 별개로, 받은 권리가 경쟁사를 실제로 막을 수 있는지 본다.
  우회 어려움은 선행 문헌과 다른 구성(차별 구성)만으로 권리를 잡았을 때 그 구성을 다른 수단으로 바꾸기 쉬운지 본다.
  침해 발견·입증은 그 차별 구성이 제품 밖에서 보이거나 분해·측정으로 확인되는지 본다. 근거 구성은 아래 구성 목록에서 고른다.
- 점수는 1~7점이다. 4가 보통이고 7이 가장 유리하다. 높음·낮음 한쪽으로 쏠리지 않게, 비교표 근거에 맞춰 세분해서 매긴다.
- 추천: 국내 출원 / 해외 출원 / 영업비밀(외부에서 역설계로 알기 어려운 공정·제어 노하우일 때) / 보류(자료 부족·사업성 낮음).
- 남은 쟁점은 연구원이 아직 답하지 않은 질문과 근거 부족 항목에서 뽑는다.

발명: ${intake.title} (${intake.field})
해결 문제: ${intake.problem}
구성 목록: ${intake.components.map((c) => c.name).join(", ")}
아직 빠진 항목: ${intake.missing.map((m) => m.item).join(", ") || "없음"}
연구원 보완 답변: ${answers || "없음"}
${context}

[비교표]
${table(rows)}`,
  });
  const { strength, ...rest } = output;
  const withLevel = (a: (typeof strength)["designAround"]) => ({ ...a, level: levelOf(a.score) });
  return {
    ...rest,
    businessImportance: levelOf(output.businessScore),
    strength: { designAround: withLevel(strength.designAround), detectability: withLevel(strength.detectability), provability: withLevel(strength.provability) },
    differences: output.differences.map((d) => d.point),
    differenceBasis: output.differences.map((d) => d.componentName),
  };
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
      essential: z.boolean().describe("이 구성이 발명의 효과를 내는 데 꼭 필요한가"),
      attempts: z
        .array(
          z.object({
            method: z.string().describe("경쟁사가 이 구성 대신 쓸 구체적 수단, 15자 이내 명사구. 예: M자 주름, 허니콤 구조"),
            keepsEffect: z.enum(["유지", "일부", "안 됨"]).describe("그 수단으로 바꿔도 발명과 같은 효과가 나는가"),
            why: z.string().describe("그렇게 본 이유 한 문장. 비교표의 문헌이 근거면 그 문헌을 적는다"),
          })
        )
        .describe("경쟁사의 회피 시도 2~4개"),
    })
  ),
  strategy: z.string().describe("권리범위 방향 2~3문장. 청구항 문장은 쓰지 않는다"),
});

export async function runScope(intake: IntakeResult, rows: ComparisonRow[], review: ReviewDraft): Promise<ScopeResult> {
  const { output } = await generateText({
    model: MODEL_ID,
    output: Output.object({ schema: scopeSchema }),
    prompt: `너는 이 발명을 피해 가려는 경쟁사 엔지니어다. 청구항을 쓰기 전에, 구성마다 "어떻게 하면 이 권리를 피하면서 같은 효과를 낼까"를 시도한다.

규칙:
- 구성마다 회피 시도 2~4개를 낸다. 실제로 만들 수 있는 구체적 수단만 쓴다.
- keepsEffect: 그 수단으로 바꿔도 발명과 같은 효과가 나면 "유지", 일부만 나면 "일부", 효과가 사라지면 "안 됨".
- 선행 문헌(비교표)에 이미 있는 수단이면 why에 그 문헌을 적는다.
- essential: 효과와 직접 관계없는 구성(외형, 고정 방식 등)이면 false.
- 핵심·대체 가능 구분은 하지 않는다. 회피 시도 결과로 따로 정한다.
- strategy는 회피 시도 결과를 바탕으로 쓴다. 청구항 문장은 쓰지 않는다.

발명: ${intake.title} — ${intake.problem}
구성 요소:
${intake.components.map((c) => `- ${c.name}: ${c.description}`).join("\n")}
다른 점 후보: ${review.differences.join(" / ") || "없음"}

[비교표]
${table(rows)}`,
  });
  const names = new Set(intake.components.map((c) => c.name));
  const items = output.items
    .filter((i) => names.has(i.componentName))
    .map((i) => ({
      componentName: i.componentName,
      // 서버가 각 회피 시도를 실제 특허 데이터에서 찾아 근거를 붙인다
      ...classify({ ...i, attempts: i.attempts.map((a) => ({ ...a, evidence: attemptEvidence(a.method) })) }),
    }));
  return { strategy: output.strategy, items };
}

// 무효자료 조사: 대상 특허의 대표 청구항을 구성요소로 나눈다 (청구항 문구에 있는 것만)
const claimSchema = z.object({
  components: z.array(z.object({ name: z.string().describe("구성요소 이름, 15자 이내"), description: z.string().describe("청구항 문구를 바탕으로 한 한 문장") })).describe("청구항 구성요소 3~6개"),
  keywords: z.array(z.string()).describe("이 구성요소를 먼저 나온 문헌에서 찾기 위한 한국어 검색어 6~10개, 각 2~6자"),
});

export async function runClaimElements(doc: { title: string; abstract: string; claims?: string }): Promise<{ components: InventionComponent[]; keywords: string[] }> {
  const { output } = await generateText({
    model: MODEL_ID,
    output: Output.object({ schema: claimSchema }),
    prompt: `무효자료 조사를 위해 아래 특허의 대표 청구항을 구성요소로 나눈다.
- 청구항에 적힌 구성만 쓴다. 초록에만 있는 내용이나 추측은 넣지 않는다.
- 구성요소는 청구항의 순서대로, 다른 문헌과 하나씩 대조할 수 있는 단위로 나눈다.
- 검색어는 특허 문서에 실제로 쓰이는 말로 쓴다. 아래 분야 용어 사전에 관련된 말이 있으면 그 표현을 쓴다.

[분야 용어 사전 (같은 줄은 같은 뜻)]
${GLOSSARY.map((g) => g.join(" = ")).join("\n")}

[대상 특허]
제목: ${doc.title}
대표 청구항: ${doc.claims ?? "(없음)"}
초록: ${doc.abstract}`,
  });
  return {
    components: output.components.slice(0, 6).map((c, i) => ({ id: `E${i + 1}`, ...c })),
    keywords: Array.from(new Set(output.keywords.map((k) => k.trim()).filter(Boolean))).slice(0, 12),
  };
}
