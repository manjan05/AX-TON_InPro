// InPro 사건(발명 1건) 데이터 모델. 기획안 5장 "이용 흐름 6단계"를 그대로 따른다.

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
  missing: MissingItem[];
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
  score: number;
  matchedKeywords: string[];
}

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
  patentability: string; // 특허성 의견 (단정하지 않음)
  businessImportance: Level;
  businessReason: string;
  imitationRisk: Level; // 경쟁사가 모방·활용할 가능성
  imitationReason: string;
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
