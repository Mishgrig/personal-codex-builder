export function extractPlainText(node: unknown): string {
  if (node == null) {
    return "";
  }
  if (typeof node === "string") {
    return node.trim();
  }
  if (Array.isArray(node)) {
    return node
      .map((item) => extractPlainText(item))
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (typeof node !== "object") {
    return "";
  }

  const record = node as { type?: string; text?: string; content?: unknown[] };
  const pieces: string[] = [];

  if (record.type === "text" && typeof record.text === "string" && record.text.trim()) {
    pieces.push(record.text.trim());
  }

  for (const child of record.content ?? []) {
    const childText = extractPlainText(child);
    if (childText) {
      pieces.push(childText);
    }
  }

  return pieces.join(" ").trim();
}
