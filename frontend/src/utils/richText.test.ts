import { describe, expect, it } from "vitest";
import { extractPlainText } from "./richText";

describe("extractPlainText", () => {
  it("extracts nested tiptap text content", () => {
    expect(
      extractPlainText({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Workspace" }, { type: "text", text: "notes" }],
          },
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }],
              },
            ],
          },
        ],
      }),
    ).toBe("Workspace notes One");
  });
});
