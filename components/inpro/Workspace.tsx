"use client";
import { useEffect, useState } from "react";
import {
  DECISIONS,
  DEV_STAGES,
  type ComparisonRow,
  type Decision,
  type DevStage,
  type Disclosure,
  type IntakeResult,
  type PriorDoc,
  type ReviewDraft,
  type ScopeResult,
  type ScopeRole,
} from "@/lib/inpro/types";
import { changedComponents } from "@/lib/inpro/evidence";
import { PURPOSES, PURPOSE_INFO, purposeLabel, type ExcludeReason, type InventionComponent, type Purpose } from "@/lib/inpro/types";
import { buildHandoffMarkdown, openQuestions, type CaseEvent, type SurveyRecord } from "@/lib/inpro/package";
import { DISCLOSURE_TYPES, disclosureStatus } from "@/lib/inpro/disclosure";
import { Button, Card, CompareTable, InProLogo, StepTitle, Tag } from "./ui";
import { FunnelPanel } from "./FunnelPanel";
import { MatrixView } from "./MatrixView";
import type { Matrix } from "@/lib/inpro/matrix";
import type { SearchMeta } from "./SearchResults";
import { CandidateList } from "./CandidateList";
import { CompareResult } from "./CompareResult";
import { Field, Select, fieldCls } from "./FormParts";
import { ResearcherRequest } from "./ResearcherRequest";
import { DECISION_INFO, DocSection, EmptyAction } from "./StepParts";
import { ReviewResult } from "./ReviewResult";
import { Fold, SearchRun, SubRail, type Sub3 } from "./Parts3";
import { BasisList } from "./Evidence";
import { distinctionSummary, recommendationBasis } from "@/lib/inpro/basis";
import { ScopeItemCard } from "./ScopeItemCard";
import { effectOf, needsConfirm, reclassify, strengthConflict, trustOf } from "@/lib/inpro/designaround";
import { STRENGTH_AXES, overallStrength } from "@/lib/inpro/strength";
import { EMPTY_FORM, EXAMPLE_FORM, IntakeForm, composeDescription, type IntakeFormState } from "./IntakeForm";
import { IntakeSummary } from "./IntakeSummary";
import { WatchPanel, type WatchInfo } from "./WatchPanel";
import { DistinctionLoop } from "./DistinctionLoop";
import { TargetPicker, type InvalidityTarget, type SearchTargets } from "./TargetPicker";
import { buildInvalidityMarkdown } from "@/lib/inpro/package";
import { appendFollowUp, priorArtQuestions, summarizeRound, type SurveyRound } from "@/lib/inpro/followup";

// 팀장 인터뷰 질문 2의 실제 발명 검토 흐름을 따른다
const STEPS = ["발명 접수", "기술 이해·보완", "선행기술 조사", "특허성·사업성", "권리범위 설계", "출원 결정·전달"];

// 시연용 예시 답변: 질문에 나온 말로 어떤 항목인지 보고 알맞은 가짜 답을 채운다
export function exampleAnswer(q: string): string {
  if (/수치|압력|효과/.test(q)) return "같은 풍량에서 기존 단일 주름 필터 대비 압력 손실 약 12% 감소 (예시 답변)";
  if (/비교|기존|기준/.test(q)) return "기존 단일 주름 필터(같은 프레임 크기)와 비교 (예시 답변)";
  if (/도면|스케치|사진|형상 자료/.test(q)) return "손 스케치 2장과 시제품 사진 보유, 정식 도면은 다음 주 (예시 답변)";
  if (/변형|다른 형태|대안/.test(q)) return "물결 모양 2차 주름, 돌기 대신 접착 비드 방식 검토 (예시 답변)";
  return "확인 후 답변 예정 (예시 답변)";
}


async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다.");
  return data as T;
}

type SearchLog = { searchedAt: string; keywords: string[]; corpus: string; hits: number };

const inputCls = "rounded-none border px-3 py-2 text-sm outline-none focus:border-[var(--crimson)]";

