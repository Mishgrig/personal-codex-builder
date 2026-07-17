export function extractPlainText(node: unknown): string {
  return extractPlainTextLines(node).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function extractPlainTextLines(node: unknown): string[] {
  if (node == null) {
    return [];
  }
  if (typeof node === "string") {
    return node.trim() ? [node.trim()] : [];
  }
  if (Array.isArray(node)) {
    return node
      .flatMap((item) => extractPlainTextLines(item))
      .filter(Boolean);
  }
  if (typeof node !== "object") {
    return [];
  }

  const record = node as { type?: string; text?: string; content?: unknown[] };
  if (record.type === "text" && typeof record.text === "string" && record.text.trim()) {
    return [record.text.trim()];
  }

  const childLines = (record.content ?? []).flatMap((child) => extractPlainTextLines(child));
  if (["paragraph", "heading", "listItem", "blockquote"].includes(record.type ?? "")) {
    const line = childLines.join(" ").replace(/\s+/g, " ").trim();
    return line ? [line] : [];
  }
  return childLines;
}
