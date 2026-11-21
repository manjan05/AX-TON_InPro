"use client";
import type { ReactNode } from "react";

// 입력칸 공통 모양 (멘토 시안): 높이 52px, 모서리 10px, 글자 15px
export const fieldCls =
  "w-full h-[52px] rounded-[10px] border bg-white px-3.5 text-[15px] outline-none transition placeholder:text-[var(--ink-mute)] focus:border-[var(--crimson)] focus:shadow-[0_0_0_3px_rgba(16,116,209,.12)]";
const selectCls = `${fieldCls} appearance-none pr-10`;

export function Field({ label, required, htmlFor, children, className = "" }: { label: string; required?: boolean; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-2 block text-[14px] font-bold">
        {label}
        {required && <span style={{ color: "var(--crimson)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// 오른쪽 끝에 화살표(▾)가 있는 선택칸
export function Select({ id, value, onChange, children }: { id: string; value: string; onChange: (v: string) => void; children: ReactNode }) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls} style={{ borderColor: "var(--rule)" }}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3.5 6l4.5 4.5L12.5 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
