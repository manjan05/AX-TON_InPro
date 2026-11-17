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
import { DocCard, NearMissPanel, SearchPath, type SearchMeta } from "./SearchResults";
import { ResearcherRequest } from "./ResearcherRequest";
import { DECISION_INFO, DocSection, EmptyAction, LevelMeter, MetricCard } from "./StepParts";
import { StrengthCard } from "./StrengthCard";
import { DataNotice } from "./DataNotice";
import { Fold, SubRail, type Sub3 } from "./Parts3";
import { BasisList, EvidenceLine } from "./Evidence";
import { componentEvidence, distinctionSummary, recommendationBasis } from "@/lib/inpro/basis";
import { ScopeItemCard } from "./ScopeItemCard";
import { strengthConflict } from "@/lib/inpro/designaround";
import { STRENGTH_AXES, overallStrength } from "@/lib/inpro/strength";
import { EMPTY_FORM, EXAMPLE_FORM, IntakeForm, composeDescription, type IntakeFormState } from "./IntakeForm";
import { ChecklistView } from "./ChecklistView";
import { WatchPanel, type WatchInfo } from "./WatchPanel";
import { DistinctionLoop } from "./DistinctionLoop";
import { TargetPicker, type InvalidityTarget, type SearchTargets } from "./TargetPicker";
import { buildInvalidityMarkdown } from "@/lib/inpro/package";
import { appendFollowUp, priorArtQuestions, summarizeRound, type SurveyRound } from "@/lib/inpro/followup";

// 팀장 인터뷰 질문 2의 실제 발명 검토 흐름을 따른다
const STEPS = ["발명 접수", "기술 이해·보완", "선행기술 조사", "특허성·사업성", "권리범위 설계", "출원 결정·전달"];

