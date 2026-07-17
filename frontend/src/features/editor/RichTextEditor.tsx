import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Copy, Highlighter, Italic, List, ListOrdered, Paintbrush, Redo2, Strikethrough, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import { ColorPalettePicker } from "../../shared/components/ColorPalettePicker";
import { FontSize } from "./fontSizeExtension";

interface RichTextEditorProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  recentCustomColors?: string[];
  onRememberCustomColor?: (color: string) => void;
}

const FONT_STEPS = [8, 9, 10, 11, 12, 13, 14, 15, 16];

interface FormatSnapshot {
  block: "body" | "h1" | "h2" | "h3" | "bullet" | "ordered";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  color: string;
  highlight: string;
  fontSize: string;
}

export function RichTextEditor({ value, onChange, recentCustomColors = [], onRememberCustomColor }: RichTextEditorProps) {
  const [fontSize, setFontSize] = useState("14");
  const [copiedFormat, setCopiedFormat] = useState<FormatSnapshot | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        history: {
          depth: 50,
        },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Link.configure({
        autolink: true,
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write the living text of this card...",
      }),
      FontSize,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-body",
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange(current.getJSON() as Record<string, unknown>);
      window.setTimeout(() => decorateCollapsibleHeadings(current.view.dom), 0);
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value);
    if (current !== incoming) {
      editor.commands.setContent(value, false);
    }
    decorateCollapsibleHeadings(editor.view.dom);
  }, [editor, value]);

  if (!editor) {
    return <div className="editor-shell loading">Preparing editor…</div>;
  }

  return (
    <div className="editor-shell">
      <div className="editor-toolbar">
        <select
          className="toolbar-select"
          value={currentBlock(editor)}
          onChange={(event) => {
            const next = event.target.value;
            applyBlock(editor, next as FormatSnapshot["block"]);
          }}
        >
          <option value="h1">Title (H1)</option>
          <option value="h2">Heading (H2)</option>
          <option value="h3">Subheading (H3)</option>
          <option value="body">Body text</option>
          <option value="bullet">Bulleted list</option>
          <option value="ordered">Numbered list</option>
        </select>

        <div className="font-size-group">
          <button className="icon-button" title="Smaller text" onClick={() => applyFont(editor, fontSize, setFontSize, -1)}>
            -
          </button>
          <select
            className="toolbar-select compact"
            value={fontSize}
            onChange={(event) => {
              setFontSize(event.target.value);
              editor.chain().focus().setFontSize(`${event.target.value}px`).run();
            }}
          >
            {FONT_STEPS.map((step) => (
              <option key={step} value={step}>
                {step}
              </option>
            ))}
          </select>
          <button className="icon-button" title="Larger text" onClick={() => applyFont(editor, fontSize, setFontSize, 1)}>
            +
          </button>
        </div>

        <button className={editor.isActive("bold") ? "toolbar-button active" : "toolbar-button"} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={15} />
        </button>
        <button className={editor.isActive("italic") ? "toolbar-button active" : "toolbar-button"} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={15} />
        </button>
        <button className={editor.isActive("underline") ? "toolbar-button active" : "toolbar-button"} title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} />
        </button>
        <button className={editor.isActive("strike") ? "toolbar-button active" : "toolbar-button"} title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} />
        </button>
        <button className={editor.isActive("bulletList") ? "toolbar-button active" : "toolbar-button"} title="Bulleted list" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={15} />
        </button>
        <button className={editor.isActive("orderedList") ? "toolbar-button active" : "toolbar-button"} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} />
        </button>
        <ColorPalettePicker
          value={(editor.getAttributes("textStyle") as { color?: string }).color}
          label="Text color"
          previewLabel="A"
          align="left"
          recentColors={recentCustomColors}
          onChange={(color) => editor.chain().focus().setColor(color).run()}
          onRememberColor={onRememberCustomColor}
          onClear={() => editor.chain().focus().unsetColor().run()}
        />
        <ColorPalettePicker
          value={(editor.getAttributes("highlight") as { color?: string }).color}
          label="Highlight color"
          icon={<Highlighter size={14} />}
          align="left"
          recentColors={recentCustomColors}
          onChange={(color) => editor.chain().focus().setHighlight({ color }).run()}
          onRememberColor={onRememberCustomColor}
          onClear={() => editor.chain().focus().unsetHighlight().run()}
        />
        <button
          className="toolbar-button"
          title="Clear format"
          onClick={() => {
            setFontSize("14");
            editor.chain().focus().unsetHighlight().unsetColor().unsetFontSize().unsetAllMarks().run();
          }}
        >
          Clear format
        </button>
        <button className="toolbar-button" title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 size={15} />
        </button>
        <button className="toolbar-button" title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 size={15} />
        </button>
        <button
          className="toolbar-button"
          title="Copy formatting"
          onClick={() => setCopiedFormat(readCurrentFormat(editor, fontSize))}
        >
          <Copy size={15} />
        </button>
        <button
          className="toolbar-button"
          title="Paste formatting"
          disabled={!copiedFormat}
          onClick={() => copiedFormat && applyCopiedFormat(editor, copiedFormat, setFontSize)}
        >
          <Paintbrush size={15} />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function applyFont(editor: NonNullable<ReturnType<typeof useEditor>>, fontSize: string, setFontSize: (value: string) => void, delta: number) {
  const next = String(Math.min(16, Math.max(8, Number(fontSize || "14") + delta)));
  setFontSize(next);
  editor.chain().focus().setFontSize(`${next}px`).run();
}

