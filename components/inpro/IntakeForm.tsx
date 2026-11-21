"use client";
import { useRef, useState } from "react";
import { Field, Select, fieldCls } from "./FormParts";
import { DEV_STAGES, type DevStage } from "@/lib/inpro/types";
import { DISCLOSURE_TYPES, disclosureStatus } from "@/lib/inpro/disclosure";

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

// 멘토 시안 "01 발명 접수"와 같은 형태: 입력칸을 위에서 아래로 한 줄씩, 맨 아래에 버튼 줄
export function IntakeForm({
  form,
  onChange,
  stage,
  onStage,
  discDate,
  discType,
  onDiscDate,
  onDiscType,
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
  busy: boolean;
  onSubmit: () => void;
  submitted: boolean;
  onFillExample?: () => void;
}) {
  const [discOn, setDiscOn] = useState(false);
  const on = discOn || !!discDate; // 예시 자료를 불러와 날짜가 들어오면 자동으로 켜진다
  const disc = discDate ? disclosureStatus({ date: discDate, type: discType }) : null;
  const ok = isSubmittable(form);
  const text = (k: keyof IntakeFormState) => ({
    id: `intake-${k}`,
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ [k]: e.target.value }),
  });
  const { input: fileInput, list: fileList, busy: fileBusy, error: fileError, add: addFiles } = useFileAttach(form.material, (material) => onChange({ material }));

  return (
    <div className="space-y-5">
      <Field label="발명 명칭 (가칭)" required htmlFor="intake-title">
        <input {...text("title")} placeholder="예: 이중 주름 공기청정기 필터" className={fieldCls} style={{ borderColor: "var(--rule)" }} />
      </Field>

      <Field label="연구원 자료" required htmlFor="intake-material">
        <textarea
          {...text("material")}
          rows={5}
          placeholder="메모, 보고서, 메신저 내용을 그대로 붙여넣기"
          className="min-h-[132px] w-full resize-y rounded-[10px] border bg-white px-3.5 py-3 text-[15px] leading-relaxed outline-none transition placeholder:text-[var(--ink-mute)] focus:border-[var(--crimson)] focus:shadow-[0_0_0_3px_rgba(16,116,209,.12)]"
          style={{ borderColor: "var(--rule)" }}
        />
        {(fileList.length > 0 || fileError) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px]">
            {fileList.map((f, i) => (
              <span key={`${f.name}-${i}`} className="rounded-full px-2.5 py-0.5 font-bold" style={{ background: "var(--crimson-soft)", color: "var(--crimson)" }}>
                {f.name} · {f.note}
              </span>
            ))}
            {fileError && (
              <span className="font-bold" style={{ color: "var(--crimson)" }}>
                {fileError}
              </span>
            )}
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="적용 제품" htmlFor="intake-product">
          <input {...text("product")} className={fieldCls} style={{ borderColor: "var(--rule)" }} />
        </Field>
        <Field label="개발 단계" htmlFor="intake-stage">
          <Select id="intake-stage" value={stage} onChange={(v) => onStage(v as DevStage)}>
            {DEV_STAGES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <Field label="발명자" htmlFor="intake-inventor">
          <input {...text("inventor")} className={fieldCls} style={{ borderColor: "var(--rule)" }} />
        </Field>
        <Field label="소속" htmlFor="intake-dept">
          <input {...text("dept")} className={fieldCls} style={{ borderColor: "var(--rule)" }} />
        </Field>
      </div>

      <div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="외부 공개 예정" htmlFor="intake-disc">
            <Select
              id="intake-disc"
              value={on ? discType : "없음"}
              onChange={(v) => {
                if (v === "없음") {
                  setDiscOn(false);
                  onDiscDate("");
                } else {
                  setDiscOn(true);
                  onDiscType(v);
                }
              }}
            >
              <option>없음</option>
              {DISCLOSURE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          {on && (
            <Field label="공개 예정일" htmlFor="intake-disc-date">
              <input id="intake-disc-date" type="date" value={discDate} onChange={(e) => onDiscDate(e.target.value)} className={fieldCls} style={{ borderColor: "var(--rule)" }} />
            </Field>
          )}
        </div>
        {disc && (
          <p className="mt-2 text-[13px] font-bold" style={{ color: disc.level === "여유" ? "var(--ink-soft)" : "var(--crimson)" }}>
            {disc.message}
          </p>
        )}
      </div>

      {/* 버튼 줄: 보조 버튼은 왼쪽, 검토 요청은 오른쪽 끝 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
        {onFillExample && (
          <button type="button" onClick={onFillExample} className="h-10 rounded-[10px] border px-4 text-[14px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)]" style={{ borderColor: "var(--rule)" }}>
            예시 자료 불러오기
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={fileBusy}
          className="h-10 rounded-[10px] border px-4 text-[14px] font-bold transition hover:border-[var(--crimson)] hover:text-[var(--crimson)] disabled:opacity-50"
          style={{ borderColor: "var(--rule)" }}
        >
          {fileBusy ? "읽는 중…" : "파일 첨부"}
        </button>
        <input ref={fileInput} type="file" accept=".pdf,.txt,.md" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        {!ok && (
          <span className="ml-1 text-[13px] font-bold" style={{ color: "var(--crimson)" }}>
            발명 명칭과 연구원 자료 입력 필요
          </span>
        )}
        <button
          type="button"
          onClick={onSubmit}
          disabled={!ok || busy}
          className="ml-auto inline-flex h-[52px] items-center gap-2 rounded-[10px] px-[26px] text-[15px] font-bold text-white transition hover:brightness-110 disabled:opacity-35 disabled:hover:brightness-100"
          style={{ background: "var(--crimson)" }}
        >
          {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {submitted ? "다시 검토 요청" : "AI 검토 요청"}
        </button>
      </div>

      <p className="text-[13px]" style={{ color: "var(--ink-mute)" }}>
        데모는 무료 AI 사용. 실제 미공개 발명 입력 금지
      </p>
    </div>
  );
}

// 파일 첨부: PDF는 서버에서 글자만 뽑고, 텍스트 파일은 브라우저에서 바로 읽어 자료 칸 뒤에 붙인다
function useFileAttach(value: string, setValue: (v: string) => void) {
  const input = useRef<HTMLInputElement>(null);
  const [list, setList] = useState<{ name: string; note: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function read(file: File): Promise<{ text: string; note: string }> {
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

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    let next = value;
    for (const file of Array.from(files)) {
      try {
        const { text, note } = await read(file);
        next = [next.trim(), `[파일: ${file.name}]\n${text}`].filter(Boolean).join("\n\n");
        setList((f) => [...f, { name: file.name, note }]);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "읽기 실패"}`);
      }
    }
    setValue(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  return { input, list, busy, error, add };
}