export function Workspace() {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<CaseEvent[]>([]);

  // 1. 발명 접수
  const [form, setForm] = useState<IntakeFormState>(EMPTY_FORM);
  const [caseNo, setCaseNo] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [discDate, setDiscDate] = useState("");
  const [discType, setDiscType] = useState(DISCLOSURE_TYPES[0]);
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  // 2. 기술 이해·보완
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [requestSentAt, setRequestSentAt] = useState<string | null>(null);
  // 3. 선행기술 조사
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [docs, setDocs] = useState<PriorDoc[]>([]);
  const [searchLog, setSearchLog] = useState<SearchLog | null>(null);
  const [watch, setWatch] = useState<WatchInfo | null>(null);
  const [rounds, setRounds] = useState<SurveyRound[]>([]);
  const [sub3, setSub3] = useState<Sub3>("설정");
  const [intakeView, setIntakeView] = useState<"form" | "result">("form");
  const [play, setPlay] = useState<{ steps: SearchMeta["path"]; shown: number } | null>(null);
  // 경쟁사 조사·무효자료 조사 대상
  const [targets, setTargets] = useState<SearchTargets | null>(null);
  const [competitor, setCompetitor] = useState("");
  const [invalidTarget, setInvalidTarget] = useState<InvalidityTarget | null>(null);
  const [followAnswers, setFollowAnswers] = useState<Record<string, string>>({});
  const [followSentAt, setFollowSentAt] = useState<string | null>(null);
  const [scopeSentAt, setScopeSentAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [excluded, setExcluded] = useState<Record<string, ExcludeReason>>({});
  const [searchScope, setSearchScope] = useState<{ usage?: string; facet?: string } | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("둘 다");
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [changed, setChanged] = useState<Set<string>>(new Set());
  // 4~6
  const [review, setReview] = useState<ReviewDraft | null>(null);
  const [scope, setScope] = useState<ScopeResult | null>(null);
  const [decision, setDecision] = useState<Decision>("국내 출원");
  const [decisionMemo, setDecisionMemo] = useState("");
  const [approver, setApprover] = useState("");
  const [approvedAt, setApprovedAt] = useState<string | null>(null);
  // 개발 단계별 재조사
  const [stage, setStage] = useState<DevStage>(DEV_STAGES[0]);
  const [surveys, setSurveys] = useState<SurveyRecord[]>([]);
  const [nextStage, setNextStage] = useState<DevStage>(DEV_STAGES[1]);
  const [changeNote, setChangeNote] = useState("");

  const disclosure: Disclosure | null = discDate ? { date: discDate, type: discType } : null;
  const disc = disclosure ? disclosureStatus(disclosure) : null;

  const log = (actor: CaseEvent["actor"], text: string) =>
    setEvents((e) => [{ at: new Date().toISOString(), actor, text }, ...e]);

  const go = (n: number) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (n === 5 && intake && review && !scope) void doScope(); // 권리범위 설계안은 들어오면 바로 만든다
  };

  async function run<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(label);
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setBusy(null);
    }
  }

  // 앞 단계 결과가 바뀌면 뒤 단계 판단과 승인은 무효가 된다
  const invalidateDownstream = () => {
    if (approvedAt) log("InPro AI", "자료가 바뀌어 기존 승인을 무효로 표시");
    setApprovedAt(null);
    setReview(null);
    setScope(null);
  };

  const answersText = questions
    .map((q, i) => (answers[i]?.trim() ? `Q. ${q}\nA. ${answers[i].trim()}` : ""))
    .filter(Boolean)
    .join("\n");

  const mergeQuestions = (next: string[]) => {
    const keep = questions.map((q, i) => ({ q, a: answers[i] ?? "" })).filter((x) => x.a.trim());
    const fresh = next.filter((q) => !keep.some((k) => k.q === q));
    setQuestions([...keep.map((k) => k.q), ...fresh]);
    setAnswers([...keep.map((k) => k.a), ...fresh.map(() => "")]);
  };

  // STEP 1
  async function doIntake() {
    const composed = composeDescription(form);
    const result = await run("intake", () => post<IntakeResult>("/api/inpro/intake", { description: composed }));
    if (!result) return;
    setDescription(composed);
    if (!caseNo) {
      const d = new Date();
      const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      setCaseNo(`INV-${ymd}-${String(Math.floor(Math.random() * 900) + 100)}`);
    }
    setIntake(result);
    setIntakeView("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setKeywords(result.keywords);
    setQuestions(result.questions);
    setAnswers(result.questions.map(() => ""));
    setDocs([]);
    setRows([]);
    setMatrix(null);
    setConfirmed(new Set());
    setChanged(new Set());
    setSurveys([]);
    invalidateDownstream();
    log("연구원", "발명 자료 제출");
    log("InPro AI", `구성 ${result.components.length}개 추출, 빠진 항목 ${result.missing.length}개 표시`);
    if (disclosure) log("InPro AI", `공개 예정(${disclosure.type}, ${disclosure.date}) 등록 — 출원 기한 추적 시작`);
  }

  async function compareWith(components: IntakeResult["components"], docIds: string[]) {
    return post<{ rows: ComparisonRow[]; matrix: Matrix }>("/api/inpro/compare", { components, docIds, purpose });
  }

  // STEP 2: 발명자 인터뷰 답변으로 기술 이해를 갱신. 조사 후에 돌아오면 비교표도 다시 만든다.
  async function doRefine() {
    const result = await run("refine", async () => {
      const next = await post<IntakeResult>("/api/inpro/intake", { description, answers: answersText });
      const cmp = rows.length ? await compareWith(next.components, Array.from(selected)) : null;
      return { next, cmp };
    });
    if (!result) return;
    setIntake(result.next);
    setKeywords((ks) => Array.from(new Set([...ks, ...result.next.keywords])));
    log("연구원", `발명자 인터뷰 질문 ${answers.filter((a) => a.trim()).length}개 답변`);
    if (result.cmp) {
      const diff = changedComponents(rows, result.cmp.rows);
      setRows(result.cmp.rows);
    setMatrix(result.cmp.matrix);
      setMatrix(result.cmp.matrix);
      setChanged(diff);
      setConfirmed((c) => new Set([...c].filter((n) => !diff.has(n) && result.cmp!.rows.some((r) => r.componentName === n))));
      invalidateDownstream();
      setSub3("결과");
      log("InPro AI", `비교표 갱신, 판단 바뀐 구성 ${diff.size}개 재승인 필요`);
      go(3);
    } else {
      log("InPro AI", `기술 구성 갱신 (${result.next.components.length}개)`);
      go(3);
    }
  }

  // STEP 3
  useEffect(() => {
    if (!searchScope) return;
    const q = new URLSearchParams({ usage: searchScope.usage ?? "", facet: searchScope.facet ?? "" });
    let alive = true;
    fetch(`/api/inpro/search?${q}`)
      .then((r) => r.json())
      .then((d: { targets?: SearchTargets }) => {
        if (alive && d.targets) setTargets(d.targets);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [searchScope]);

  const isInvalidity = purpose === "무효자료 조사";
  // 데이터가 없는 화면으로는 가지 않는다
  const view3: Sub3 = sub3 === "결과" && rows.length === 0 ? (docs.length > 0 ? "후보" : "설정") : sub3 === "후보" && docs.length === 0 ? "설정" : sub3;
  const targetReady = purpose === "경쟁사 조사" ? !!competitor : isInvalidity ? !!invalidTarget : true;
  // 무효자료 조사는 우리 발명이 아니라 대상 특허 구성을 찾는다
  const searchKeywords = isInvalidity && invalidTarget ? invalidTarget.keywords : keywords;
  const editKeywords = (fn: (ks: string[]) => string[]) =>
    isInvalidity && invalidTarget ? setInvalidTarget((t) => (t ? { ...t, keywords: fn(t.keywords) } : t)) : setKeywords(fn);
  const compareComponents = (): InventionComponent[] => (isInvalidity && invalidTarget ? invalidTarget.components : intake?.components ?? []);

  async function loadInvalidTarget(id: string) {
    const result = await run("target", () => post<InvalidityTarget>("/api/inpro/target", { id }));
    if (!result) return;
    setInvalidTarget(result);
    setDocs([]);
    setRows([]);
    setMatrix(null);
    log("담당자", `무효자료 조사 대상: ${result.doc.title.slice(0, 24)} (${result.doc.id})`);
    log("InPro AI", `대상 특허 청구항을 구성요소 ${result.components.length}개로 나눔`);
  }

  async function doSearch() {
    const result = await run("search", () =>
      post<SearchMeta & { docs: PriorDoc[]; log: SearchLog }>("/api/inpro/search", {
        keywords: searchKeywords,
        ...searchScope,
        purpose,
        components: compareComponents(),
        applicant: purpose === "경쟁사 조사" ? competitor : undefined,
        targetId: isInvalidity ? invalidTarget?.doc.id : undefined,
      })
    );
    if (!result) return;
    setDocs(result.docs);
    setSearchMeta({ path: result.path, nearMiss: result.nearMiss, outOfScope: result.outOfScope, extra: result.extra });
    setExcluded({});
    setSearchLog(result.log);
    // 둘 다: 기본 선택에 등록 특허가 최소 2건은 들어가게 (침해 위험 판정이 비지 않도록)
    const pick = result.docs.slice(0, 4);
    const needLive = purpose === "둘 다" ? Math.max(0, 2 - pick.filter((d) => d.status === "등록").length) : 0;
    const addLive = result.docs.filter((d) => d.status === "등록" && !pick.includes(d)).slice(0, needLive);
    setSelected(new Set([...pick, ...addLive].map((d) => d.id)));
    log("담당자", `조사 범위 확정: 키워드 ${keywords.length}개`);
    log("InPro AI", `선행조사 실행, 후보 ${result.docs.length}건`);
    // 좁혀지는 과정을 한 단계씩 보여준 뒤 후보 화면으로
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    setPlay({ steps: result.path, shown: 0 });
    for (let i = 1; i <= result.path.length; i++) {
      await wait(520);
      setPlay({ steps: result.path, shown: i });
    }
    await wait(700);
    setPlay(null);
    setSub3("후보");
  }

  async function doCompare() {
    if (!intake) return;
    const result = await run("compare", () => compareWith(compareComponents(), Array.from(selected)));
    if (!result) return;
    setRows(result.rows);
    setMatrix(result.matrix);
    setConfirmed(new Set());
    setChanged(new Set());
    invalidateDownstream();
    if (surveys.length === 0) setSurveys([{ stage, at: new Date().toISOString(), changedCount: 0, note: "최초 조사" }]);
    setRounds(isInvalidity ? [] : [summarizeRound(1, result.rows, 0)]);
    setSub3("결과");
    setFollowAnswers({});
    setFollowSentAt(null);
    const weak = result.rows.filter((r) => r.relation === "근거 부족").length;
    log("담당자", `문헌 ${selected.size}건 선택`);
    log("InPro AI", `비교표 생성, 근거 부족 ${weak}건 표시`);
  }

  function changePurpose(p: Purpose) {
    if (p === purpose) return;
    setPurpose(p);
    if (docs.length || rows.length) {
      setDocs([]);
      setSearchMeta(null);
      setRows([]);
      setMatrix(null);
      setConfirmed(new Set());
      invalidateDownstream();
      log("담당자", `조사 목적 변경: ${p} — 검색을 다시 실행하세요`);
    }
  }

  function toggleDoc(d: PriorDoc) {
    const on = selected.has(d.id);
    setSelected((cur) => {
      const n = new Set(cur);
      if (n.has(d.id)) n.delete(d.id);
      else if (n.size < 6) n.add(d.id);
      return n;
    });
    // 체크를 빼면 조사 기록에 제외한 후보로 남기고, 다시 체크하면 지운다
    setExcluded((e) => {
      const n = { ...e };
      if (on) n[d.id] = "기타";
      else delete n[d.id];
      return n;
    });
  }

  // STEP 4
  const reviewContext = [
    `조사 목적: ${purposeLabel(purpose)} — ${PURPOSE_INFO[purpose].desc}${purpose === "경쟁사 조사" && competitor ? ` (경쟁사: ${competitor})` : ""}`,
    `현재 개발 단계: ${stage}`,
    disclosure && disc ? `공개 예정: ${disclosure.type} ${disclosure.date} (${disc.days}일 남음)` : "",
    matrix ? `매트릭스 판정 — ${matrix.verdict.mode === "침해 위험" ? "겹침" : "신규성 위험"} ${matrix.verdict.novelty.level}: ${matrix.verdict.novelty.text} / ${matrix.verdict.mode === "침해 위험" ? "확인 순서" : "진보성 위험"} ${matrix.verdict.inventive.level}: ${matrix.verdict.inventive.text}` : "",
    matrix?.verdict.fto ? `침해 위험 판정(등록 특허만) — 겹침 ${matrix.verdict.fto.novelty.level}: ${matrix.verdict.fto.novelty.text}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  // 3단계에서 바로 4단계로: 검토서 초안을 따로 누르지 않아도 만들기 시작한다
  async function startReview() {
    go(4);
    if (!review) await doReview();
  }

  async function doReview() {
    if (!intake) return;
    const result = await run("review", () =>
      post<ReviewDraft>("/api/inpro/review", { intake, rows, answers: answersText, context: reviewContext })
    );
    if (!result) return;
    setReview(result);
    setDecision(result.recommendation);
    setScope(null);
    setApprovedAt(null);
    log("InPro AI", `특허성·사업성 검토 초안 (사업 중요도 ${result.businessImportance}, 추천 ${result.recommendation})`);
  }

  // STEP 5
  async function doScope() {
    if (!intake || !review) return;
    const result = await run("scope", () => post<ScopeResult>("/api/inpro/scope", { intake, rows, review }));
    if (!result) return;
    setScope(result);
    setApprovedAt(null);
    const core = result.items.filter((i) => i.role === "핵심").length;
    log("InPro AI", `권리범위 설계안: 핵심 구성 ${core}개`);
  }

  // 회피 시도를 발명자가 확인하면 AI 추정 대신 그 결과로 구분을 다시 계산한다
  const confirmAttempt = (componentName: string, method: string, v: "같음" | "다름" | null) => {
    setScope((s) =>
      s
        ? {
            ...s,
            items: s.items.map((i) =>
              i.componentName !== componentName
                ? i
                : reclassify(i, (i.attempts ?? []).map((a) => (a.method === method ? { ...a, confirmed: v ?? undefined } : a)))
            ),
          }
        : s
    );
    setApprovedAt(null);
    log("담당자", v ? `발명자 확인 반영: ${componentName} · ${method} → 효과 ${v}` : `발명자 확인 취소: ${componentName} · ${method}`);
  };

  const setRole = (name: string, role: ScopeRole) => {
    setScope((s) => (s ? { ...s, items: s.items.map((i) => (i.componentName === name ? { ...i, role } : i)) } : s));
    setApprovedAt(null);
  };

  // STEP 6
  const unconfirmed = rows.filter((r) => !confirmed.has(r.componentName)).length;
  // 최종 결정은 담당자: AI 추천과 다르게 정해도 되지만, 이유는 남긴다
  const overrideNeedsMemo = !!review && decision !== review.recommendation && !decisionMemo.trim();
  function approve() {
    setApprovedAt(new Date().toISOString());
    log("담당자", `결정: ${decision}`);
    log("승인자", `${approver} 승인`);
  }

  // 반복 조사: 선행기술 → 발명자 재인터뷰 → 차별점 재정의 → 재검색 (IP 실무자 피드백 1)
  const followQs = priorArtQuestions(rows, 4, Object.fromEntries((intake?.components ?? []).map((c) => [c.name, c.description])));
  async function doLoop() {
    const qa = followQs.map((q) => ({ question: q.question, answer: followAnswers[q.question] ?? "" }));
    const round = Math.max(1, rounds.length);
    const newDesc = appendFollowUp(description, round, qa);
    const result = await run("loop", async () => {
      const next = await post<IntakeResult>("/api/inpro/intake", { description: newDesc, answers: answersText });
      const kws = Array.from(new Set([...keywords, ...next.keywords]));
      const found = await post<SearchMeta & { docs: PriorDoc[]; log: SearchLog }>("/api/inpro/search", { keywords: kws, ...searchScope, purpose, components: next.components });
      const ids = Array.from(new Set([...selected, ...found.docs.slice(0, 2).map((d) => d.id)])).slice(0, 6);
      const cmp = await compareWith(next.components, ids);
      return { next, kws, found, ids, cmp };
    });
    if (!result) return;
    const diff = changedComponents(rows, result.cmp.rows);
    setDescription(newDesc);
    setIntake(result.next);
    setKeywords(result.kws);
    setDocs(result.found.docs);
    setSearchMeta({ path: result.found.path, nearMiss: result.found.nearMiss, outOfScope: result.found.outOfScope, extra: result.found.extra });
    setSearchLog(result.found.log);
    setSelected(new Set(result.ids));
    setRows(result.cmp.rows);
    setMatrix(result.cmp.matrix);
    setChanged(diff);
    setConfirmed((c) => new Set([...c].filter((n) => !diff.has(n) && result.cmp.rows.some((r) => r.componentName === n))));
    invalidateDownstream();
    setRounds((r) => [...r, summarizeRound(r.length + 1, result.cmp.rows, diff.size)]);
    setFollowAnswers({});
    setFollowSentAt(null);
    log("연구원", `선행기술 대비 재인터뷰 답변 ${qa.filter((q) => q.answer.trim()).length}개`);
    setSub3("결과");
    log("InPro AI", `${round + 1}회차: 차별점 재정의 · 재검색 · 비교표 갱신, 판단 바뀐 구성 ${diff.size}개`);
  }

  // 개발 단계별 재조사 (질문 8): 바뀐 설계로 다시 정리·조사·비교하고, 판단이 바뀐 구성만 재승인
  async function doResurvey() {
    const newDesc = changeNote.trim() ? `${description}\n[${nextStage}] ${changeNote.trim()}` : description;
    const result = await run("resurvey", async () => {
      const next = await post<IntakeResult>("/api/inpro/intake", { description: newDesc, answers: answersText });
      const kws = Array.from(new Set([...keywords, ...next.keywords]));
      const found = await post<SearchMeta & { docs: PriorDoc[]; log: SearchLog }>("/api/inpro/search", { keywords: kws, ...searchScope, purpose, components: next.components });
      const ids = Array.from(new Set([...selected, ...found.docs.slice(0, 2).map((d) => d.id)])).slice(0, 6);
      const cmp = await compareWith(next.components, ids);
      return { next, kws, found, ids, cmp };
    });
    if (!result) return;
    const diff = changedComponents(rows, result.cmp.rows);
    setDescription(newDesc);
    setIntake(result.next);
    mergeQuestions(result.next.questions);
    setKeywords(result.kws);
    setDocs(result.found.docs);
    setSearchMeta({ path: result.found.path, nearMiss: result.found.nearMiss, outOfScope: result.found.outOfScope, extra: result.found.extra });
    setSearchLog(result.found.log);
    setSelected(new Set(result.ids));
    setRows(result.cmp.rows);
    setMatrix(result.cmp.matrix);
    setChanged(diff);
    setConfirmed((c) => new Set([...c].filter((n) => !diff.has(n) && result.cmp.rows.some((r) => r.componentName === n))));
    invalidateDownstream();
    setSurveys((s) => [...s, { stage: nextStage, at: new Date().toISOString(), changedCount: diff.size, note: changeNote.trim() }]);
    setStage(nextStage);
    const idx = DEV_STAGES.indexOf(nextStage);
    setNextStage(DEV_STAGES[Math.min(idx + 1, DEV_STAGES.length - 1)]);
    setChangeNote("");
    log("담당자", `개발 단계 전환: ${nextStage}`);
    setSub3("결과");
    log("InPro AI", `재조사 완료, 판단 바뀐 구성 ${diff.size}개 재승인 필요`);
    go(3);
  }

  const toggleConfirm = (name: string) =>
    setConfirmed((c) => {
      const n = new Set(c);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });

  const qa = questions.map((q, i) => ({ question: q, answer: answers[i] ?? "" }));
  const handoff =
    intake && review && approvedAt
      ? {
          description,
          intake,
          qa,
          rows,
          review,
          scope,
          decision,
          decisionMemo,
          approver,
          approvedAt,
          searchLog,
          disclosure,
          surveys,
          matrix,
          purpose,
          exclusions: docs.filter((d) => excluded[d.id]).map((d) => ({ id: d.id, title: d.title, reason: excluded[d.id] })),
        }
      : null;

  function downloadMarkdown() {
    if (!handoff) return;
    const blob = new Blob([buildHandoffMarkdown(handoff)], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `InPro_변리사전달_${handoff.intake.title}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
    log("담당자", "변리사 전달자료 내보내기");
  }

  const canEnter = (n: number) => {
    if (n <= 1) return true;
    if (n <= 3) return !!intake;
    if (n === 4) return rows.length > 0;
    if (n === 5) return !!review;
    return !!review;
  };

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <header className="no-print sticky top-0 z-30 border-b backdrop-blur" style={{ background: "rgba(255,255,255,.92)", borderColor: "var(--hairline)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <InProLogo />
          <div className="flex items-center gap-2 text-[12px] font-bold" style={{ color: "var(--ink-soft)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: busy ? "var(--crimson)" : "#9fb38f" }} />
            {busy ? "InPro AI 작업 중" : "준비됨"}
          </div>
        </div>
      </header>

      {/* 사건 띠: 제목 + 6단계 진행선 */}
      <section className="no-print lp-band border-b" style={{ borderColor: "var(--hairline)" }}>
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-4 font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--ink-soft)" }}>
                {caseNo ?? "CASE"} · {intake ? intake.field : "새 발명 사건"}
              </div>
              <h1
                className="truncate font-[family-name:var(--font-display)] text-[44px] font-black uppercase leading-none tracking-[-.02em] max-sm:text-[32px]"
                style={{ color: "var(--crimson)" }}
              >
                {intake ? intake.title : "New Case"}
              </h1>
            </div>
          </div>

          <div className="relative mt-7">
            <div className="absolute top-[17px] h-px" style={{ background: "#9d9c98", left: "8.333%", right: "8.333%" }} />
            <div
              className="absolute top-[16px] h-[3px] transition-all duration-500"
              style={{ background: "var(--crimson)", left: "8.333%", width: `${((step - 1) / (STEPS.length - 1)) * 83.333}%` }}
            />
            <ol className="relative grid grid-cols-6">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const active = step === n;
                const done = n < step || (n <= maxStep && n !== step);
                const enabled = canEnter(n) && n <= Math.max(maxStep, step);
                return (
                  <li key={label} className="flex justify-center">
                    <button
                      type="button"
                      disabled={!enabled}
                      onClick={() => go(n)}
                      className="group flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
                      aria-current={active ? "step" : undefined}
                    >
                      <span
                        className="grid h-9 w-9 place-items-center rounded-full border font-[family-name:var(--font-display)] text-[14px] font-bold transition group-enabled:group-hover:scale-110"
                        style={
                          active
                            ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)", transform: "scale(1.12)" }
                            : done && enabled
                              ? { background: "#fff", color: "var(--crimson)", borderColor: "var(--crimson)" }
                              : { background: "rgba(255,255,255,.55)", color: "var(--ink-mute)", borderColor: "#b6bfcd" }
                        }
                      >
                        {done && enabled && !active ? "✓" : n}
                      </span>
                      <span
                        className="text-center text-[12px] font-bold leading-tight max-sm:hidden"
                        style={{ color: active ? "var(--crimson)" : enabled ? "var(--ink)" : "var(--ink-mute)" }}
                      >
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <div className="min-w-0 space-y-5">
          {error && (
            <div className="no-print border px-4 py-3 text-sm font-bold" style={{ borderColor: "#b8cdf3", background: "#e7eefc", color: "var(--crimson)" }}>
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <Card>
              <StepTitle n={1} title="발명 접수" sub="연구원 메모를 그대로 붙여넣는 단계" />
              {intake && intakeView === "result" ? (
                <IntakeSummary
                  intake={intake}
                  questionCount={questions.length}
                  onEdit={() => {
                    setIntakeView("form");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  onNext={() => go(2)}
                />
              ) : (
                <IntakeForm
                  form={form}
                  onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                  stage={stage}
                  onStage={setStage}
                  discDate={discDate}
                  discType={discType}
                  onDiscDate={setDiscDate}
                  onDiscType={setDiscType}
                  busy={busy === "intake"}
                  onSubmit={doIntake}
                  submitted={!!intake}
                  onFillExample={() => {
                    setForm(EXAMPLE_FORM);
                    setStage("상세설계");
                    const d = new Date();
                    d.setDate(d.getDate() + 21);
                    setDiscType("학회·전시");
                    setDiscDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                  }}
                />
              )}
            </Card>
          )}

          {/* STEP 2 */}
          {step === 2 && intake && (
            <Card>
              <StepTitle n={2} title="기술 이해·보완" sub="빠진 항목만 발명자에게 확인" />

              {questions.length > 0 ? (
                <div className="space-y-6">
                  {questions.map((q, i) => (
                    <div key={q}>
                      <label htmlFor={`answer-${i}`} className="mb-2 block text-[14px] font-bold leading-snug">
                        Q{i + 1}. {q}
                      </label>
                      <textarea
                        id={`answer-${i}`}
                        rows={3}
                        value={answers[i] ?? ""}
                        onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                        placeholder="발명자 답변을 붙여넣으세요"
                        className="min-h-[84px] w-full resize-y rounded-[10px] border bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-[var(--ink-mute)] focus:border-[var(--crimson)] focus:shadow-[0_0_0_3px_rgba(29,79,216,.12)]"
                        style={{ borderColor: "var(--rule)" }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[15px]" style={{ color: "var(--ink-soft)" }}>
                  발명자에게 더 확인할 항목이 없습니다. 바로 조사로 넘어가세요.
                </p>
              )}

              {/* 버튼 줄: 보조는 왼쪽, 다음으로 가는 버튼은 오른쪽 끝 */}
              <div className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
                {questions.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setAnswers(questions.map(exampleAnswer))}
                      className="h-10 rounded-[10px] border px-4 text-[14px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]"
                      style={{ borderColor: "var(--rule)" }}
                    >
                      예시 답변 채우기
                    </button>
                    <button type="button" onClick={() => go(3)} className="text-[14px] underline underline-offset-4 transition hover:text-[var(--crimson)]" style={{ color: "var(--ink-soft)" }}>
                      답변 없이 조사 진행
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={questions.length > 0 ? doRefine : () => go(3)}
                  disabled={(questions.length > 0 && !answersText) || busy === "refine"}
                  className="ml-auto inline-flex h-[52px] items-center gap-2 rounded-[10px] px-[26px] text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-35 disabled:hover:brightness-100"
                  style={{ background: "var(--crimson)" }}
                >
                  {busy === "refine" && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                  {questions.length === 0 ? "조사로 넘어가기" : rows.length ? "답변 반영 후 비교표 다시 만들기" : "답변 반영 후 조사"}
                </button>
              </div>

              {/* 연구원에게 질문 보내기: 이 과정을 안 쓰는 사람도 있어서 접어 둔다 */}
              {questions.length > 0 && (
                <details className="group mt-6 border-t" style={{ borderColor: "var(--rule)" }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[14px] font-bold [&::-webkit-details-marker]:hidden" style={{ color: "var(--ink-soft)" }}>
                    <span>연구원에게 질문 보내기</span>
                    <span className="text-[13px] font-normal group-open:hidden">열기</span>
                    <span className="hidden text-[13px] font-normal group-open:inline">접기</span>
                  </summary>
                  <div className="max-w-[520px] pb-2">
                    <ResearcherRequest
                      title={intake.title}
                      caseNo={caseNo}
                      inventor={form.inventor}
                      dept={form.dept}
                      questions={questions}
                      sentAt={requestSentAt}
                      onSent={(channel) => {
                        setRequestSentAt(new Date().toISOString());
                        log("담당자", `연구원에게 보완 질문 ${questions.length}개 발송 (${channel})`);
                      }}
                    />
                  </div>
                </details>
              )}
            </Card>
          )}

          {/* STEP 3 */}
          {step === 3 && intake && (
            <Card>
              <StepTitle n={3} title="선행기술 조사" sub="범위를 좁히고 후보를 골라 구성별로 비교" />
              <SubRail view={view3} canCandidates={docs.length > 0} canResult={rows.length > 0} onPick={setSub3} />

              {/* 1 조사 설정 */}
              {view3 === "설정" && (
                <div>
                  <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
                    <Field label="조사 목적" htmlFor="purpose">
                      <Select id="purpose" value={purpose} onChange={(v) => changePurpose(v as Purpose)}>
                        {PURPOSES.map((p) => (
                          <option key={p} value={p}>
                            {PURPOSE_INFO[p].label}
                            {p === "둘 다" ? " (기본)" : ""}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <FunnelPanel scope={searchScope} onScope={setSearchScope} purpose={purpose} />
                  </div>
                  <p className="mt-3 text-[13px]" style={{ color: "var(--ink-mute)" }}>
                    {PURPOSE_INFO[purpose].desc}
                  </p>
                  {(purpose === "경쟁사 조사" || isInvalidity) && (
                    <TargetPicker
                      purpose={purpose}
                      targets={targets}
                      competitor={competitor}
                      onCompetitor={(c) => {
                        setCompetitor(c);
                        setDocs([]);
                        setRows([]);
                        setMatrix(null);
                      }}
                      target={invalidTarget}
                      onLoadTarget={loadInvalidTarget}
                      loading={busy === "target"}
                    />
                  )}

                  <h3 className="mt-10 text-[18px] font-extrabold">검색어 {searchKeywords.length}개</h3>
                  <div className="mt-4 rounded-[14px] border bg-white p-5" style={{ borderColor: "var(--rule)" }}>
                    <div className="flex flex-wrap gap-x-6 gap-y-3">
                      {searchKeywords.map((k) => (
                        <span key={k} className="inline-flex items-center gap-2 text-[15px] font-bold">
                          {k}
                          <button type="button" aria-label={`${k} 삭제`} onClick={() => editKeywords((ks) => ks.filter((x) => x !== k))} className="text-[14px] font-normal transition hover:text-[var(--crimson)]" style={{ color: "var(--ink-mute)" }}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <form
                      className="mt-5 flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const k = newKeyword.trim();
                        if (k && !searchKeywords.includes(k)) editKeywords((ks) => [...ks, k]);
                        setNewKeyword("");
                      }}
                    >
                      <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="검색어 추가" aria-label="검색어 추가" className={fieldCls} style={{ borderColor: "var(--rule)" }} />
                      <button type="submit" className="h-[52px] shrink-0 rounded-[10px] border bg-white px-5 text-[14px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]" style={{ borderColor: "var(--rule)" }}>
                        추가
                      </button>
                    </form>
                  </div>

                  <div className="mt-10 flex justify-end border-t pt-6" style={{ borderColor: "var(--rule)" }}>
                    <button
                      type="button"
                      onClick={doSearch}
                      disabled={searchKeywords.length === 0 || !targetReady || busy === "search" || !!play}
                      className="inline-flex h-[52px] items-center gap-2 rounded-[10px] px-[26px] text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-35 disabled:hover:brightness-100"
                      style={{ background: "var(--crimson)" }}
                    >
                      {(busy === "search" || !!play) && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                      {targetReady ? "선행조사 실행" : purpose === "경쟁사 조사" ? "경쟁사를 고르세요" : "대상 특허를 고르세요"}
                    </button>
                  </div>
                  {play && <SearchRun steps={play.steps} shown={play.shown} />}
                </div>
              )}

              {/* 2 후보 선택 */}
              {view3 === "후보" && searchMeta && (
                <CandidateList
                  docs={docs}
                  path={searchMeta.path}
                  scopeLabel={[searchScope?.usage, searchScope?.facet].filter(Boolean).join(" ")}
                  keywords={searchKeywords}
                  selected={selected}
                  onToggle={toggleDoc}
                  onBack={() => setSub3("설정")}
                  onCompare={doCompare}
                  comparing={busy === "compare"}
                />
              )}

              {/* 3 비교 결과 */}
              {view3 === "결과" && rows.length > 0 && matrix && (
                <div>
                  <CompareResult m={matrix} rows={rows} confirmed={confirmed} changed={changed} onToggle={toggleConfirm} />

                  {isInvalidity ? (
                    <div className="mt-10 flex flex-wrap items-center gap-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
                      <span className="mr-2 text-[13.5px] font-bold">무효자료 조사는 우리 발명 검토(4~6단계)와 따로 보고서로 정리합니다.</span>
                      <Button
                        onClick={() => {
                          if (!invalidTarget || !matrix) return;
                          const blob = new Blob([buildInvalidityMarkdown({ target: invalidTarget, matrix, rows, searchLog })], { type: "text/markdown;charset=utf-8" });
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(blob);
                          a.download = `InPro_무효자료조사_${invalidTarget.doc.id}.md`;
                          a.click();
                          URL.revokeObjectURL(a.href);
                          log("담당자", "무효자료 조사 보고서 내려받기");
                        }}
                      >
                        보고서 내려받기
                      </Button>
                      <Button variant="ghost" onClick={() => changePurpose("둘 다")}>
                        우리 발명 조사로 돌아가기
                      </Button>
                    </div>
                  ) : (
                    // 발명자 재인터뷰: 꼭 거치는 과정이 아니라서 접어 둔다
                    <details className="group mt-10 border-t" style={{ borderColor: "var(--rule)" }}>
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[14px] font-bold [&::-webkit-details-marker]:hidden">
                        <span>발명자와 차별점 다시 정하기</span>
                        <span className="text-[13px] font-normal group-open:hidden" style={{ color: "var(--ink-soft)" }}>
                          열기
                        </span>
                        <span className="hidden text-[13px] font-normal group-open:inline" style={{ color: "var(--ink-soft)" }}>
                          접기
                        </span>
                      </summary>
                      <div className="pb-4">
                        <DistinctionLoop
                          rounds={rounds}
                          questions={followQs}
                          answers={followAnswers}
                          onAnswer={(q, a) => setFollowAnswers((m) => ({ ...m, [q]: a }))}
                          onRun={doLoop}
                          busy={busy === "loop"}
                          inventor={form.inventor}
                        >
                          {followQs.length > 0 && (
                            <ResearcherRequest
                              title={intake.title}
                              caseNo={caseNo}
                              inventor={form.inventor}
                              dept={form.dept}
                              questions={followQs.map((q) => q.question)}
                              sentAt={followSentAt}
                              onSent={(channel) => {
                                setFollowSentAt(new Date().toISOString());
                                log("담당자", `선행기술 대비 재인터뷰 질문 ${followQs.length}개 발송 (${channel})`);
                              }}
                            />
                          )}
                        </DistinctionLoop>
                      </div>
                    </details>
                  )}

                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
                    <button type="button" onClick={() => setSub3("후보")} className="h-[46px] rounded-[10px] border bg-white px-5 text-[14.5px] font-bold transition hover:bg-[var(--crimson-soft)]" style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}>
                      후보 다시 고르기
                    </button>
                    {!isInvalidity && (
                      <button type="button" onClick={startReview} className="h-[52px] rounded-[10px] px-7 text-[15px] font-bold text-white transition hover:brightness-110" style={{ background: "var(--crimson)" }}>
                        특허성·사업성 검토
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 4 */}
          {step === 4 && intake && (
            <Card>
              <StepTitle n={4} title="특허성·사업성 검토" sub="특허성과 사업성을 한 장으로 확인" />
              {!review && busy === "review" ? (
                <div className="flex items-center gap-3 py-16 text-[15px]" style={{ color: "var(--ink-soft)" }} role="status">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  비교표를 바탕으로 검토서를 쓰는 중…
                </div>
              ) : !review ? (
                <EmptyAction
                  title={`비교표 ${rows.length}줄을 바탕으로 사내 출원 검토서 초안을 씁니다.`}
                  items={[
                    `비교표: 공통 ${rows.filter((r) => r.relation === "공통").length} · 차이 후보 ${rows.filter((r) => r.relation === "차이 후보").length} · 근거 부족 ${rows.filter((r) => r.relation === "근거 부족").length}`,
                    "특허성 의견과 선행 문헌과 다른 점 후보",
                    "사업 중요도와 경쟁사 모방 가능성",
                    "권리의 강도: 우회 어려움 · 침해 발견 · 입증 용이성",
                    "출원 방식 추천 (국내·해외·영업비밀·보류)",
                  ]}
                >
                  <Button arrow onClick={doReview} loading={busy === "review"}>
                    검토서 초안 만들기
                  </Button>
                </EmptyAction>
              ) : (
                <div>
                  <ReviewResult
                    review={review}
                    matrix={matrix}
                    intake={intake}
                    scope={scope}
                    rows={rows}
                    meta={{
                      caseNo,
                      title: intake.title,
                      inventor: form.inventor,
                      dept: form.dept,
                      stage,
                      purpose: purposeLabel(purpose) + (purpose === "경쟁사 조사" && competitor ? ` · ${competitor}` : ""),
                      disclosure: disclosure ? `${disclosure.type} ${disclosure.date}${disc ? ` (D-${disc.days})` : ""}` : "없음",
                    }}
                  />
                  <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
                    <button
                      type="button"
                      onClick={doReview}
                      disabled={busy === "review"}
                      className="h-[46px] rounded-[10px] border bg-white px-5 text-[14.5px] font-bold transition hover:bg-[var(--crimson-soft)] disabled:opacity-40"
                      style={{ borderColor: "var(--crimson)", color: "var(--crimson)" }}
                    >
                      {busy === "review" ? "다시 쓰는 중…" : "초안 다시 만들기"}
                    </button>
                    <button type="button" onClick={() => go(5)} className="h-[52px] rounded-[10px] px-7 text-[15px] font-bold text-white transition hover:brightness-110" style={{ background: "var(--crimson)" }}>
                      권리범위 설계
                    </button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 5 */}
          {step === 5 && intake && review && (
            <Card>
              <StepTitle n={5} title="권리범위 설계" sub="경쟁사라면 어떻게 피할지 먼저 봅니다. 청구항은 변리사가 씁니다." />
              {!scope ? (
                <div className="py-10 text-[15px]" style={{ color: "var(--ink-soft)" }} role="status" aria-live="polite">
                  {busy === "scope" ? (
                    "경쟁사라면 구성마다 어떻게 피할지 시도하는 중입니다…"
                  ) : (
                    <>
                      설계안을 만들지 못했습니다.{" "}
                      <button type="button" onClick={doScope} className="font-bold underline underline-offset-2" style={{ color: "var(--crimson)" }}>
                        다시 시도
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  {(() => {
                    const cores = scope.items.filter((i) => i.role === "핵심").map((i) => i.componentName);
                    return (
                      <section className="grid gap-x-14 gap-y-4 border-b pb-10 md:grid-cols-[auto_1fr] md:items-end" style={{ borderColor: "var(--rule)" }}>
                        <div>
                          <div className="text-[13px]" style={{ color: "var(--ink-mute)" }}>
                            권리범위 방향
                          </div>
                          <div className="mt-1.5 font-[family-name:var(--font-display)] text-[42px] font-extrabold leading-tight tracking-[-.04em]" style={{ color: "var(--crimson)" }}>
                            {cores.length ? `${cores.join(" · ")} 중심` : "핵심 구성 없음"}
                          </div>
                        </div>
                        <p className="max-w-[640px] pb-1 text-[14px] leading-[1.8]" style={{ color: "var(--ink-soft)" }}>
                          {scope.strategy}
                        </p>
                      </section>
                    );
                  })()}

                  {(() => {
                    const conflict = strengthConflict(scope.items, review.strength?.designAround);
                    if (!conflict || !review.strength) return null;
                    return (
                      <div className="mt-8 rounded-[12px] p-5 text-[14px] leading-[1.7]" style={{ background: "var(--crimson-soft)" }}>
                        <b>4단계 판단과 다릅니다.</b> 권리의 강도에서는 우회 어려움을 ‘{review.strength.designAround.level}’으로 봤지만, 경쟁사 관점에서 시도해 보니 ‘{conflict.item.componentName}’은(는) {conflict.item.role}입니다. {conflict.item.reason}
                        <div className="mt-3">
                          <Button
                            variant="ghost"
                            onClick={() => {
                              setReview((r) =>
                                r?.strength
                                  ? {
                                      ...r,
                                      strength: {
                                        ...r.strength,
                                        designAround: { level: conflict.suggested, reason: `5단계 회피 검토: ${conflict.item.reason}`, basis: conflict.item.componentName },
                                      },
                                    }
                                  : r
                              );
                              log("담당자", `권리의 강도 수정: 우회 어려움 → ${conflict.suggested} (5단계 회피 검토 반영)`);
                            }}
                          >
                            권리의 강도에 반영 (우회 어려움 → {conflict.suggested})
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  <section className="mt-10">
                    <h3 className="flex flex-wrap items-baseline gap-3 text-[18px] font-extrabold">
                      구성별 구분
                      <span className="text-[13px] font-normal" style={{ color: "var(--ink-mute)" }}>
                        권리에서 맡는 역할. 담당자가 바꿀 수 있습니다.
                      </span>
                    </h3>
                    <p className="mt-2 text-[13px]" style={{ color: "var(--ink-mute)" }}>
                      핵심: 바꾸면 효과가 사라짐 · 대체 가능: 바꿔도 효과가 같음 · 부가: 없어도 됨
                    </p>
                    <ol className="mt-4 border-t" style={{ borderColor: "var(--rule)" }}>
                      {scope.items.map((it) => (
                        <ScopeItemCard key={it.componentName} it={it} onRole={(r) => setRole(it.componentName, r)} onConfirm={(m, v) => confirmAttempt(it.componentName, m, v)} />
                      ))}
                    </ol>
                  </section>

                  {(() => {
                    const ask = scope.items.flatMap((i) => (i.attempts ?? []).map((a) => ({ i, a }))).filter(({ a }) => needsConfirm(a));
                    if (!ask.length) return null;
                    return (
                      <details className="group border-b" style={{ borderColor: "var(--rule)" }}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[18px] text-[14px] font-bold [&::-webkit-details-marker]:hidden">
                          <span>발명자에게 확인할 대체 수단 {ask.length}건</span>
                          <span className="text-[13px] font-normal group-open:hidden" style={{ color: "var(--ink-soft)" }}>
                            열기
                          </span>
                          <span className="hidden text-[13px] font-normal group-open:inline" style={{ color: "var(--ink-soft)" }}>
                            접기
                          </span>
                        </summary>
                        <div className="pb-5">
                          <ResearcherRequest
                            title={intake.title}
                            caseNo={caseNo}
                            inventor={form.inventor}
                            dept={form.dept}
                            questions={ask.map(({ i, a }) => `"${i.componentName}"을(를) '${a.method}'(으)로 바꿔도 같은 효과가 나나요? 다르다면 무엇이 다른가요?`)}
                            sentAt={scopeSentAt}
                            onSent={(channel) => {
                              setScopeSentAt(new Date().toISOString());
                              log("담당자", `대체 수단 확인 질문 ${ask.length}개 발송 (${channel})`);
                            }}
                          />
                          <p className="mt-2 text-[13px]" style={{ color: "var(--ink-mute)" }}>
                            답을 받으면 위 구성의 ‘회피 시도와 이유 보기’에서 효과 같음·다름을 눌러 반영하세요. 구분이 다시 계산됩니다.
                          </p>
                        </div>
                      </details>
                    );
                  })()}

                  <div className="mt-8 flex justify-end">
                    <Button onClick={() => go(6)}>출원 결정</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 6 */}
          {step === 6 && intake && review && (
            <Card className="print-area">
              <div className="no-print">
                <StepTitle n={6} title="출원 결정·변리사 전달" sub="출원 방식을 정하고 승인하면, 승인된 버전만 변리사에게 넘깁니다." />
              </div>

              {!approvedAt && (
                <div className="no-print grid gap-8 lg:grid-cols-[1fr_300px]">
                  <div className="min-w-0 space-y-8">
                    <div>
                      <div className="mb-3 font-[family-name:var(--font-display)] text-[12px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--ink-soft)" }}>
                        출원 방식 결정
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="출원 방식">
                        {DECISIONS.map((d) => {
                          const on = decision === d;
                          return (
                            <button
                              key={d}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => setDecision(d)}
                              className="flex flex-col gap-1.5 border bg-white p-4 text-left transition"
                              style={on ? { borderColor: "var(--crimson)", boxShadow: "inset 0 0 0 1px var(--crimson), 0 14px 24px -18px rgba(29,79,216,.6)" } : { borderColor: "var(--rule)" }}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-2 text-[15px] font-extrabold">
                                  <span
                                    className="grid h-4 w-4 place-items-center rounded-full border"
                                    style={{ borderColor: on ? "var(--crimson)" : "var(--rule)" }}
                                  >
                                    {on && <span className="h-2 w-2 rounded-full" style={{ background: "var(--crimson)" }} />}
                                  </span>
                                  {d}
                                </span>
                                {review.recommendation === d && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: "var(--crimson)" }}>
                                    AI 추천
                                  </span>
                                )}
                              </span>
                              <span className="text-[12.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                                {DECISION_INFO[d]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4">
                        <Fold summary={`AI 추천 ‘${review.recommendation}’에 쓴 사실`}>
                          <BasisList title="" facts={recommendationBasis(intake, review, matrix, scope)} />
                        </Fold>
                      </div>
                      <label htmlFor="decision-memo" className="mb-1.5 mt-4 block text-[13px] font-bold">
                        결정 메모{overrideNeedsMemo && <span style={{ color: "var(--crimson)" }}> * AI 추천과 다르게 정한 이유를 적어 주세요</span>}
                      </label>
                      <textarea
                        id="decision-memo"
                        rows={2}
                        value={decisionMemo}
                        onChange={(e) => setDecisionMemo(e.target.value)}
                        placeholder="예: 해외는 미국만, 제어 로직은 영업비밀로"
                        className="w-full border bg-white px-3 py-2.5 text-[13.5px] outline-none focus:border-[var(--crimson)]"
                        style={{ borderColor: "var(--rule)" }}
                      />
                      {disc && disc.level !== "여유" && (
                        <p className="mt-2 text-[12.5px] font-bold" style={{ color: "var(--crimson)" }}>
                          {disc.message}
                        </p>
                      )}
                    </div>

                    <Fold
                      defaultOpen={unconfirmed > 0}
                      summary={
                        <>
                          비교표 담당자 확인{" "}
                          <span style={{ color: unconfirmed ? "var(--crimson)" : "var(--ink)" }}>
                            {rows.length - unconfirmed} / {rows.length}
                          </span>
                          {unconfirmed > 0 && <span className="ml-1.5 text-[11px] font-normal" style={{ color: "var(--crimson)" }}>승인 전에 모두 확인해야 합니다</span>}
                        </>
                      }
                    >
                      <CompareTable rows={rows} confirmed={confirmed} changed={changed} onToggle={toggleConfirm} />
                    </Fold>
                  </div>

                  <aside className="lg:sticky lg:top-20 lg:self-start">
                    <div className="border bg-white" style={{ borderColor: "var(--rule)" }}>
                      <div className="border-b px-4 py-3 text-[13px] font-extrabold" style={{ borderColor: "var(--rule)" }}>
                        승인 전 확인
                      </div>
                      <ul className="space-y-2.5 px-4 py-4 text-[12.5px]">
                        {(
                          [
                            [`비교표 확인 ${rows.length - unconfirmed}/${rows.length}`, unconfirmed === 0 && rows.length > 0],
                            ["특허성·사업성 검토서", !!review],
                            ["권리범위 설계", !!scope],
                            [`출원 방식: ${decision}${review && decision !== review.recommendation ? " (AI 추천과 다름)" : ""}`, !overrideNeedsMemo],
                          ] as [string, boolean][]
                        ).map(([label, ok]) => (
                          <li key={label} className="flex items-center gap-2">
                            <span
                              className="grid h-4 w-4 shrink-0 place-items-center text-[10px] font-bold"
                              style={ok ? { background: "var(--crimson)", color: "#fff" } : { border: "1px solid var(--rule)", color: "transparent" }}
                            >
                              ✓
                            </span>
                            <span style={{ color: ok ? "var(--ink)" : "var(--ink-soft)" }}>{label}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="border-t px-4 py-4" style={{ borderColor: "var(--rule)" }}>
                        <label htmlFor="approver" className="mb-1.5 block text-[12px] font-bold">
                          승인자
                        </label>
                        <input
                          id="approver"
                          value={approver}
                          onChange={(e) => setApprover(e.target.value)}
                          placeholder="예: 연구소장"
                          className="mb-3 w-full border px-3 py-2 text-[13.5px] outline-none focus:border-[var(--crimson)]"
                          style={{ borderColor: "var(--rule)" }}
                        />
                        <Button arrow onClick={approve} disabled={!approver.trim() || unconfirmed > 0 || overrideNeedsMemo}>
                          승인하고 전달자료 만들기
                        </Button>
                        {unconfirmed > 0 && (
                          <p className="mt-2 text-[11.5px] font-bold" style={{ color: "var(--crimson)" }}>
                            비교표 {unconfirmed}줄을 먼저 확인해 주세요.
                          </p>
                        )}
                        {overrideNeedsMemo && (
                          <p className="mt-2 text-[11.5px] font-bold" style={{ color: "var(--crimson)" }}>
                            AI 추천과 다르게 정한 이유를 결정 메모에 적어 주세요.
                          </p>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              )}

              {handoff && (
                <>
                  <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-white" style={{ background: "var(--crimson)" }}>
                    <div className="text-[13.5px] font-bold">
                      ✓ 승인 완료 · {handoff.approver} · {new Date(handoff.approvedAt).toLocaleString("ko-KR")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => window.print()} className="bg-white px-3 py-2 text-[12.5px] font-bold" style={{ color: "var(--crimson)" }}>
                        인쇄 · PDF 저장
                      </button>
                      <button type="button" onClick={downloadMarkdown} className="border border-white/60 px-3 py-2 text-[12.5px] font-bold">
                        Markdown 내려받기
                      </button>
                    </div>
                  </div>

                  <article id="inpro-handoff" className="ws-sheet mx-auto max-w-[880px] space-y-6 p-6 text-[13.5px] leading-relaxed sm:p-10">
                    <header className="border-b-2 pb-5" style={{ borderColor: "var(--ink)" }}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--crimson)" }}>
                            InPro · 변리사 전달자료
                          </div>
                          <h2 className="mt-1 font-[family-name:var(--font-display)] text-[26px] font-extrabold leading-tight">{handoff.intake.title}</h2>
                        </div>
                        <span className="px-3 py-1.5 text-[13px] font-bold text-white" style={{ background: "var(--crimson)" }}>
                          {handoff.decision}
                        </span>
                      </div>
                      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[12.5px] sm:grid-cols-3">
                        {(
                          [
                            ["접수번호", caseNo ?? "-"],
                            ["기술 분야", handoff.intake.field],
                            ["개발 단계", stage],
                            ["조사 목적", purposeLabel(purpose) + (purpose === "경쟁사 조사" && competitor ? ` · ${competitor}` : "")],
                            ["발명자", [form.inventor, form.dept].filter(Boolean).join(" / ") || "-"],
                            ["승인", `${handoff.approver} · ${new Date(handoff.approvedAt).toLocaleDateString("ko-KR")}`],
                            ["공개 예정", disclosure ? `${disclosure.type} ${disclosure.date}` : "없음"],
                          ] as [string, string][]
                        ).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <dt className="shrink-0 font-bold" style={{ color: "var(--ink-mute)" }}>
                              {k}
                            </dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                      {handoff.decisionMemo && (
                        <p className="mt-3 text-[12.5px]">
                          <b>결정 메모</b> {handoff.decisionMemo}
                        </p>
                      )}
                      {disclosure && disc && disc.level !== "여유" && (
                        <p className="mt-2 text-[12.5px] font-bold" style={{ color: "var(--crimson)" }}>
                          {disc.message}
                        </p>
                      )}
                    </header>

                    {handoff.scope && (
                      <DocSection n="00" title="차별점과 권리범위 요약" tag={<Tag>경쟁사 회피 검토 · 원문 확인된 비교표</Tag>}>
                        <p className="mb-3 font-bold">{handoff.scope.strategy}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                            <thead>
                              <tr style={{ color: "var(--ink-mute)" }}>
                                {["구성", "구분", "선행 문헌 근거", "권리에 담는 방법"].map((h) => (
                                  <th key={h} className="border-b px-2 py-1.5 text-left text-[11px] font-bold" style={{ borderColor: "var(--rule)" }}>
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {distinctionSummary(handoff.scope, handoff.matrix).map((r) => (
                                <tr key={r.componentName} className="align-top">
                                  <td className="border-b px-2 py-2 font-bold" style={{ borderColor: "#e9edf3" }}>{r.componentName}</td>
                                  <td className="border-b px-2 py-2" style={{ borderColor: "#e9edf3" }}>
                                    <span className="px-1.5 py-0.5 text-[11px] font-bold" style={r.role === "핵심" ? { background: "var(--crimson)", color: "#fff" } : { background: "#e7eefc", color: "var(--crimson)" }}>
                                      {r.role}
                                    </span>
                                  </td>
                                  <td className="border-b px-2 py-2" style={{ borderColor: "#e9edf3", color: "var(--ink-soft)" }}>{r.evidence}</td>
                                  <td className="border-b px-2 py-2" style={{ borderColor: "#e9edf3" }}>{r.advice}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </DocSection>
                    )}
                    <DocSection n="01" title="발명 설명" tag={<Tag tone="green">연구원 확인</Tag>}>
                      <p className="whitespace-pre-line">{handoff.description}</p>
                      {qa.some((q) => q.answer.trim()) && (
                        <ul className="mt-3 space-y-2 border-l-2 pl-3" style={{ borderColor: "#e3e8f0" }}>
                          {qa
                            .filter((q) => q.answer.trim())
                            .map((q) => (
                              <li key={q.question}>
                                <b>Q.</b> {q.question}
                                <br />
                                <b>A.</b> {q.answer}
                              </li>
                            ))}
                        </ul>
                      )}
                    </DocSection>
                    <DocSection n="02" title="해결 문제와 구성 요소" tag={<Tag>AI 제안</Tag>}>
                      <p className="mb-2">{handoff.intake.problem}</p>
                      <ul className="space-y-1">
                        {handoff.intake.components.map((c) => (
                          <li key={c.id}>
                            <span className="mr-1.5 font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>
                              {c.id}
                            </span>
                            <b>{c.name}</b> — {c.description}
                          </li>
                        ))}
                      </ul>
                    </DocSection>
                    <DocSection n="03" title="선행 문헌 비교표" tag={<Tag>AI 제안 · 원문 인용 확인</Tag>}>
                      {matrix && (
                        <div className="mb-4">
                          <MatrixView m={matrix} readOnly />
                        </div>
                      )}
                      <CompareTable rows={handoff.rows} />
                    </DocSection>
                    <DocSection n="04" title="특허성·사업성 검토" tag={<Tag>AI 초안 → 담당자 확정</Tag>}>
                      <p>{handoff.review.summary}</p>
                      <p className="mt-1.5">
                        <b>특허성</b> {handoff.review.patentability}
                      </p>
                      <p className="mt-1.5">
                        <b>사업 중요도</b> {handoff.review.businessImportance} · <b>경쟁사 모방 가능성</b> {handoff.review.imitationRisk}
                      </p>
                      {handoff.review.strength && (
                        <p className="mt-1.5">
                          <b>권리의 강도</b> {overallStrength(handoff.review.strength).level} —{" "}
                          {STRENGTH_AXES.map((a) => `${a.label} ${handoff.review.strength![a.key].level}`).join(" · ")}. {overallStrength(handoff.review.strength).text}
                        </p>
                      )}
                    </DocSection>
                    {handoff.scope && (
                      <DocSection n="05" title="권리범위 설계 방향" tag={<Tag>AI 제안 → 담당자 확정</Tag>}>
                        <p className="mb-2">{handoff.scope.strategy}</p>
                        <ul className="space-y-1">
                          {handoff.scope.items.map((i) => (
                            <li key={i.componentName}>
                              <b>
                                [{i.role}] {i.componentName}
                              </b>{" "}
                              — 경쟁사 회피 시도: {i.attempts?.length ? i.attempts.map((a) => `${a.method}(${effectOf(a)}·${trustOf(a)})`).join(", ") : i.alternatives} (우회 {i.designAround})
                              {i.advice && <> · {i.advice}</>}
                            </li>
                          ))}
                        </ul>
                      </DocSection>
                    )}
                    <DocSection n="06" title="변리사님께 드리는 질문과 남은 쟁점">
                      <ul className="space-y-1">
                        {openQuestions(handoff).map((q) => (
                          <li key={q}>- {q}</li>
                        ))}
                      </ul>
                    </DocSection>
                    <DocSection n="07" title="조사 기록">
                      <div className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                        {surveys.map((s) => (
                          <p key={s.at}>
                            [{s.stage}] {new Date(s.at).toLocaleString("ko-KR")} · 판단 바뀐 구성 {s.changedCount}개{s.note ? ` · ${s.note}` : ""}
                          </p>
                        ))}
                        {searchLog && (
                          <p>
                            최근 조사: {searchLog.corpus} · 키워드 {searchLog.keywords.join(", ")}
                          </p>
                        )}
                        {handoff.exclusions && handoff.exclusions.length > 0 && (
                          <div className="mt-2">
                            <b style={{ color: "var(--ink)" }}>제외한 후보 문헌</b>
                            <ul className="mt-0.5">
                              {handoff.exclusions.map((e) => (
                                <li key={e.id}>
                                  - {e.title} ({e.id}) — {e.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="mt-2 font-bold" style={{ color: "var(--ink)" }}>
                          신규성·진보성, 침해 여부의 최종 판단은 변리사님께 요청드립니다.
                        </p>
                      </div>
                    </DocSection>
                  </article>
                  <WatchPanel
                    watch={watch}
                    components={handoff.intake.components.map((c) => ({ id: c.id, name: c.name }))}
                    keywords={keywords}
                    scope={[searchScope?.usage, searchScope?.facet].filter(Boolean).join(" · ") || "전체 분야"}
                    onRegister={() => {
                      setWatch({
                        at: new Date().toISOString(),
                        components: handoff.intake.components.map((c) => ({ id: c.id, name: c.name })),
                        keywords,
                        scope: [searchScope?.usage, searchScope?.facet].filter(Boolean).join(" · ") || "전체 분야",
                      });
                      log("담당자", `새 특허 감시 등록: 구성 ${handoff.intake.components.length}개, 검색어 ${keywords.length}개`);
                    }}
                    onCancel={() => {
                      setWatch(null);
                      log("담당자", "새 특허 감시 해제");
                    }}
                  />
                </>
              )}
            </Card>
          )}
        </div>

        {/* SIDEBAR: 멘토링에서 사건 기록·재조사 칸은 화면에서 빼기로 해서 숨겨 둔다 (마이페이지로 옮길 때까지) */}
        <aside className="hidden">
          {disc && (
            <Card>
              <h3 className="mb-1 text-sm font-extrabold">공개 전 출원 알림</h3>
              <div className="font-[family-name:var(--font-display)] text-3xl font-bold" style={{ color: disc.level === "여유" ? "var(--ink)" : "var(--crimson)" }}>
                {disc.days >= 0 ? `D-${disc.days}` : `D+${-disc.days}`}
              </div>
              <p className="mt-1 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>{disc.message}</p>
            </Card>
          )}

          {rows.length > 0 && (
            <Card>
              <h3 className="mb-2 text-sm font-extrabold">개발 단계별 재조사</h3>
              <ol className="mb-3 space-y-1.5">
                {DEV_STAGES.map((s) => {
                  const rec = surveys.filter((r) => r.stage === s).at(-1);
                  const current = s === stage;
                  return (
                    <li key={s} className="flex items-center justify-between gap-2 text-[12.5px]">
                      <span className="font-bold" style={{ color: current ? "var(--crimson)" : rec ? "var(--ink)" : "var(--ink-mute)" }}>
                        {current ? "● " : rec ? "○ " : "· "}
                        {s}
                      </span>
                      {rec && <span className="font-mono text-[10.5px]" style={{ color: "var(--ink-soft)" }}>변경 {rec.changedCount}</span>}
                    </li>
                  );
                })}
              </ol>
              <select value={nextStage} onChange={(e) => setNextStage(e.target.value as DevStage)} className={`mb-2 w-full ${inputCls}`} style={{ borderColor: "var(--hairline)", background: "#fff" }} aria-label="다음 개발 단계">
                {DEV_STAGES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <textarea rows={3} value={changeNote} onChange={(e) => setChangeNote(e.target.value)} placeholder="바뀐 설계 내용 (예: 펌프 대신 밸브로 유량 조절)" className={`mb-2 w-full p-2 text-[12.5px] ${inputCls}`} style={{ borderColor: "var(--hairline)", background: "#fff" }} />
              <Button onClick={doResurvey} loading={busy === "resurvey"}>이 단계로 재조사</Button>
              <p className="mt-2 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>바뀐 설계로 다시 조사하고, 판단이 바뀐 구성만 재승인을 요구합니다.</p>
            </Card>
          )}

          <Card>
            <h3 className="mb-3 text-sm font-extrabold">사건 기록</h3>
            {events.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>발명 자료를 넣으면 누가 언제 무엇을 했는지 여기에 쌓입니다.</p>
            ) : (
              <ol className="max-h-[50vh] space-y-3 overflow-y-auto">
                {events.map((e, i) => (
                  <li key={i} className="border-l-2 pl-3 text-[12.5px]" style={{ borderColor: e.actor === "InPro AI" ? "var(--ink-mute)" : "var(--crimson)" }}>
                    <div className="font-mono text-[10.5px]" style={{ color: "var(--ink-soft)" }}>
                      {new Date(e.at).toLocaleTimeString("ko-KR")} · {e.actor}
                    </div>
                    {e.text}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </aside>
      </main>
    </div>
  );
}