function currentBlock(editor: NonNullable<ReturnType<typeof useEditor>>): FormatSnapshot["block"] {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("bulletList")) return "bullet";
  if (editor.isActive("orderedList")) return "ordered";
  return "body";
}

function applyBlock(editor: NonNullable<ReturnType<typeof useEditor>>, block: FormatSnapshot["block"]) {
  if (block === "body") {
    editor.chain().focus().setParagraph().run();
    return;
  }
  if (block === "bullet") {
    editor.chain().focus().toggleBulletList().run();
    return;
  }
  if (block === "ordered") {
    editor.chain().focus().toggleOrderedList().run();
    return;
  }
  editor.chain().focus().toggleHeading({ level: Number(block.replace("h", "")) as 1 | 2 | 3 }).run();
}

function readCurrentFormat(editor: NonNullable<ReturnType<typeof useEditor>>, fallbackFontSize: string): FormatSnapshot {
  const textStyle = editor.getAttributes("textStyle") as { color?: string; fontSize?: string };
  const highlight = editor.getAttributes("highlight") as { color?: string };
  return {
    block: currentBlock(editor),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    color: textStyle.color ?? "",
    highlight: highlight.color ?? "",
    fontSize: (textStyle.fontSize ?? `${fallbackFontSize}px`).replace("px", ""),
  };
}

function applyCopiedFormat(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  snapshot: FormatSnapshot,
  setFontSize: (value: string) => void,
) {
  editor.chain().focus().unsetAllMarks().unsetHighlight().unsetColor().setFontSize(`${snapshot.fontSize}px`).run();
  applyBlock(editor, snapshot.block);
  if (snapshot.bold) editor.chain().focus().toggleBold().run();
  if (snapshot.italic) editor.chain().focus().toggleItalic().run();
  if (snapshot.underline) editor.chain().focus().toggleUnderline().run();
  if (snapshot.strike) editor.chain().focus().toggleStrike().run();
  if (snapshot.color) editor.chain().focus().setColor(snapshot.color).run();
  if (snapshot.highlight) editor.chain().focus().setHighlight({ color: snapshot.highlight }).run();
  setFontSize(snapshot.fontSize);
}

function decorateCollapsibleHeadings(root: HTMLElement) {
  const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h1, h2, h3"));
  headings.forEach((heading, index) => {
    heading.dataset.headingIndex = String(index);
    heading.classList.add("collapsible-heading");
    heading.title = "Click to collapse or expand this section";
    heading.onclick = (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      heading.dataset.collapsed = heading.dataset.collapsed === "true" ? "false" : "true";
      applyHeadingVisibility(root);
    };
  });
  applyHeadingVisibility(root);
}

function applyHeadingVisibility(root: HTMLElement) {
  const children = Array.from(root.children) as HTMLElement[];
  children.forEach((child) => {
    if (!/^H[1-3]$/.test(child.tagName)) {
      child.hidden = false;
    }
  });

  children.forEach((child, index) => {
    if (!/^H[1-3]$/.test(child.tagName) || child.dataset.collapsed !== "true") {
      child.classList.toggle("is-collapsed", child.dataset.collapsed === "true");
      return;
    }
    child.classList.add("is-collapsed");
    const level = Number(child.tagName.slice(1));
    for (let nextIndex = index + 1; nextIndex < children.length; nextIndex += 1) {
      const next = children[nextIndex];
      if (/^H[1-3]$/.test(next.tagName) && Number(next.tagName.slice(1)) <= level) {
        break;
      }
      next.hidden = true;
    }
  });
}
