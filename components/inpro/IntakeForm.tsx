"use client";
import { useRef, useState, type ReactNode } from "react";
import { DEV_STAGES, type DevStage } from "@/lib/inpro/types";
import { DISCLOSURE_TYPES, disclosureStatus } from "@/lib/inpro/disclosure";
import { Button } from "./ui";

// 발명 접수 화면. 연구원이 이미 가진 자료(메모·보고서·PDF)를 그대로 받는다.
// 칸을 나눠 다시 쓰게 하지 않고, 무엇이 빠졌는지는 AI 검토의 출원 체크리스트가 짚는다.
// (IP팀장 인터뷰: 접수 뒤 "기술 이해·발명자 인터뷰"에서 보완, 재작업은 "초기 설명과 실제 설계가 다를 때" 생긴다)
export interface IntakeFormState {
  title: string;
  product: string;
  inventor: string;
  dept: string;
  material: string; // 붙여넣은 글 + 올린 파일에서 뽑은 글
}

export const EMPTY_FORM: IntakeFormState = { title: "", product: "", inventor: "", dept: "", material: "" };

export function composeDescription(f: IntakeFormState): string {
  const head = [
    ["발명 명칭(가칭)", f.title],
    ["적용 제품", f.product],
    ["발명자", [f.inventor, f.dept].filter(Boolean).join(" / ")],
  ]
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `[${k}] ${v.trim()}`);
  return [...head, "", "[연구원 발명 자료]", f.material.trim()].join("\n").trim();
}

// 시연용 예시 발명 (가상). 연구원이 메신저로 보낸 메모 느낌 그대로.
export const EXAMPLE_FORM: IntakeFormState = {
  title: "표면적을 늘린 이중 주름 공기청정기 필터",
  product: "가정용 공기청정기",
  inventor: "박지훈",
  dept: "선행개발팀",
  material: `같은 크기의 필터 프레임 안에서 여과 면적을 늘리기 어렵다. 그래서 필터 교체 주기가 짧고, 풍량을 올리면 압력 손실이 커져 소음과 전력 소비가 늘어난다.

기존 필터는 여과재를 삼각형 주름으로 한 번 접는 방식이다. 주름 간격을 좁히면 면적은 늘지만, 주름끼리 붙어 공기가 지나가지 못하는 구간이 생긴다.

이번 안: 여과재를 삼각형 주름으로 접은 뒤, 각 주름의 빗면에 작은 2차 주름을 한 번 더 넣어 같은 크기의 프레임 안에서 여과 면적을 늘린다. 2차 주름 높이는 1차 주름 높이의 약 1/4로 하고, 주름 끝에는 간격 유지용 돌기를 두어 주름끼리 붙지 않게 한다.

시제품에서 같은 프레임 크기 기준 여과 면적이 약 30% 늘었고, 같은 풍량에서 압력 손실이 줄었다. 정밀 측정 데이터는 정리 중이다.`,
};

export const isSubmittable = (f: IntakeFormState) => f.title.trim().length > 0 && f.material.trim().length >= 20;

const fieldCls =
  "w-full border bg-white px-3 py-2.5 text-[14px] leading-relaxed outline-none transition focus:border-[var(--crimson)] focus:shadow-[0_0_0_3px_rgba(110,11,20,.08)]";