const ROLES: ScopeRole[] = ["핵심", "대체 가능", "부가"];

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
  // 경쟁사 조사·무효자료 조사 대상
  const [targets, setTargets] = useState<SearchTargets | null>(null);
  const [competitor, setCompetitor] = useState("");
  const [invalidTarget, setInvalidTarget] = useState<InvalidityTarget | null>(null);
  const [followAnswers, setFollowAnswers] = useState<Record<string, string>>({});
  const [followSentAt, setFollowSentAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [searchMeta, setSearchMeta] = useState<SearchMeta | null>(null);
  const [excluded, setExcluded] = useState<Record<string, ExcludeReason>>({});
  const [askReason, setAskReason] = useState<Set<string>>(new Set());
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
    setAskReason(new Set());
    setSearchLog(result.log);
    // 둘 다: 기본 선택에 등록 특허가 최소 2건은 들어가게 (침해 위험 판정이 비지 않도록)
    const pick = result.docs.slice(0, 4);
    const needLive = purpose === "둘 다" ? Math.max(0, 2 - pick.filter((d) => d.status === "등록").length) : 0;
    const addLive = result.docs.filter((d) => d.status === "등록" && !pick.includes(d)).slice(0, needLive);
    setSelected(new Set([...pick, ...addLive].map((d) => d.id)));
    setSub3("후보");
    log("담당자", `조사 범위 확정: 키워드 ${keywords.length}개`);
    log("InPro AI", `선행조사 실행, 후보 ${result.docs.length}건`);
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
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(d.id)) n.delete(d.id);
      else if (n.size < 6) n.add(d.id);
      return n;
    });
    if (on) setAskReason((a) => new Set(a).add(d.id));
    else
      setExcluded((e) => {
        const n = { ...e };
        delete n[d.id];
        return n;
      });
  }

  function excludeDoc(d: PriorDoc, reason: ExcludeReason) {
    setExcluded((e) => ({ ...e, [d.id]: reason }));
    log("담당자", `후보 제외: ${d.title.slice(0, 24)} (${reason})`);
  }

  function addNearMiss(id: string) {
    const doc = searchMeta?.extra.find((x) => x.id === id);
    if (!doc || docs.some((x) => x.id === id)) return;
    setDocs((ds) => [...ds, doc]);
    setSelected((s) => (s.size < 6 ? new Set(s).add(id) : s));
    setSearchMeta((m) => (m ? { ...m, nearMiss: { ...m.nearMiss, items: m.nearMiss.items.filter((n) => n.id !== id) } } : m));
    log("담당자", `탈락 문헌을 후보에 추가: ${doc.title.slice(0, 24)}`);
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
      <header className="no-print sticky top-0 z-30 border-b backdrop-blur" style={{ background: "rgba(236,235,231,.92)", borderColor: "var(--hairline)" }}>
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
              <div className="font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--ink-soft)" }}>
                {caseNo ?? "CASE"} · {intake ? intake.field : "새 발명 사건"}
              </div>
              <h1
                className="truncate font-[family-name:var(--font-display)] text-[44px] font-black uppercase leading-none tracking-[-.02em] max-sm:text-[32px]"
                style={{ color: "var(--crimson)" }}
              >
                {intake ? intake.title : "New Case"}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="border bg-white/70 px-3 py-1.5 text-[12px] font-bold" style={{ borderColor: "var(--rule)" }}>
                개발 단계 · {stage}
              </span>
              {disc && (
                <span
                  className="px-3 py-1.5 text-[12px] font-bold"
                  style={disc.level === "여유" ? { background: "#fff", color: "var(--ink)" } : { background: "var(--crimson)", color: "#fff" }}
                >
                  {disclosure?.type} {disc.days >= 0 ? `D-${disc.days}` : `D+${-disc.days}`}
                </span>
              )}
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
                              : { background: "rgba(255,255,255,.55)", color: "var(--ink-mute)", borderColor: "#b5b4b0" }
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

      <main className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 ${step === 3 ? "lg:grid-cols-[1fr_300px]" : ""}`}>
        <div className="min-w-0 space-y-5">
          {error && (
            <div className="no-print border px-4 py-3 text-sm font-bold" style={{ borderColor: "#d9b8bb", background: "#efe2e2", color: "var(--crimson)" }}>
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <Card>
              <StepTitle n={1} title="발명 접수" sub="연구원 자료를 그대로 넣으면 구성과 빠진 항목을 짚어 드립니다." />
              <div className="mb-6">
                <DataNotice />
              </div>
              <IntakeForm
                form={form}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                stage={stage}
                onStage={setStage}
                discDate={discDate}
                discType={discType}
                onDiscDate={setDiscDate}
                onDiscType={setDiscType}
                caseNo={caseNo}
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

              {intake && (
                <div className="mt-10 border-t pt-8" style={{ borderColor: "var(--hairline)" }}>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-[family-name:var(--font-display)] text-[26px] font-extrabold leading-tight">
                        구성 {intake.components.length}개 · 빠진 항목 <span style={{ color: "var(--crimson)" }}>{intake.missing.length}개</span>
                      </div>
                      <div className="line-clamp-1 text-[12px]" style={{ color: "var(--ink-mute)" }}>
                        {intake.field} · {intake.problem}
                      </div>
                    </div>
                    <Button arrow onClick={() => go(2)}>
                      다음: 발명자 인터뷰
                    </Button>
                  </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-extrabold">기술 구성 초안 <Tag>AI 제안</Tag></h3>
                    <ul className="space-y-2">
                      {intake.components.map((c) => (
                        <li key={c.id} className="border p-3 text-[13px]" style={{ borderColor: "var(--hairline)", background: "#fff" }}>
                          <span className="mr-1 font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>{c.id}</span>
                          <b>{c.name}</b>
                          <div className="mt-0.5" style={{ color: "var(--ink-soft)" }}>{c.description}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="mb-2 text-sm font-extrabold">
                      출원 체크리스트 <Tag tone="orange">충족 {(intake.checklist ?? []).filter((c) => c.status === "충족").length}/{intake.checklist?.length ?? 8}</Tag>
                    </h3>
                    <ChecklistView items={intake.checklist ?? []} />
                  </div>
                </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 2 */}
          {step === 2 && intake && (
            <Card>
              <StepTitle
                n={2}
                title="기술 이해·보완"
                sub="발명자에게 물어볼 것만 질문으로 만들었습니다."
              />
              <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                <div className="min-w-0">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-display)] text-[12px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--ink-soft)" }}>
                        보완 질문
                      </span>
                      <span className="text-[12px] font-bold" style={{ color: "var(--crimson)" }}>
                        답변 {answers.filter((x) => x.trim()).length} / {questions.length}
                      </span>
                    </div>
                    <div className="h-1.5 w-40" style={{ background: "#e6e5e1" }}>
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${questions.length ? (answers.filter((x) => x.trim()).length / questions.length) * 100 : 0}%`, background: "var(--crimson)" }}
                      />
                    </div>
                  </div>

                  <ol className="space-y-3">
                    {questions.map((q, i) => {
                      const answered = !!answers[i]?.trim();
                      return (
                        <li
                          key={q}
                          className="border bg-white transition"
                          style={{ borderColor: answered ? "var(--crimson)" : "var(--rule)", boxShadow: answered ? "inset 3px 0 0 var(--crimson)" : "none" }}
                        >
                          <div className="flex items-start gap-3 px-4 pt-4">
                            <span
                              className="grid h-7 w-7 shrink-0 place-items-center font-[family-name:var(--font-display)] text-[13px] font-bold"
                              style={answered ? { background: "var(--crimson)", color: "#fff" } : { background: "var(--paper)", color: "var(--ink)" }}
                            >
                              {answered ? "✓" : `Q${i + 1}`}
                            </span>
                            <div className="min-w-0 flex-1">
                              <label htmlFor={`answer-${i}`} className="block text-[14px] font-bold leading-snug">
                                {q}
                              </label>
                              <div className="mt-1 text-[11.5px]" style={{ color: answered ? "var(--crimson)" : "var(--ink-mute)" }}>
                                {answered ? "답변 완료" : requestSentAt ? "연구원 답변 대기" : "아직 보내지 않음"}
                              </div>
                            </div>
                          </div>
                          <div className="px-4 pb-4 pt-3 pl-14">
                            <textarea
                              id={`answer-${i}`}
                              rows={2}
                              value={answers[i] ?? ""}
                              onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                              placeholder="연구원 답변을 붙여넣으세요"
                              className="w-full border px-3 py-2 text-[13.5px] leading-relaxed outline-none transition focus:border-[var(--crimson)]"
                              style={{ borderColor: "var(--rule)", background: "var(--paper)" }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ol>

                  <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-5" style={{ borderColor: "var(--hairline)" }}>
                    <Button arrow onClick={doRefine} loading={busy === "refine"} disabled={!answersText}>
                      {rows.length ? "답변 반영해 비교표 다시 만들기" : "답변 반영하고 조사로"}
                    </Button>
                    <Button variant="ghost" onClick={() => go(3)}>
                      답변 없이 조사로
                    </Button>
                  </div>
                </div>

                <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
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
                  {intake.missing.length > 0 && (
                    <Fold summary={`질문의 근거 · 빠진 항목 ${intake.missing.length}개`}>
                      <ul className="space-y-1.5 text-[12.5px]">
                        {intake.missing.map((m) => (
                          <li key={m.item}>
                            <b style={{ color: "var(--crimson)" }}>{m.item}</b>
                            <span style={{ color: "var(--ink-soft)" }}> · {m.why}</span>
                          </li>
                        ))}
                      </ul>
                    </Fold>
                  )}
                </aside>
              </div>
            </Card>
          )}

          {/* STEP 3 */}
          {step === 3 && intake && (
            <Card>
              <StepTitle n={3} title="선행기술 조사" sub="목적을 정하고, 후보를 고르면, 구성별로 비교합니다." />
              <SubRail view={view3} canCandidates={docs.length > 0} canResult={rows.length > 0} onPick={setSub3} />

              {/* ① 조사 설정 */}
              {view3 === "설정" && (
                <div>
                  <div className="mb-5">
                    <div className="mb-2 font-[family-name:var(--font-display)] text-[12px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--ink-soft)" }}>
                      조사 목적
                    </div>
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="조사 목적">
                      {PURPOSES.map((p) => {
                        const on = purpose === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => changePurpose(p)}
                            className="border px-3.5 py-2 text-[13.5px] font-bold transition"
                            style={on ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)" } : { borderColor: "var(--rule)", background: "#fff" }}
                          >
                            {PURPOSE_INFO[p].label}
                            {p === "둘 다" && <span className="ml-1.5 text-[10px] opacity-80">기본</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2.5 text-[13.5px] font-bold">{PURPOSE_INFO[purpose].question}</p>
                    <p className="mt-0.5 text-[12px] leading-snug" style={{ color: "var(--ink-soft)" }}>
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
                  </div>
                  <FunnelPanel scope={searchScope} onScope={setSearchScope} purpose={purpose} />
                  <div className="mb-3 flex flex-wrap gap-2">
                    {searchKeywords.map((k) => (
                      <span key={k} className="inline-flex items-center gap-1 px-3 py-1 text-[13px] font-bold" style={{ background: "var(--crimson-soft)", color: "var(--crimson)" }}>
                        {k}
                        <button type="button" aria-label={`${k} 삭제`} onClick={() => editKeywords((ks) => ks.filter((x) => x !== k))} className="ml-0.5 opacity-60 hover:opacity-100">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <form
                    className="flex flex-wrap items-center gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const k = newKeyword.trim();
                      if (k && !searchKeywords.includes(k)) editKeywords((ks) => [...ks, k]);
                      setNewKeyword("");
                    }}
                  >
                    <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="키워드 추가" className={`w-44 ${inputCls}`} style={{ borderColor: "var(--hairline)", background: "#fff" }} />
                    <Button variant="ghost">추가</Button>
                    <span className="mx-1 h-5 w-px" style={{ background: "var(--rule)" }} />
                    <Button arrow onClick={doSearch} loading={busy === "search"} disabled={searchKeywords.length === 0 || !targetReady}>
                      {targetReady ? "선행조사 실행" : purpose === "경쟁사 조사" ? "경쟁사를 고르세요" : "대상 특허를 고르세요"}
                    </Button>
                  </form>
                </div>
              )}

              {/* ② 후보 고르기 */}
              {view3 === "후보" && searchMeta && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="font-[family-name:var(--font-display)] text-[26px] font-extrabold leading-tight">
                        후보 {docs.length}건 중 <span style={{ color: "var(--crimson)" }}>{selected.size}건</span> 선택
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--ink-mute)" }}>
                        비교표에 넣을 문헌을 체크하세요 (최대 6건)
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => setSub3("설정")}>
                      ← 조사 설정
                    </Button>
                  </div>
                  <Fold summary={`검색 경로 · ${searchMeta.path.map((p) => `${p.count.toLocaleString()}건`).join(" → ")}`}>
                    <p className="mb-3 font-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>
                      국내 · 초록·대표 청구항 기준 1차 검토{searchLog && ` · ${new Date(searchLog.searchedAt).toLocaleString("ko-KR")}`}
                    </p>
                    <SearchPath path={searchMeta.path} selectedCount={selected.size} />
                  </Fold>
                  <ol className="space-y-2.5">
                    {docs.map((d, i) => (
                      <DocCard
                        key={d.id}
                        doc={d}
                        rank={i + 1}
                        selected={selected.has(d.id)}
                        excluded={excluded[d.id]}
                        askReason={askReason.has(d.id)}
                        onToggle={() => toggleDoc(d)}
                        onReason={(r) => excludeDoc(d, r)}
                      />
                    ))}
                  </ol>
                  {(searchMeta.nearMiss.items.length > 0 || searchMeta.outOfScope.count > 0) && (
                    <Fold summary={`아깝게 탈락한 문헌 ${searchMeta.nearMiss.items.length}건${searchMeta.outOfScope.count > 0 ? ` · 범위 밖 ${searchMeta.outOfScope.count}건` : ""}`}>
                      <NearMissPanel meta={searchMeta} onAdd={addNearMiss} />
                    </Fold>
                  )}
                  <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 border bg-white px-4 py-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,.35)]" style={{ borderColor: "var(--crimson)" }}>
                    <span className="text-[13px] font-bold">선택한 문헌 {selected.size}건</span>
                    <Button arrow onClick={doCompare} loading={busy === "compare"} disabled={selected.size === 0}>
                      비교표 만들기
                    </Button>
                  </div>
                </div>
              )}

              {/* ③ 비교 결과 */}
              {view3 === "결과" && rows.length > 0 && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="font-[family-name:var(--font-display)] text-[26px] font-extrabold leading-tight">
                        문헌 {matrix?.docs.length ?? selected.size}건 · 구성 {rows.length}개 비교
                      </div>
                      <div className="text-[12px]" style={{ color: "var(--ink-mute)" }}>
                        ‘있음’은 원문 인용이 확인된 칸만 표시합니다. 칸을 누르면 근거가 보입니다.
                      </div>
                    </div>
                    <Button variant="ghost" onClick={() => setSub3("후보")}>
                      ← 후보 다시 고르기
                    </Button>
                  </div>
                  {matrix && <MatrixView m={matrix} />}
                  <Fold summary={`구성별 요약 · 담당자 확인 ${rows.length - unconfirmed}/${rows.length}${changed.size > 0 ? ` · 판단 바뀐 구성 ${changed.size}개` : ""}`}>
                    <CompareTable rows={rows} confirmed={confirmed} changed={changed} onToggle={toggleConfirm} />
                  </Fold>
                  {isInvalidity ? (
                    <div className="flex flex-wrap items-center gap-2 border p-4" style={{ borderColor: "var(--rule)", background: "#fcfbfa" }}>
                      <span className="mr-2 text-[13px] font-bold">무효자료 조사는 우리 발명 검토(4~6단계)와 따로 보고서로 정리합니다.</span>
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
                    <>
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
                      <div className="flex justify-end">
                        <Button arrow onClick={() => go(4)}>
                          다음: 특허성·사업성 검토
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* STEP 4 */}
          {step === 4 && intake && (
            <Card>
              <StepTitle n={4} title="특허성·사업성 검토" sub="특허가 될지, 사업에 중요한지, 경쟁사가 따라 할 수 있는지를 봅니다." />
              {!review ? (
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
                <div className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <MetricCard label="다른 점 후보" sub="선행 문헌과 구별되는 지점">
                      <span className="font-[family-name:var(--font-display)] text-[34px] font-black leading-none" style={{ color: "var(--crimson)" }}>
                        {review.differences.length}
                      </span>
                      <span className="ml-1 text-[13px] font-bold">건</span>
                    </MetricCard>
                    <MetricCard label="사업 중요도" sub={review.businessReason}>
                      <LevelMeter level={review.businessImportance} />
                    </MetricCard>
                    <MetricCard label="경쟁사 모방 가능성" sub={review.imitationReason}>
                      <LevelMeter level={review.imitationRisk} />
                    </MetricCard>
                  </div>
                  {review.strength && <StrengthCard strength={review.strength} matrix={matrix} />}

                  <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    <article className="ws-sheet space-y-5 p-6 sm:p-8">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: "#e6e5e1" }}>
                        <div>
                          <div className="font-mono text-[10.5px] tracking-widest" style={{ color: "var(--ink-mute)" }}>
                            {caseNo ?? "CASE"} · 사내 출원 검토서
                          </div>
                          <div className="text-[17px] font-extrabold">{intake.title}</div>
                        </div>
                        <Tag>AI 초안</Tag>
                      </div>
                      <DocSection n="01" title="요약">
                        <p>{review.summary}</p>
                      </DocSection>
                      <DocSection n="02" title="특허성 의견">
                        <p>{review.patentability}</p>
                      </DocSection>
                      {review.differences.length > 0 && (
                        <DocSection n="03" title="선행 문헌과 다른 점 후보">
                          <ol className="space-y-1.5">
                            {review.differences.map((d, i) => (
                              <li key={d} className="flex gap-2.5">
                                <span className="font-mono text-[12px] font-bold" style={{ color: "var(--crimson)" }}>
                                  {i + 1}
                                </span>
                                <div className="min-w-0">
                                  <span>{d}</span>
                                  {review.differenceBasis?.[i] && <EvidenceLine ev={componentEvidence(matrix, review.differenceBasis[i])} />}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </DocSection>
                      )}
                      {review.openIssues.length > 0 && (
                        <DocSection n="04" title="변리사 전달 전 남은 쟁점">
                          <ul className="space-y-1">
                            {review.openIssues.map((x) => (
                              <li key={x}>- {x}</li>
                            ))}
                          </ul>
                        </DocSection>
                      )}
                    </article>

                    <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
                      <div className="p-5 text-white" style={{ background: "var(--crimson)" }}>
                        <div className="text-[11px] font-bold opacity-80">AI 추천 출원 방식</div>
                        <div className="mt-1 font-[family-name:var(--font-display)] text-[30px] font-black leading-tight">{review.recommendation}</div>
                        <p className="mt-2 text-[12.5px] leading-relaxed opacity-90">{review.reason}</p>
                      </div>
                      <Fold summary="이 추천에 쓴 사실">
                        <BasisList title="" facts={recommendationBasis(intake, review, matrix, scope)} />
                      </Fold>
                      <p className="text-[11.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
                        AI 추천은 참고입니다. 최종 출원 방식은 6단계에서 담당자가 정하고 승인자가 확정합니다.
                      </p>
                      <div className="flex flex-col gap-2">
                        <Button arrow onClick={() => go(5)}>
                          권리범위 설계로
                        </Button>
                        <Button variant="ghost" onClick={doReview} loading={busy === "review"}>
                          초안 다시 만들기
                        </Button>
                      </div>
                    </aside>
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
                <EmptyAction
                  title={`구성 ${intake.components.length}개를 권리범위 관점에서 나눕니다.`}
                  items={[
                    "① 경쟁사라면 이 권리를 어떻게 피할지 구성마다 시도",
                    "② 바꿔도 같은 효과가 나면 대체 가능, 아무 시도도 안 통하면 핵심",
                    "③ 구성마다 권리에 담는 방법 (독립항 중심 · 상위 개념 · 종속항)",
                    "변리사와 논의할 권리범위 방향",
                  ]}
                >
                  <Button arrow onClick={doScope} loading={busy === "scope"}>
                    권리범위 설계안 만들기
                  </Button>
                </EmptyAction>
              ) : (
                <div className="space-y-6">
                  <div className="border-l-4 bg-white p-5" style={{ borderColor: "var(--crimson)" }}>
                    <div className="mb-1 flex items-center gap-2 text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
                      권리범위 방향 <Tag>경쟁사 회피 시도를 바탕으로 한 AI 제안</Tag>
                    </div>
                    <p className="text-[15px] font-bold leading-relaxed">{scope.strategy}</p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[12px] font-bold">
                    {ROLES.map((r) => (
                      <span key={r} className="border px-2.5 py-1" style={{ borderColor: "var(--rule)" }}>
                        {r} {scope.items.filter((i) => i.role === r).length}
                      </span>
                    ))}
                  </div>

                  {(() => {
                    const conflict = strengthConflict(scope.items, review.strength?.designAround);
                    if (!conflict || !review.strength) return null;
                    return (
                      <div className="border p-4 text-[13px]" style={{ borderColor: "var(--crimson)", background: "#faf3f3" }}>
                        <b style={{ color: "var(--crimson)" }}>4단계 판단과 다릅니다.</b> 권리의 강도에서는 우회 어려움을 ‘{review.strength.designAround.level}’으로 봤지만, 경쟁사 관점에서 시도해 보니 ‘
                        {conflict.item.componentName}’은(는) {conflict.item.role}입니다. {conflict.item.reason}
                        <div className="mt-2">
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

                  <ol className="space-y-3">
                    {scope.items.map((it) => (
                      <ScopeItemCard key={it.componentName} it={it} onRole={(r) => setRole(it.componentName, r)} />
                    ))}
                  </ol>

                  <div className="flex flex-wrap items-center gap-3 border-t pt-5" style={{ borderColor: "var(--hairline)" }}>
                    <Button arrow onClick={() => go(6)}>
                      출원 결정·전달로
                    </Button>
                    <span className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
                      구분은 담당자가 바꿀 수 있고, 바꾼 내용은 변리사 전달자료에 그대로 들어갑니다.
                    </span>
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
                              style={on ? { borderColor: "var(--crimson)", boxShadow: "inset 0 0 0 1px var(--crimson), 0 14px 24px -18px rgba(110,11,20,.6)" } : { borderColor: "var(--rule)" }}
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
                                  <td className="border-b px-2 py-2 font-bold" style={{ borderColor: "#eceae6" }}>{r.componentName}</td>
                                  <td className="border-b px-2 py-2" style={{ borderColor: "#eceae6" }}>
                                    <span className="px-1.5 py-0.5 text-[11px] font-bold" style={r.role === "핵심" ? { background: "var(--crimson)", color: "#fff" } : { background: "#efe2e2", color: "var(--crimson)" }}>
                                      {r.role}
                                    </span>
                                  </td>
                                  <td className="border-b px-2 py-2" style={{ borderColor: "#eceae6", color: "var(--ink-soft)" }}>{r.evidence}</td>
                                  <td className="border-b px-2 py-2" style={{ borderColor: "#eceae6" }}>{r.advice}</td>
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
                        <ul className="mt-3 space-y-2 border-l-2 pl-3" style={{ borderColor: "#e6e5e1" }}>
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
                              — 경쟁사 회피 시도: {i.attempts?.length ? i.attempts.map((a) => `${a.method}(${a.keepsEffect})`).join(", ") : i.alternatives} (우회 {i.designAround})
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

        {/* SIDEBAR */}
        <aside className={`no-print space-y-4 lg:sticky lg:top-24 lg:self-start ${step === 3 ? "" : "hidden"}`}>
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
