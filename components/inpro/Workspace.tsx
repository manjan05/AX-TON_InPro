"use client";
import { useState } from "react";
import {
  DECISIONS,
  DEV_STAGES,
  type ComparisonRow,
  type Decision,
  type DevStage,
  type Disclosure,
  type IntakeResult,
  type Level,
  type PriorDoc,
  type ReviewDraft,
  type ScopeResult,
  type ScopeRole,
} from "@/lib/inpro/types";
import { changedComponents } from "@/lib/inpro/evidence";
import { buildHandoffMarkdown, openQuestions, type CaseEvent, type SurveyRecord } from "@/lib/inpro/package";
import { DISCLOSURE_TYPES, disclosureStatus } from "@/lib/inpro/disclosure";
import { Button, Card, CompareTable, InProLogo, StepTitle, Tag } from "./ui";
import { FunnelPanel } from "./FunnelPanel";

// 팀장 인터뷰 질문 2의 실제 발명 검토 흐름을 따른다
const STEPS = ["발명 접수", "기술 이해·보완", "선행기술 조사", "특허성·사업성", "권리범위 설계", "출원 결정·전달"];

const SAMPLE = `배터리 팩 냉각 장치를 개발했습니다.
기존에는 냉각수 채널이 직선형이라 셀 사이 온도 편차가 컸습니다.
새 구조는 냉각 채널을 지그재그 형태로 바꾸고, 셀마다 붙인 온도 센서 값에 따라 펌프 유량을 조절합니다.
온도가 높은 구간에서는 유량을 늘리고, 낮은 구간에서는 줄여 펌프 전력을 아낍니다.
실험 메모: 시제품에서 셀 간 최대 온도 차가 줄어든 것을 확인함. 도면 2장 첨부 예정.`;

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
const levelTone = (l: Level) => (l === "높음" ? "orange" : l === "보통" ? "blue" : "gray");

