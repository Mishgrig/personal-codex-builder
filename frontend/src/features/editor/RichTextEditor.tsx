import { useEffect, useState } from "react";
import type React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Check,
  ChevronDown,
  Code2,
  ClipboardCopy,
  ClipboardPaste,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { ColorPalettePicker } from "../../shared/components/ColorPalettePicker";
import { extractPlainText } from "../../utils/richText";
import { FontSize } from "./fontSizeExtension";

interface RichTextEditorProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  onTextChange?: (value: string) => void;
  recentCustomColors?: string[];
  onRememberCustomColor?: (color: string) => void;
  placeholder?: string;
  className?: string;
  density?: "default" | "compact";
  toolbarMode?: "inline" | "popover";
  toolbarOpen?: boolean;
  onToolbarOpenChange?: (open: boolean) => void;
  showToolbarTrigger?: boolean;
}

interface FormatSnapshot {
  block: "body" | "h1" | "h2" | "h3" | "mono" | "bullet" | "ordered" | "quote";
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color: string;
  highlight: string;
  fontSize: string;
}

const BLOCK_OPTIONS: Array<{ value: FormatSnapshot["block"]; label: string; icon: React.ReactNode }> = [
  { value: "h1", label: "Title", icon: <Heading1 size={16} /> },
  { value: "h2", label: "Heading", icon: <Heading2 size={16} /> },
  { value: "h3", label: "Subheading", icon: <Heading3 size={16} /> },
  { value: "body", label: "Body text", icon: <Pilcrow size={16} /> },
  { value: "mono", label: "Monospace", icon: <Code2 size={16} /> },
  { value: "bullet", label: "Bulleted list", icon: <List size={16} /> },
  { value: "ordered", label: "Numbered list", icon: <ListOrdered size={16} /> },
  { value: "quote", label: "Block quote", icon: <Quote size={16} /> },
];

export function RichTextEditor({
  value,
  onChange,
  onTextChange,
  recentCustomColors = [],
  onRememberCustomColor,
  placeholder = "Write the living text of this card...",
  className = "",
  density = "default",
  toolbarMode = "inline",
  toolbarOpen,
  onToolbarOpenChange,
  showToolbarTrigger = true,
}: RichTextEditorProps) {
  const [fontSize, setFontSize] = useState("14");
  const [copiedFormat, setCopiedFormat] = useState<FormatSnapshot | null>(null);
  const [internalToolbarOpen, setInternalToolbarOpen] = useState(false);
  const isToolbarOpen = toolbarOpen ?? internalToolbarOpen;
  const setToolbarOpen = onToolbarOpenChange ?? setInternalToolbarOpen;
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
        placeholder,
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
      const nextJson = current.getJSON() as Record<string, unknown>;
      onChange(nextJson);
      onTextChange?.(extractPlainText(nextJson));
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
  const block = currentBlock(editor);
  const blockLabel = BLOCK_OPTIONS.find((option) => option.value === block)?.label ?? "Body text";
  const toolbarContent = (
    <>
      <details className="editor-style-menu">
        <summary className="toolbar-button editor-style-trigger" title="Text style" aria-label={`Text style: ${blockLabel}`}>
          {BLOCK_OPTIONS.find((option) => option.value === block)?.icon}
          <span>{blockLabel}</span>
          <ChevronDown size={14} />
        </summary>
        <div className="editor-style-list">
          {BLOCK_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={option.value === block ? "active" : ""}
              onClick={() => applyBlock(editor, option.value)}
              type="button"
            >
              <span className="editor-style-check">{option.value === block ? <Check size={15} /> : null}</span>
              {option.icon}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </details>

      <button className={editor.isActive("bold") ? "toolbar-button active" : "toolbar-button"} title="Bold" aria-label="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={16} />
      </button>
      <button className={editor.isActive("italic") ? "toolbar-button active" : "toolbar-button"} title="Italic" aria-label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={16} />
      </button>
      <button className={editor.isActive("underline") ? "toolbar-button active" : "toolbar-button"} title="Underline" aria-label="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon size={16} />
      </button>
      <span className="editor-toolbar-separator" aria-hidden="true" />
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
        aria-label="Clear format"
        onClick={() => {
          setFontSize("14");
          editor.chain().focus().unsetHighlight().unsetColor().unsetFontSize().unsetAllMarks().clearNodes().run();
        }}
      >
        <Eraser size={16} />
      </button>
      <button className="toolbar-button" title="Undo" aria-label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={15} />
      </button>
      <button className="toolbar-button" title="Redo" aria-label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={15} />
      </button>
      <button
        className="toolbar-button"
        title="Copy formatting"
        aria-label="Copy formatting"
        onClick={() => setCopiedFormat(readCurrentFormat(editor, fontSize))}
      >
        <ClipboardCopy size={15} />
      </button>
      <button
        className="toolbar-button"
        title="Paste formatting"
        aria-label="Paste formatting"
        disabled={!copiedFormat}
        onClick={() => copiedFormat && applyCopiedFormat(editor, copiedFormat, setFontSize)}
      >
        <ClipboardPaste size={15} />
      </button>
    </>
  );

  return (
    <div className={`editor-shell editor-shell-${density}${className ? ` ${className}` : ""}`}>
      {toolbarMode === "popover" ? (
        <>
          {showToolbarTrigger ? (
            <div className="editor-popover-toolbar-shell">
              <button
                type="button"
                className={`editor-aa-trigger${isToolbarOpen ? " active" : ""}`}
                aria-label="Text formatting"
                aria-expanded={isToolbarOpen}
                onClick={() => setToolbarOpen(!isToolbarOpen)}
              >
                Aa
              </button>
            </div>
          ) : null}
          {isToolbarOpen ? <div className="editor-toolbar editor-toolbar-popover">{toolbarContent}</div> : null}
        </>
      ) : (
        <div className="editor-toolbar">{toolbarContent}</div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

function currentBlock(editor: NonNullable<ReturnType<typeof useEditor>>): FormatSnapshot["block"] {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  if (editor.isActive("codeBlock")) return "mono";
  if (editor.isActive("bulletList")) return "bullet";
  if (editor.isActive("orderedList")) return "ordered";
  if (editor.isActive("blockquote")) return "quote";
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
  if (block === "mono") {
    editor.chain().focus().toggleCodeBlock().run();
    return;
  }
  if (block === "quote") {
    editor.chain().focus().toggleBlockquote().run();
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
