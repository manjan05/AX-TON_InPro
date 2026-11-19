// InPro 사건(발명 1건) 데이터 모델. 기획안 5장 "이용 흐름 6단계"를 그대로 따른다.
import type { CheckResult } from "./checklist";
import type { RightsStrength } from "./strength";
import type { DesignAroundAttempt } from "./designaround";

export interface InventionComponent {
  id: string; // "C1", "C2" ...
  name: string;
  description: string;
}

export interface MissingItem {
  item: string;
  why: string;
}

export interface IntakeResult {
  title: string;
  field: string;
  problem: string;
  components: InventionComponent[];
  missing: MissingItem[]; // 체크리스트에서 '충족'이 아닌 항목
  checklist: CheckResult[];
  questions: string[];
  keywords: string[];
}

export interface PriorDoc {
  id: string;
  title: string;
  applicant: string;
  registrationDate: string;
  category?: string;
  abstract: string;
  claims?: string;
  usage?: string;
  facet?: string;
  status?: string;
  score: number;
  matchedKeywords: string[];
  explain?: DocExplain;
}

// 선행조사 설명: 왜 이 문헌이 후보에 들어왔는가
export type MatchField = "제목" | "요약" | "청구항";

export interface MatchDetail {
  origin: string; // 담당자가 확정한 검색어
  term: string; // 실제로 걸린 말 (동의어일 수 있음)
  points: number; // 이 검색어로 얻은 점수 (동의어 가중치 반영)
  fields: MatchField[];
  partialToken?: string; // 구(phrase)가 통째로는 없고 이 단어만 맞은 경우 (부분 일치, 점수 절반)
  viaSynonym?: boolean; // 검색어가 아니라 용어 사전의 동의어로 걸린 경우 (점수 70%)
}

export interface DocExplain {
  details: MatchDetail[];
  bonus: number; // 여러 검색어 동시 일치 배수
  snippet: { field: MatchField; text: string; term: string } | null;
  relatedComponents: string[]; // "C1 1차 주름" 형식
}

export interface NearMiss {
  id: string;
  title: string;
  applicant: string;
  rank: number;
  score: number;
  reason: string;
}

// 조사 목적 (IP 실무자 피드백 2: 목적마다 검색 대상과 검토 기준이 다르다)
//  - 출원 검토 = 특허성 조사: 소멸·거절 포함 모든 선행기술로 신규성·진보성
//  - 침해 위험 = FTO: 살아 있는 등록 특허만, 겹침이 큰 순서로 클레임 차트 확인
//  - 경쟁사 조사: 특정 경쟁사 특허만, 우리 구성과 겹침·권리 현황
//  - 무효자료 조사: 막고 있는 특허 하나를 정하고, 그보다 먼저 나온 문헌에서 그 특허 구성을 찾는다
//  - 둘 다: 특허성 + FTO를 한 번에
export const PURPOSES = ["둘 다", "출원 검토", "침해 위험", "경쟁사 조사", "무효자료 조사"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_INFO: Record<Purpose, { label: string; question: string; desc: string }> = {
  "둘 다": {
    label: "특허성 + FTO",
    question: "한 번 조사로 두 판정을 봅니다",
    desc: "전체 선행기술로 신규성·진보성, 그중 등록 특허로 침해 위험 확인",
  },
  "출원 검토": {
    label: "특허성 조사",
    question: "우리 발명이 특허를 받을 수 있나",
    desc: "소멸·거절 문헌까지 포함해 신규성과 진보성 확인",
  },
  "침해 위험": {
    label: "FTO",
    question: "피해야 할 살아 있는 특허가 있나",
    desc: "등록 특허만 비교해 겹침이 큰 특허부터 확인 순서 제시",
  },
  "경쟁사 조사": {
    label: "경쟁사 조사",
    question: "경쟁사는 이 분야에 어떤 특허를 가졌나",
    desc: "경쟁사 한 곳의 특허와 우리 구성의 겹침, 살아 있는 권리 확인",
  },
  "무효자료 조사": {
    label: "무효자료 조사",
    question: "막고 있는 특허를 무너뜨릴 자료가 있나",
    desc: "대상 특허보다 먼저 출원된 문헌에서 그 청구항 구성 찾기",
  },
};

export const purposeLabel = (p: Purpose) => PURPOSE_INFO[p]?.label ?? p;

// 담당자가 후보에서 뺄 때 고르는 이유 (조사 기록·학습 데이터)
export const EXCLUDE_REASONS = ["관련 없음", "이미 검토함", "중복", "기타"] as const;
export type ExcludeReason = (typeof EXCLUDE_REASONS)[number];

// "근거 부족" = AI가 비교 판단을 냈지만 원문에서 인용을 확인하지 못한 경우
export type Relation = "공통" | "차이 후보" | "근거 부족";

export interface ComparisonRow {
  componentId: string;
  componentName: string;
  docId: string | null;
  docTitle: string | null;
  relation: Relation;
  quote: string | null; // 원문(초록)에서 그대로 확인된 문장만 들어간다
  note: string;
  nextCheck: string;
}

// 팀장 인터뷰 질문 2의 "출원 여부 및 국가 결정" 선택지
export type Decision = "국내 출원" | "해외 출원" | "영업비밀" | "보류";
export const DECISIONS: Decision[] = ["국내 출원", "해외 출원", "영업비밀", "보류"];

export type Level = "높음" | "보통" | "낮음";

export interface ReviewDraft {
  summary: string;
  differences: string[];
  differenceBasis?: string[]; // differences[i]의 근거 구성 이름 (매트릭스에서 문헌·인용을 찾는다)
  patentability: string; // 특허성 의견 (단정하지 않음)
  businessImportance: Level;
  businessScore?: number; // 1~7점 (7이 가장 중요)
  businessReason: string;
  imitationRisk: Level; // 경쟁사가 모방·활용할 가능성
  imitationReason: string;
  strength?: RightsStrength; // 권리의 강도: 우회 어려움 · 침해 발견 · 입증 용이성
  recommendation: Decision;
  reason: string;
  openIssues: string[];
}

// 권리범위 설계: 청구항을 쓰지 않고, 무엇을 지켜야 하는지만 정리한다
export type ScopeRole = "핵심" | "대체 가능" | "부가";

export interface ScopeItem {
  componentName: string;
  role: ScopeRole;
  reason: string;
  alternatives: string; // 경쟁사가 바꿔 쓸 수 있는 수단
  designAround: "어려움" | "보통" | "쉬움";
  attempts?: DesignAroundAttempt[]; // 경쟁사 관점 회피 시도 (구분의 근거)
  essential?: boolean; // 발명의 효과를 내는 데 꼭 필요한 구성인가 (구분을 다시 계산할 때 쓴다)
  advice?: string; // 권리범위에 어떻게 담을지
}

export interface ScopeResult {
  items: ScopeItem[];
  strategy: string;
}

// 공개 전 출원 알림 (질문 5)
export interface Disclosure {
  date: string; // YYYY-MM-DD
  type: string;
}

// 개발 단계별 재조사 (질문 8)
export const DEV_STAGES = ["기획·개념설계", "상세설계", "설계변경", "출시 전", "출시 후"] as const;
export type DevStage = (typeof DEV_STAGES)[number];