export function Workspace() {
  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<CaseEvent[]>([]);

  // 1. 발명 접수
  const [description, setDescription] = useState("");
  const [discDate, setDiscDate] = useState("");
  const [discType, setDiscType] = useState(DISCLOSURE_TYPES[0]);
  const [intake, setIntake] = useState<IntakeResult | null>(null);
  // 2. 기술 이해·보완
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  // 3. 선행기술 조사
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [docs, setDocs] = useState<PriorDoc[]>([]);
  const [searchLog, setSearchLog] = useState<SearchLog | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<{ usage?: string; facet?: string } | null>(null);
  const [rows, setRows] = useState<ComparisonRow[]>([]);
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
    const result = await run("intake", () => post<IntakeResult>("/api/inpro/intake", { description }));
    if (!result) return;
    setIntake(result);
    setKeywords(result.keywords);
    setQuestions(result.questions);
    setAnswers(result.questions.map(() => ""));
    setDocs([]);
    setRows([]);
    setConfirmed(new Set());
    setChanged(new Set());
    setSurveys([]);
    invalidateDownstream();
    log("연구원", "발명 자료 제출");
    log("InPro AI", `구성 ${result.components.length}개 추출, 빠진 항목 ${result.missing.length}개 표시`);
    if (disclosure) log("InPro AI", `공개 예정(${disclosure.type}, ${disclosure.date}) 등록 — 출원 기한 추적 시작`);
  }

  async function compareWith(components: IntakeResult["components"], docIds: string[]) {
    return post<{ rows: ComparisonRow[] }>("/api/inpro/compare", { components, docIds });
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
      setChanged(diff);
      setConfirmed((c) => new Set([...c].filter((n) => !diff.has(n) && result.cmp!.rows.some((r) => r.componentName === n))));
      invalidateDownstream();
      log("InPro AI", `비교표 갱신, 판단 바뀐 구성 ${diff.size}개 재승인 필요`);
      go(3);
    } else {
      log("InPro AI", `기술 구성 갱신 (${result.next.components.length}개)`);
      go(3);
    }
  }

  // STEP 3
  async function doSearch() {
    const result = await run("search", () =>
      post<{ docs: PriorDoc[]; log: SearchLog }>("/api/inpro/search", { keywords, ...searchScope })
    );
    if (!result) return;
    setDocs(result.docs);
    setSearchLog(result.log);
    setSelected(new Set(result.docs.slice(0, 4).map((d) => d.id)));
    log("담당자", `조사 범위 확정: 키워드 ${keywords.length}개`);
    log("InPro AI", `선행조사 실행, 후보 ${result.docs.length}건`);
  }

  async function doCompare() {
    if (!intake) return;
    const result = await run("compare", () => compareWith(intake.components, Array.from(selected)));
    if (!result) return;
    setRows(result.rows);
    setConfirmed(new Set());
    setChanged(new Set());
    invalidateDownstream();
    if (surveys.length === 0) setSurveys([{ stage, at: new Date().toISOString(), changedCount: 0, note: "최초 조사" }]);
    const weak = result.rows.filter((r) => r.relation === "근거 부족").length;
    log("담당자", `문헌 ${selected.size}건 선택`);
    log("InPro AI", `비교표 생성, 근거 부족 ${weak}건 표시`);
  }

  // STEP 4
  const reviewContext = [
    `현재 개발 단계: ${stage}`,
    disclosure && disc ? `공개 예정: ${disclosure.type} ${disclosure.date} (${disc.days}일 남음)` : "",
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
  function approve() {
    setApprovedAt(new Date().toISOString());
    log("담당자", `결정: ${decision}`);
    log("승인자", `${approver} 승인`);
  }

  // 개발 단계별 재조사 (질문 8): 바뀐 설계로 다시 정리·조사·비교하고, 판단이 바뀐 구성만 재승인
  async function doResurvey() {
    const newDesc = changeNote.trim() ? `${description}\n[${nextStage}] ${changeNote.trim()}` : description;
    const result = await run("resurvey", async () => {
      const next = await post<IntakeResult>("/api/inpro/intake", { description: newDesc, answers: answersText });
      const kws = Array.from(new Set([...keywords, ...next.keywords]));
      const found = await post<{ docs: PriorDoc[]; log: SearchLog }>("/api/inpro/search", { keywords: kws, ...searchScope });
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
    setSearchLog(result.found.log);
    setSelected(new Set(result.ids));
    setRows(result.cmp.rows);
    setChanged(diff);
    setConfirmed((c) => new Set([...c].filter((n) => !diff.has(n) && result.cmp.rows.some((r) => r.componentName === n))));
    invalidateDownstream();
    setSurveys((s) => [...s, { stage: nextStage, at: new Date().toISOString(), changedCount: diff.size, note: changeNote.trim() }]);
    setStage(nextStage);
    const idx = DEV_STAGES.indexOf(nextStage);
    setNextStage(DEV_STAGES[Math.min(idx + 1, DEV_STAGES.length - 1)]);
    setChangeNote("");
    log("담당자", `개발 단계 전환: ${nextStage}`);
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
      ? { description, intake, qa, rows, review, scope, decision, decisionMemo, approver, approvedAt, searchLog, disclosure, surveys }
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
                CASE · {intake ? intake.field : "새 발명 사건"}
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

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {error && (
            <div className="no-print border px-4 py-3 text-sm font-bold" style={{ borderColor: "#d9b8bb", background: "#efe2e2", color: "var(--crimson)" }}>
              {error}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <Card>
              <StepTitle n={1} title="발명 접수" sub="연구원이 쓴 메모를 그대로 붙여넣으면 InPro가 기술 구성을 뽑고 빠진 항목을 표시합니다." />
              <div className="ws-sheet">
                <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: "var(--hairline)" }}>
                  <span className="font-mono text-[10.5px] font-bold tracking-widest" style={{ color: "var(--ink-soft)" }}>
                    연구원 메모 · 자유 형식
                  </span>
                  <span className="font-mono text-[10.5px]" style={{ color: "var(--ink-mute)" }}>
                    {description.length}자{description.trim().length < 20 ? " · 20자 이상" : ""}
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  placeholder={"발명 내용, 해결하려는 문제, 기존 방식과의 차이, 적용 제품, 실험 메모를\n평소 쓰던 말 그대로 적어주세요. 정리는 InPro가 합니다."}
                  className="block w-full resize-y px-4 py-1 text-[14px] outline-none"
                />
              </div>
              <div className="mt-3 border p-3" style={{ borderColor: "var(--hairline)" }}>
                <div className="mb-2 text-[13px] font-extrabold">
                  외부 공개 예정 <span className="font-normal" style={{ color: "var(--ink-soft)" }}>— 논문·전시·제안 전에는 출원 여부를 먼저 정해야 합니다</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select value={discType} onChange={(e) => setDiscType(e.target.value)} className={inputCls} style={{ borderColor: "var(--hairline)", background: "#fff" }} aria-label="공개 유형">
                    {DISCLOSURE_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <input type="date" value={discDate} onChange={(e) => setDiscDate(e.target.value)} className={inputCls} style={{ borderColor: "var(--hairline)", background: "#fff" }} aria-label="공개 예정일" />
                  {discDate && <Button variant="ghost" onClick={() => setDiscDate("")}>공개 예정 없음</Button>}
                </div>
                {disc && (
                  <p className="mt-2 text-[12.5px] font-bold" style={{ color: disc.level === "여유" ? "var(--ink-soft)" : "var(--crimson)" }}>
                    {disc.message}
                  </p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button arrow onClick={doIntake} loading={busy === "intake"} disabled={description.trim().length < 20}>AI로 정리하기</Button>
                <Button variant="ghost" onClick={() => setDescription(SAMPLE)}>예시 불러오기 (배터리 냉각)</Button>
              </div>

              {!intake && (
                <div className="mt-8 border-t pt-6" style={{ borderColor: "var(--hairline)" }}>
                  <div className="mb-3 font-mono text-[11px] font-bold tracking-widest" style={{ color: "var(--ink-mute)" }}>
                    정리하면 이렇게 나옵니다
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["기술 구성 초안", "C1 · C2 · C3", "발명을 이루는 핵심 구성을 3~5개로 나눕니다."],
                      ["빠진 항목", "실험 수치 · 도면", "출원 검토에 필요한데 메모에 없는 정보를 짚습니다."],
                      ["공개 전 출원 알림", "D-day", "공개 예정일을 넣으면 출원 기한을 계속 알려줍니다."],
                    ].map(([t, big, d], i) => (
                      <div key={t} className="lp-frame p-4">
                        <div className="bg-white p-4 shadow-[0_18px_28px_-22px_rgba(0,0,0,.5)]">
                          <div className="text-[11px] font-bold" style={{ color: "var(--ink-soft)" }}>{t}</div>
                          <div
                            className="mt-1 font-[family-name:var(--font-display)] text-[22px] font-extrabold leading-tight"
                            style={{ color: i === 1 ? "var(--crimson)" : "var(--ink)" }}
                          >
                            {big}
                          </div>
                          <p className="mt-2 text-[12px] leading-snug" style={{ color: "var(--ink-soft)" }}>{d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {intake && (
                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-sm font-extrabold">기술 구성 초안 <Tag>AI 제안</Tag></h3>
                    <p className="mb-3 text-[13px]" style={{ color: "var(--ink-soft)" }}>{intake.field} · {intake.problem}</p>
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
                    <h3 className="mb-2 text-sm font-extrabold">빠진 항목 <Tag tone="orange">{intake.missing.length}개</Tag></h3>
                    <ul className="space-y-2">
                      {intake.missing.map((m) => (
                        <li key={m.item} className="p-3 text-[13px]" style={{ background: "#efe2e2" }}>
                          <b style={{ color: "var(--crimson)" }}>{m.item}</b>
                          <div style={{ color: "var(--ink-soft)" }}>{m.why}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:col-span-2">
                    <Button onClick={() => go(2)}>다음: 발명자 인터뷰 →</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 2 */}
          {step === 2 && intake && (
            <Card>
              <StepTitle n={2} title="기술 이해·보완" sub="조사 전에 발명자에게 핵심과 변형 가능성을 확인합니다. 조사 중 새 선행기술이 나오면 여기로 돌아와 다시 묻습니다." />
              <ol className="mb-4 space-y-3">
                {questions.map((q, i) => (
                  <li key={q}>
                    <div className="mb-1 text-[13.5px] font-bold">Q{i + 1}. {q}</div>
                    <textarea
                      rows={2}
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))}
                      placeholder="연구원 답변"
                      className={`w-full p-2.5 text-[13px] ${inputCls}`}
                      style={{ borderColor: "var(--hairline)", background: "#fff" }}
                    />
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button onClick={doRefine} loading={busy === "refine"} disabled={!answersText}>
                  {rows.length ? "답변 반영해 비교표 다시 만들기" : "답변 반영하고 조사로 →"}
                </Button>
                <Button variant="ghost" onClick={() => go(3)}>답변 없이 조사로 →</Button>
              </div>
            </Card>
          )}

          {/* STEP 3 */}
          {step === 3 && intake && (
            <Card>
              <StepTitle n={3} title="선행기술 조사" sub="검색어를 확정하고, 비교할 문헌을 고르면 구성 요소별로 원문과 대조합니다. 원문에서 확인되지 않은 판단은 '근거 부족'으로 낮춥니다." />
              <FunnelPanel scope={searchScope} onScope={setSearchScope} />
              <div className="mb-3 flex flex-wrap gap-2">
                {keywords.map((k) => (
                  <span key={k} className="inline-flex items-center gap-1 px-3 py-1 text-[13px] font-bold" style={{ background: "var(--crimson-soft)", color: "var(--crimson)" }}>
                    {k}
                    <button type="button" aria-label={`${k} 삭제`} onClick={() => setKeywords((ks) => ks.filter((x) => x !== k))} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                  </span>
                ))}
              </div>
              <form
                className="mb-4 flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const k = newKeyword.trim();
                  if (k && !keywords.includes(k)) setKeywords((ks) => [...ks, k]);
                  setNewKeyword("");
                }}
              >
                <input value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} placeholder="키워드 추가" className={`w-44 ${inputCls}`} style={{ borderColor: "var(--hairline)", background: "#fff" }} />
                <Button variant="ghost">추가</Button>
                <Button onClick={doSearch} loading={busy === "search"} disabled={keywords.length === 0}>선행조사 실행</Button>
              </form>
              <p className="mb-3 font-mono text-[11px]" style={{ color: "var(--ink-soft)" }}>
                국내 · 초록·대표 청구항 기준 1차 검토
                {searchLog && ` · ${new Date(searchLog.searchedAt).toLocaleString("ko-KR")} · ${searchLog.corpus} · 후보 ${searchLog.hits}건`}
              </p>

              {docs.length > 0 && (
                <>
                  <ul className="mb-4 space-y-2">
                    {docs.map((d) => (
                      <li key={d.id} className="border p-3" style={{ borderColor: selected.has(d.id) ? "var(--crimson)" : "var(--hairline)", background: "#fff" }}>
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 accent-[#6e0b14]"
                            checked={selected.has(d.id)}
                            onChange={() =>
                              setSelected((s) => {
                                const n = new Set(s);
                                if (n.has(d.id)) n.delete(d.id);
                                else if (n.size < 6) n.add(d.id);
                                return n;
                              })
                            }
                            aria-label={`${d.title} 선택`}
                          />
                          <div className="min-w-0 flex-1">
                            <button type="button" className="text-left text-[13.5px] font-bold hover:underline" onClick={() => setOpenDoc(openDoc === d.id ? null : d.id)}>{d.title}</button>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px]" style={{ color: "var(--ink-soft)" }}>
                              <span>{d.applicant}</span>·<span>{d.registrationDate}</span>·<span className="font-mono">#{d.id}</span>
                              {d.matchedKeywords.map((k) => <Tag key={k} tone="gray">{k}</Tag>)}
                            </div>
                            {openDoc === d.id && <p className="mt-2 text-[12.5px] leading-relaxed">{d.abstract}</p>}
                          </div>
                          <span className="font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>{d.score}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <Button onClick={doCompare} loading={busy === "compare"} disabled={selected.size === 0}>
                    선택한 문헌 {selected.size}건으로 비교표 만들기
                  </Button>
                </>
              )}

              {rows.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-2 text-sm font-extrabold">
                    구성 요소별 비교표 <Tag>AI 제안</Tag> {changed.size > 0 && <Tag tone="orange">판단 바뀐 구성 {changed.size}개</Tag>}
                  </h3>
                  <CompareTable rows={rows} confirmed={confirmed} changed={changed} onToggle={toggleConfirm} />
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => go(4)}>다음: 특허성·사업성 검토 →</Button>
                    <Button variant="ghost" onClick={() => go(2)}>새 선행기술 관련해 발명자에게 다시 묻기</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 4 */}
          {step === 4 && intake && (
            <Card>
              <StepTitle n={4} title="특허성·사업성 검토" sub="신규성·진보성 후보와 함께, 사업 중요도와 경쟁사가 모방할 가능성을 같이 봅니다." />
              {!review ? (
                <Button onClick={doReview} loading={busy === "review"}>검토서 초안 만들기</Button>
              ) : (
                <div className="space-y-4">
                  <div className="border p-4" style={{ borderColor: "var(--hairline)", background: "#fff" }}>
                    <div className="mb-2 flex items-center gap-2"><h3 className="text-sm font-extrabold">사내 검토서 초안</h3><Tag>AI 제안</Tag></div>
                    <p className="mb-3 text-[13.5px] leading-relaxed">{review.summary}</p>
                    <p className="mb-3 text-[13px]"><b>특허성:</b> {review.patentability}</p>
                    {review.differences.length > 0 && (
                      <ul className="mb-1 list-disc space-y-0.5 pl-5 text-[13px]">
                        {review.differences.map((d) => <li key={d}>{d}</li>)}
                      </ul>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="border p-4" style={{ borderColor: "var(--hairline)", background: "#fff" }}>
                      <div className="mb-1 flex items-center gap-2 text-[13px] font-extrabold">사업 중요도 <Tag tone={levelTone(review.businessImportance)}>{review.businessImportance}</Tag></div>
                      <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{review.businessReason}</p>
                    </div>
                    <div className="border p-4" style={{ borderColor: "var(--hairline)", background: "#fff" }}>
                      <div className="mb-1 flex items-center gap-2 text-[13px] font-extrabold">경쟁사 모방 가능성 <Tag tone={levelTone(review.imitationRisk)}>{review.imitationRisk}</Tag></div>
                      <p className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{review.imitationReason}</p>
                    </div>
                  </div>
                  <p className="text-[13px]"><b>AI 추천:</b> {review.recommendation} — <span style={{ color: "var(--ink-soft)" }}>{review.reason}</span></p>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => go(5)}>다음: 권리범위 설계 →</Button>
                    <Button variant="ghost" onClick={doReview} loading={busy === "review"}>다시 만들기</Button>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 5 */}
          {step === 5 && intake && review && (
            <Card>
              <StepTitle n={5} title="권리범위 설계" sub="“무엇을 출원할까”보다 “경쟁사가 우회하기 어려운 권리”를 고민하는 단계입니다. 청구항은 변리사가 쓰고, 여기서는 지켜야 할 핵심을 정합니다." />
              {!scope ? (
                <Button onClick={doScope} loading={busy === "scope"}>권리범위 설계안 만들기</Button>
              ) : (
                <div className="space-y-4">
                  <blockquote className="border-l-2 pl-3 text-[13.5px] leading-relaxed" style={{ borderColor: "var(--crimson)" }}>
                    {scope.strategy} <Tag>AI 제안</Tag>
                  </blockquote>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                      <thead>
                        <tr className="border-b" style={{ color: "var(--ink-soft)", borderColor: "var(--hairline)" }}>
                          <th className="py-2 pr-3">구성</th>
                          <th className="py-2 pr-3">구분 (담당자 조정)</th>
                          <th className="w-[34%] py-2 pr-3">경쟁사 대체 수단</th>
                          <th className="py-2">우회 난이도</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scope.items.map((it) => (
                          <tr key={it.componentName} className="border-b align-top" style={{ borderColor: "var(--hairline)" }}>
                            <td className="py-3 pr-3">
                              <b>{it.componentName}</b>
                              <div className="mt-0.5 text-[12px]" style={{ color: "var(--ink-soft)" }}>{it.reason}</div>
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex gap-1">
                                {ROLES.map((r) => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() => setRole(it.componentName, r)}
                                    className="border px-2 py-1 text-[11.5px] font-bold"
                                    style={it.role === r ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)" } : { borderColor: "var(--hairline)", background: "#fff" }}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 pr-3 text-[12.5px]">{it.alternatives}</td>
                            <td className="py-3"><Tag tone={it.designAround === "어려움" ? "green" : it.designAround === "쉬움" ? "orange" : "gray"}>{it.designAround}</Tag></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                    우회가 쉬운 구성을 그대로 권리로 잡으면 경쟁사가 다른 수단으로 피해 갑니다. 핵심 구성은 대체 수단까지 포괄하도록 변리사와 논의하세요.
                  </p>
                  <Button onClick={() => go(6)}>다음: 출원 결정·전달 →</Button>
                </div>
              )}
            </Card>
          )}

          {/* STEP 6 */}
          {step === 6 && intake && review && (
            <Card className="print-area">
              <div className="no-print">
                <StepTitle n={6} title="출원 결정·변리사 전달" sub="담당자가 출원 방식을 정하고 승인자가 확정하면, 승인된 버전만 묶어 변리사에게 넘깁니다." />
                {!approvedAt && (
                  <div className="space-y-4">
                    <div>
                      <div className="mb-1.5 text-[13px] font-extrabold">출원 여부·국가 결정 <span className="font-normal" style={{ color: "var(--ink-soft)" }}>(AI 추천: {review.recommendation})</span></div>
                      <div className="flex flex-wrap gap-1.5">
                        {DECISIONS.map((r) => (
                          <button key={r} type="button" onClick={() => setDecision(r)} className="border px-3 py-1.5 text-[12.5px] font-bold" style={decision === r ? { background: "var(--crimson)", color: "#fff", borderColor: "var(--crimson)" } : { borderColor: "var(--hairline)", background: "#fff" }}>
                            {r}
                          </button>
                        ))}
                      </div>
                      <textarea rows={2} value={decisionMemo} onChange={(e) => setDecisionMemo(e.target.value)} placeholder="결정 메모 (예: 해외는 미국만, 제어 로직은 영업비밀로)" className={`mt-2 w-full p-2.5 text-[13px] ${inputCls}`} style={{ borderColor: "var(--hairline)", background: "#fff" }} />
                    </div>
                    {disc && disc.level !== "여유" && (
                      <p className="text-[12.5px] font-bold" style={{ color: "var(--crimson)" }}>{disc.message}</p>
                    )}
                    <div>
                      <div className="mb-2 text-[13px] font-extrabold">비교표 담당자 확인 ({rows.length - unconfirmed}/{rows.length})</div>
                      <CompareTable rows={rows} confirmed={confirmed} changed={changed} onToggle={toggleConfirm} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "var(--hairline)" }}>
                      <input value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="승인자 (예: 연구소장)" className={inputCls} style={{ borderColor: "var(--hairline)", background: "#fff" }} />
                      <Button onClick={approve} disabled={!approver.trim() || unconfirmed > 0}>승인</Button>
                      {unconfirmed > 0 && <span className="text-[12.5px] font-bold" style={{ color: "var(--crimson)" }}>담당자 확인이 안 된 비교 줄 {unconfirmed}개</span>}
                    </div>
                  </div>
                )}
                {handoff && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Button onClick={() => window.print()}>인쇄 · PDF 저장</Button>
                    <Button variant="ghost" onClick={downloadMarkdown}>Markdown 내려받기</Button>
                  </div>
                )}
              </div>

              {handoff && (
                <article id="inpro-handoff" className="space-y-5 border-t pt-5 text-[13.5px] leading-relaxed" style={{ borderColor: "var(--hairline)" }}>
                  <header>
                    <div className="font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>InPro · 변리사 전달자료</div>
                    <h2 className="font-[family-name:var(--font-display)] text-2xl font-extrabold">{handoff.intake.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
                      <span>{handoff.intake.field}</span>·<span>결정: <b style={{ color: "var(--ink)" }}>{handoff.decision}</b></span>·
                      <span>승인: {handoff.approver} ({new Date(handoff.approvedAt).toLocaleString("ko-KR")})</span>·<span>개발 단계: {stage}</span>
                    </div>
                    {handoff.decisionMemo && <p className="mt-1"><b>결정 메모:</b> {handoff.decisionMemo}</p>}
                    {disclosure && disc && <p className="mt-1 font-bold" style={{ color: "var(--crimson)" }}>공개 예정 {disclosure.date} {disclosure.type} — {disc.message}</p>}
                  </header>
                  <section>
                    <h3 className="mb-1 font-extrabold">1. 발명 설명 <Tag tone="green">연구원 확인</Tag></h3>
                    <p className="whitespace-pre-line">{handoff.description}</p>
                    {qa.some((q) => q.answer.trim()) && (
                      <ul className="mt-2 space-y-1">
                        {qa.filter((q) => q.answer.trim()).map((q) => (
                          <li key={q.question}><b>Q.</b> {q.question}<br /><b>A.</b> {q.answer}</li>
                        ))}
                      </ul>
                    )}
                  </section>
                  <section>
                    <h3 className="mb-1 font-extrabold">2. 해결 문제와 구성 요소 <Tag>AI 제안</Tag></h3>
                    <p className="mb-1">{handoff.intake.problem}</p>
                    <ul className="list-disc pl-5">{handoff.intake.components.map((c) => <li key={c.id}><b>{c.name}</b>: {c.description}</li>)}</ul>
                  </section>
                  <section>
                    <h3 className="mb-1 font-extrabold">3. 선행 문헌 비교표 <Tag>AI 제안 · 원문 인용 확인</Tag></h3>
                    <CompareTable rows={handoff.rows} />
                  </section>
                  <section>
                    <h3 className="mb-1 font-extrabold">4. 특허성·사업성 검토 <Tag>AI 초안 → 담당자 확정</Tag></h3>
                    <p>{handoff.review.summary}</p>
                    <p className="mt-1">특허성: {handoff.review.patentability}</p>
                    <p>사업 중요도 {handoff.review.businessImportance} · 경쟁사 모방 가능성 {handoff.review.imitationRisk}</p>
                  </section>
                  {handoff.scope && (
                    <section>
                      <h3 className="mb-1 font-extrabold">5. 권리범위 설계 방향 <Tag>AI 제안 → 담당자 확정</Tag></h3>
                      <p className="mb-1">{handoff.scope.strategy}</p>
                      <ul className="list-disc pl-5">
                        {handoff.scope.items.map((i) => (
                          <li key={i.componentName}><b>[{i.role}] {i.componentName}</b> — 대체 수단: {i.alternatives} (우회 {i.designAround})</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <section>
                    <h3 className="mb-1 font-extrabold">6. 변리사님께 드리는 질문과 남은 쟁점</h3>
                    <ul className="list-disc pl-5">{openQuestions(handoff).map((q) => <li key={q}>{q}</li>)}</ul>
                  </section>
                  <section className="text-[12px]" style={{ color: "var(--ink-soft)" }}>
                    <h3 className="mb-1 text-[13.5px] font-extrabold" style={{ color: "var(--ink)" }}>7. 조사 기록</h3>
                    {surveys.map((s) => (
                      <p key={s.at}>[{s.stage}] {new Date(s.at).toLocaleString("ko-KR")} · 판단 바뀐 구성 {s.changedCount}개{s.note ? ` · ${s.note}` : ""}</p>
                    ))}
                    {searchLog && <p>최근 조사: {searchLog.corpus} · 키워드 {searchLog.keywords.join(", ")}</p>}
                    <p>신규성·진보성, 침해 여부의 최종 판단은 변리사님께 요청드립니다.</p>
                  </section>
                </article>
              )}
            </Card>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="no-print space-y-4 lg:sticky lg:top-24 lg:self-start">
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
