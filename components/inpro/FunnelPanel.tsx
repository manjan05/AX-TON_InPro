"use client";
import { useEffect, useState } from "react";

interface FunnelInfo {
  corpus: string;
  stages: { label: string; count: number }[];
  usages: string[];
  facets: string[];
  scope: { usage?: string; facet?: string };
}

// 분야 좁히기 깔때기: "공기청정기 필터 특허 전체 → 가정용 → 형상"
// 멘토 피드백("신뢰할 수 있는 특허 수를 줄이는 것이 핵심")을 화면으로 보여준다.
export function FunnelPanel({
  scope,
  onScope,
}: {
  scope: { usage?: string; facet?: string } | null;
  onScope: (s: { usage?: string; facet?: string }) => void;
}) {
  const [info, setInfo] = useState<FunnelInfo | null>(null);

  useEffect(() => {
    const q = new URLSearchParams();
    if (scope) {
      q.set("usage", scope.usage ?? "");
      q.set("facet", scope.facet ?? "");
    }
    let alive = true;
    fetch(`/api/inpro/search?${q}`)
      .then((r) => r.json())
      .then((d: FunnelInfo) => {
        if (!alive) return;
        setInfo(d);
        if (!scope) onScope(d.scope);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [scope, onScope]);

  if (!info) return null;
  const max = info.stages[0]?.count || 1;
  const isDomain = info.usages.length > 0 || info.facets.length > 0;

  return (
    <div className="mb-6 border bg-white p-4" style={{ borderColor: "var(--rule)" }}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[13px] font-extrabold">조사 범위 좁히기</div>
        <div className="font-mono text-[10.5px]" style={{ color: "var(--ink-mute)" }}>
          {info.corpus}
        </div>
      </div>

      <ol className="flex items-stretch gap-1.5 max-sm:flex-col">
        {info.stages.map((s, i) => {
          const last = i === info.stages.length - 1;
          return (
            <li key={s.label} className="flex flex-1 items-center gap-1.5">
              <div
                className="flex-1 px-3 py-2.5"
                style={last ? { background: "var(--crimson)", color: "#fff" } : { background: "var(--paper)", color: "var(--ink)" }}
              >
                <div className="text-[11px] font-bold opacity-80">{s.label}</div>
                <div className="font-[family-name:var(--font-display)] text-[24px] font-bold leading-tight">
                  {s.count.toLocaleString()}
                  <span className="ml-0.5 text-[12px] font-normal">건</span>
                </div>
                <div className="mt-1 h-1" style={{ background: last ? "rgba(255,255,255,.3)" : "var(--rule)" }}>
                  <div className="h-full" style={{ width: `${Math.max(3, (s.count / max) * 100)}%`, background: last ? "#fff" : "var(--ink-mute)" }} />
                </div>
              </div>
              {!last && (
                <span className="text-lg max-sm:hidden" style={{ color: "var(--crimson)" }}>
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {isDomain ? (
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[12px]">
          {(
            [
              ["용도", "usage", info.usages],
              ["분류", "facet", info.facets],
            ] as const
          ).map(([label, key, values]) => (
            <div key={key} className="flex flex-wrap items-center gap-1">
              <span className="mr-1 font-bold" style={{ color: "var(--ink-soft)" }}>
                {label}
              </span>
              {["", ...values].map((v) => {
                const on = (info.scope[key] ?? "") === v;
                return (
                  <button
                    key={v || "all"}
                    type="button"
                    onClick={() => onScope({ ...info.scope, [key]: v })}
                    className="border px-2 py-0.5 font-bold"
                    style={on ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : { borderColor: "var(--rule)" }}
                  >
                    {v || "전체"}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12px]" style={{ color: "var(--ink-soft)" }}>
          지금은 데모 DB입니다. 공기청정기 필터 데이터가 들어오면 &ldquo;필터 전체 → 가정용 → 형상&rdquo;으로 좁혀집니다.
        </p>
      )}
    </div>
  );
}
