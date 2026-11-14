"use client";

// 출원 뒤에도 새로 공개·등록되는 특허와 겹치는지 계속 보는 "감시 등록".
// 데모 단계: 감시 조건만 저장한다. 실제 비교·알림은 특허 데이터(KIPRIS 등) 연동 후 동작한다.
export interface WatchInfo {
  at: string;
  components: { id: string; name: string }[];
  keywords: string[];
  scope: string;
}

export function WatchPanel({ watch, onRegister, onCancel, components, keywords, scope }: {
  watch: WatchInfo | null;
  onRegister: () => void;
  onCancel: () => void;
  components: { id: string; name: string }[];
  keywords: string[];
  scope: string;
}) {
  const shown = watch ?? { components, keywords, scope };
  return (
    <section className="no-print mx-auto mt-6 max-w-[880px] border bg-white p-5 sm:p-6" style={{ borderColor: watch ? "var(--crimson)" : "var(--rule)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-extrabold">새 특허 감시</h3>
            {watch && (
              <span className="px-1.5 py-0.5 text-[10.5px] font-bold text-white" style={{ background: "var(--crimson)" }}>
                감시 중
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
            출원 뒤에도 남의 특허가 새로 공개·등록되면 우리 제품이 걸릴 수 있습니다. 이 사건의 구성과 검색어로 새 특허를 계속 비교합니다.
          </p>
        </div>
        {watch ? (
          <button type="button" onClick={onCancel} className="shrink-0 border px-3 py-2 text-[12.5px] font-bold" style={{ borderColor: "var(--rule)" }}>
            감시 해제
          </button>
        ) : (
          <button type="button" onClick={onRegister} className="shrink-0 px-4 py-2 text-[13px] font-bold text-white" style={{ background: "var(--crimson)" }}>
            이 사건 감시 등록
          </button>
        )}
      </div>

      <dl className="mt-4 grid gap-2 text-[12.5px] sm:grid-cols-[110px_1fr]">
        <dt className="font-bold" style={{ color: "var(--ink-mute)" }}>비교할 구성</dt>
        <dd className="flex flex-wrap gap-1.5">
          {shown.components.map((c) => (
            <span key={c.id} className="border px-1.5 py-0.5 text-[11.5px] font-bold" style={{ borderColor: "var(--rule)" }}>
              {c.id} {c.name}
            </span>
          ))}
        </dd>
        <dt className="font-bold" style={{ color: "var(--ink-mute)" }}>검색어</dt>
        <dd>{shown.keywords.join(", ")}</dd>
        <dt className="font-bold" style={{ color: "var(--ink-mute)" }}>대상</dt>
        <dd>{shown.scope} · 새로 공개·등록되는 특허</dd>
        <dt className="font-bold" style={{ color: "var(--ink-mute)" }}>알림 기준</dt>
        <dd>우리 구성과 겹치는 특허가 나오면 담당자에게 알리고, 비교표를 다시 만들 수 있게 합니다.</dd>
        {watch && (
          <>
            <dt className="font-bold" style={{ color: "var(--ink-mute)" }}>등록일</dt>
            <dd>{new Date(watch.at).toLocaleString("ko-KR")}</dd>
          </>
        )}
      </dl>

      <p className="mt-4 border-t pt-3 text-[11.5px]" style={{ borderColor: "var(--hairline)", color: "var(--ink-mute)" }}>
        데모에서는 감시 조건만 저장합니다. 실제 비교와 알림은 특허청 데이터(KIPRIS) 연동 후 동작합니다.
      </p>
    </section>
  );
}