function Label({ n, children, required, hint, htmlFor }: { n?: string; children: ReactNode; required?: boolean; hint?: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
      {n && (
        <span className="font-mono text-[11px] font-bold" style={{ color: "var(--crimson)" }}>
          {n}
        </span>
      )}
      <span className="text-[13px] font-bold">
        {children}
        {required && <span style={{ color: "var(--crimson)" }}> *</span>}
      </span>
      {hint && (
        <span className="text-[12px]" style={{ color: "var(--ink-mute)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function SectionHead({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 mt-8 flex items-center gap-3 first:mt-0">
      <span className="font-[family-name:var(--font-display)] text-[12px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--ink-soft)" }}>
        {children}
      </span>
      <span className="h-px flex-1" style={{ background: "var(--rule)" }} />
    </div>
  );
}

export function IntakeForm({
  form,
  onChange,
  stage,
  onStage,
  discDate,
  discType,
  onDiscDate,
  onDiscType,
  caseNo,
  busy,
  onSubmit,
  submitted,
  onFillExample,
}: {
  form: IntakeFormState;
  onChange: (patch: Partial<IntakeFormState>) => void;
  stage: DevStage;
  onStage: (s: DevStage) => void;
  discDate: string;
  discType: string;
  onDiscDate: (v: string) => void;
  onDiscType: (v: string) => void;
  caseNo: string | null;
  busy: boolean;
  onSubmit: () => void;
  submitted: boolean;
  onFillExample?: () => void;
}) {
  const disc = discDate ? disclosureStatus({ date: discDate, type: discType }) : null;
  const checks: [string, boolean, boolean][] = [
    ["발명 명칭", !!form.title.trim(), true],
    ["발명 자료 (20자 이상)", form.material.trim().length >= 20, true],
    ["적용 제품", !!form.product.trim(), false],
    ["발명자", !!form.inventor.trim(), false],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  const pct = Math.round((done / checks.length) * 100);
  const text = (k: keyof IntakeFormState) => ({
    id: `intake-${k}`,
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ [k]: e.target.value }),
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SectionHead>기본 정보</SectionHead>
          </div>
          {onFillExample && (
            <button
              type="button"
              onClick={onFillExample}
              className="mt-[1px] shrink-0 text-[10.5px] underline underline-offset-2 opacity-40 transition hover:opacity-100"
              style={{ color: "var(--ink-soft)" }}
            >
              예시 채우기
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="intake-title" required>발명 명칭 (가칭)</Label>
            <input {...text("title")} placeholder="예: 표면적을 늘린 이중 주름 공기청정기 필터" className={fieldCls} style={{ borderColor: "var(--rule)" }} />
          </div>
          <div>
            <Label htmlFor="intake-product">적용 제품</Label>
            <input {...text("product")} placeholder="예: 가정용 공기청정기" className={fieldCls} style={{ borderColor: "var(--rule)" }} />
          </div>
          <div>
            <Label htmlFor="intake-stage">개발 단계</Label>
            <select id="intake-stage" value={stage} onChange={(e) => onStage(e.target.value as DevStage)} className={fieldCls} style={{ borderColor: "var(--rule)" }}>
              {DEV_STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="intake-inventor">발명자</Label>
            <input {...text("inventor")} placeholder="이름" className={fieldCls} style={{ borderColor: "var(--rule)" }} />
          </div>
          <div>
            <Label htmlFor="intake-dept">소속</Label>
            <input {...text("dept")} placeholder="예: 선행개발팀" className={fieldCls} style={{ borderColor: "var(--rule)" }} />
          </div>
        </div>

        <SectionHead>발명 자료</SectionHead>
        <MaterialInput value={form.material} onChange={(material) => onChange({ material })} />

        <SectionHead>외부 공개 예정</SectionHead>
        <p className="mb-3 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          논문·전시·고객 제안 전에는 출원 여부를 먼저 정해야 합니다. 해외는 공개 후 출원이 어려운 국가가 많습니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <select value={discType} onChange={(e) => onDiscType(e.target.value)} className={`${fieldCls} !w-auto`} style={{ borderColor: "var(--rule)" }} aria-label="공개 유형">
            {DISCLOSURE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input type="date" value={discDate} onChange={(e) => onDiscDate(e.target.value)} className={`${fieldCls} !w-auto`} style={{ borderColor: "var(--rule)" }} aria-label="공개 예정일" />
          {discDate && (
            <Button variant="ghost" onClick={() => onDiscDate("")}>
              공개 예정 없음
            </Button>
          )}
        </div>
        {disc && (
          <p className="mt-2 text-[12.5px] font-bold" style={{ color: disc.level === "여유" ? "var(--ink-soft)" : "var(--crimson)" }}>
            {disc.message}
          </p>
        )}
      </div>

      {/* 접수 요약 */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="border bg-white" style={{ borderColor: "var(--rule)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "var(--rule)" }}>
            <div className="text-[11px] font-bold" style={{ color: "var(--ink-mute)" }}>
              접수번호
            </div>
            <div className="font-mono text-[14px] font-bold" style={{ color: caseNo ? "var(--ink)" : "var(--ink-mute)" }}>
              {caseNo ?? "접수 시 발번"}
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] font-bold">작성 완성도</span>
              <span className="font-[family-name:var(--font-display)] text-[22px] font-bold" style={{ color: "var(--crimson)" }}>
                {pct}%
              </span>
            </div>
            <div className="mb-4 h-1.5" style={{ background: "#e6e5e1" }}>
              <div className="h-full transition-all duration-300" style={{ width: `${pct}%`, background: "var(--crimson)" }} />
            </div>
            <ul className="space-y-2 text-[12.5px]">
              {checks.map(([label, ok, req]) => (
                <li key={label} className="flex items-center gap-2">
                  <span
                    className="grid h-4 w-4 shrink-0 place-items-center text-[10px] font-bold"
                    style={ok ? { background: "var(--crimson)", color: "#fff" } : { border: "1px solid var(--rule)", color: "transparent" }}
                  >
                    ✓
                  </span>
                  <span style={{ color: ok ? "var(--ink)" : "var(--ink-soft)" }}>
                    {label}
                    {req && <span style={{ color: "var(--crimson)" }}> *</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t px-4 py-4" style={{ borderColor: "var(--rule)" }}>
            <Button arrow onClick={onSubmit} loading={busy} disabled={!isSubmittable(form)}>
              {submitted ? "다시 검토 요청" : "AI 검토 요청"}
            </Button>
            <p className="mt-2.5 text-[11.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
              * 표시만 필수입니다. 자료에 빠진 내용은 InPro가 출원 체크리스트 8개 항목으로 짚고, 연구원에게 보낼 질문을 만듭니다.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}

// 붙여넣기 + 파일 올리기. PDF는 서버에서 글자만 뽑고, 텍스트 파일은 브라우저에서 바로 읽는다.
function MaterialInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; note: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function readFile(file: File): Promise<{ text: string; note: string }> {
    if (/\.(txt|md)$/i.test(file.name)) {
      const text = (await file.text()).trim();
      return { text, note: `${text.length.toLocaleString()}자` };
    }
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/inpro/extract", { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "파일을 읽지 못했습니다.");
    return { text: data.text, note: `${data.pages}쪽${data.truncated ? " · 앞부분만" : ""}` };
  }

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError(null);
    let next = value;
    for (const file of Array.from(list)) {
      try {
        const { text, note } = await readFile(file);
        next = [next.trim(), `[파일: ${file.name}]\n${text}`].filter(Boolean).join("\n\n");
        setFiles((f) => [...f, { name: file.name, note }]);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "읽기 실패"}`);
      }
    }
    onChange(next);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <Label htmlFor="intake-material" required hint="메모·보고서·메신저 내용을 그대로 붙여넣거나 파일을 올려주세요. 칸을 나눠 다시 쓸 필요 없습니다.">
        연구원 자료
      </Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        className="border bg-white transition"
        style={{ borderColor: drag ? "var(--crimson)" : "var(--rule)", boxShadow: drag ? "0 0 0 3px rgba(110,11,20,.08)" : undefined }}
      >
        <textarea
          id="intake-material"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={12}
          placeholder={"예) 기존 필터는 주름을 한 번 접는 방식이라… 이번 안은 주름 빗면에 2차 주름을 넣고…\n\n문제, 기존 방식, 구조, 실험 결과가 섞여 있어도 괜찮습니다."}
          className="block w-full resize-y bg-transparent px-3 py-2.5 text-[14px] leading-relaxed outline-none"
        />
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2" style={{ borderColor: "var(--hairline)" }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="border px-2.5 py-1 text-[12px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)] disabled:opacity-50"
            style={{ borderColor: "var(--rule)" }}
          >
            {busy ? "읽는 중…" : "+ 파일 올리기"}
          </button>
          <span className="text-[11.5px]" style={{ color: "var(--ink-mute)" }}>
            PDF · TXT · MD, 끌어다 놓아도 됩니다
          </span>
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`} className="px-2 py-0.5 text-[11.5px] font-bold" style={{ background: "var(--crimson-soft)", color: "var(--crimson)" }}>
              {f.name} · {f.note}
            </span>
          ))}
          <span className="ml-auto font-mono text-[10.5px]" style={{ color: "var(--ink-mute)" }}>
            {value.trim().length.toLocaleString()}자
          </span>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.txt,.md" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>
      {error && (
        <p className="mt-1.5 text-[12px] font-bold" style={{ color: "var(--crimson)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
