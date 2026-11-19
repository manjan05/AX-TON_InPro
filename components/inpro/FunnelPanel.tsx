"use client";
import { useEffect, useState } from "react";
import { Field, Select } from "./FormParts";

interface FunnelInfo {
  usages: string[];
  facets: string[];
  scope: { usage?: string; facet?: string };
}

// 조사 범위: 용도와 분류를 드롭다운으로 고른다. 몇 건인지는 선행조사를 실행한 뒤에 보여준다.
export function FunnelPanel({
  scope,
  onScope,
  purpose,
}: {
  scope: { usage?: string; facet?: string } | null;
  onScope: (s: { usage?: string; facet?: string }) => void;
  purpose: string;
}) {
  const [info, setInfo] = useState<FunnelInfo | null>(null);

  useEffect(() => {
    const q = new URLSearchParams({ purpose });
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
  }, [scope, onScope, purpose]);

  if (!info || (info.usages.length === 0 && info.facets.length === 0)) return null;
  const cur = info.scope;
  return (
    <>
      <Field label="용도" htmlFor="scope-usage">
        <Select id="scope-usage" value={cur.usage ?? ""} onChange={(v) => onScope({ ...cur, usage: v })}>
          <option value="">전체</option>
          {info.usages.map((u) => (
            <option key={u}>{u}</option>
          ))}
        </Select>
      </Field>
      <Field label="분류" htmlFor="scope-facet">
        <Select id="scope-facet" value={cur.facet ?? ""} onChange={(v) => onScope({ ...cur, facet: v })}>
          <option value="">전체</option>
          {info.facets.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </Select>
      </Field>
    </>
  );
}
