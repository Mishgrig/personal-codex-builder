import type { ReactNode } from "react";

export function highlightText(value: string, query: string): ReactNode {
  if (!query.trim()) {
    return value;
  }
  const terms = Array.from(new Set(query.trim().split(/\s+/).filter(Boolean)));
  if (!terms.length) {
    return value;
  }
  const matcher = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "ig");
  return value.split(matcher).map((part, index) =>
    matcher.test(part) ? (
      <mark className="search-hit" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

