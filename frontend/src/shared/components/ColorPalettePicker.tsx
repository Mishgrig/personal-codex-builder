import { Ban, Pipette, PlusCircle } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type React from "react";

interface ColorPalettePickerProps {
  value?: string;
  label: string;
  onChange: (color: string) => void;
  onClear?: () => void;
  paletteVariant?: "default" | "widget";
  recentColors?: string[];
  onRememberColor?: (color: string) => void;
  align?: "left" | "right";
  triggerClassName?: string;
  previewLabel?: string;
  icon?: React.ReactNode;
  displayColor?: string;
  mapDisplayColor?: (color: string) => string;
}

const PALETTE_ROWS = [
  ["#000000", "#3f3f3f", "#666666", "#999999", "#b8b8b8", "#cccccc", "#d8d8d8", "#f0f0f0", "#f7f7f7", "#ffffff"],
  ["#b00000", "#ff130c", "#ff9800", "#fff200", "#00ef00", "#11d5d5", "#4b82df", "#1e0dff", "#9413ef", "#f000df"],
  ["#e8b3a8", "#f4c6c1", "#f6dfbd", "#faedc2", "#d9ead1", "#d0e0e3", "#c9d9f2", "#cfe2f3", "#d9d2e9", "#ead1dc"],
  ["#df7d69", "#ea8e8e", "#f8c68d", "#ffdf8a", "#afd39f", "#9fc5c8", "#9dbbeb", "#9fc5e8", "#b4a7d6", "#d5a6bd"],
  ["#d94829", "#df5e5e", "#f5a65b", "#ffd462", "#8fbf7b", "#76a9b0", "#6d9eeb", "#6fa8dc", "#8e7cc3", "#c27ba0"],
  ["#c21f00", "#d90000", "#e69138", "#f1c232", "#6aa84f", "#45818e", "#3c78d8", "#3d85c6", "#674ea7", "#a64d79"],
  ["#8f270f", "#b00000", "#b45f06", "#bf9000", "#38761d", "#134f5c", "#1155cc", "#0b5394", "#351c75", "#741b47"],
  ["#6f1708", "#7f0000", "#783f04", "#7f6000", "#274e13", "#0c343d", "#1c4587", "#073763", "#20124d", "#4c1130"],
];

const WIDGET_PALETTE_ROWS = [
  ["#000000", "#3a3a3a", "#666666", "#969696", "#c4c4c4", "#e2e2e2", "#f2f2f2", "#ffffff"],
  ["#b00000", "#ff1a12", "#ff9800", "#fff000", "#00f000", "#12d8d8", "#276ef1", "#f000df"],
  ["#e02d12", "#f2551f", "#f47b20", "#f5b51f", "#95d91f", "#1fc96b", "#16b5ad", "#1583ff"],
  ["#d60000", "#ff0040", "#ff5c00", "#ffd000", "#28c900", "#00bcd4", "#004cff", "#6a00ff"],
  ["#9f1d0b", "#c70039", "#d66b00", "#d99b00", "#4f9f22", "#147c8a", "#0058b8", "#4b1fa6"],
  ["#731500", "#8f0000", "#8a4b00", "#8a6a00", "#245c12", "#07545f", "#003d80", "#321061"],
  ["#5a0d00", "#640000", "#5f3400", "#5c4a00", "#183f0b", "#06383f", "#002a59", "#21083f"],
  ["#e8b3a8", "#f4c6c1", "#f6dfbd", "#faedc2", "#d9ead1", "#d0e0e3", "#c9d9f2", "#d9d2e9"],
];

const DEFAULT_COLOR = "#ff0000";
const MAX_RECENT_COLORS = 6;

export function ColorPalettePicker({
  value,
  label,
  onChange,
  onClear,
  paletteVariant = "default",
  recentColors = [],
  onRememberColor,
  align = "right",
  triggerClassName = "",
  previewLabel,
  icon,
  displayColor,
  mapDisplayColor,
}: ColorPalettePickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState(normalizeHex(value) ?? DEFAULT_COLOR);
  const currentColor = normalizeHex(value);
  const paletteId = useId();
  const paletteRows = paletteVariant === "widget" ? WIDGET_PALETTE_ROWS : PALETTE_ROWS;
  const normalizedRecentColors = uniqueHexColors(recentColors).slice(0, MAX_RECENT_COLORS);

  useEffect(() => {
    if (currentColor) {
      setDraft(currentColor);
    }
  }, [currentColor]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setCustomOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const selectColor = (color: string, remember = false) => {
    onChange(color);
    if (remember) {
      onRememberColor?.(color);
    }
    setDraft(color);
    setOpen(false);
    setCustomOpen(false);
  };

  return (
    <div ref={rootRef} className={`color-picker ${open ? "is-open" : ""} ${align === "left" ? "align-left" : "align-right"}`}>
      <button
        type="button"
        className={`color-picker-trigger ${triggerClassName}`.trim()}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? paletteId : undefined}
        title={label}
        onClick={() => {
          setOpen((current) => !current);
          setCustomOpen(false);
        }}
      >
        <span className="color-picker-trigger-swatch" style={swatchStyle(displayColor ?? (currentColor ? mapDisplayColor?.(currentColor) ?? currentColor : undefined))} aria-hidden="true" />
        {icon ? <span className="color-picker-trigger-icon">{icon}</span> : null}
        {previewLabel ? <span>{previewLabel}</span> : null}
      </button>
      {open ? (
        <div id={paletteId} className={`color-picker-panel variant-${paletteVariant} ${customOpen ? "is-custom" : ""}`} role="dialog" aria-label={label}>
          {customOpen ? (
            <CustomColorPanel
              value={draft}
              onChange={setDraft}
              onCancel={() => setCustomOpen(false)}
              onConfirm={() => selectColor(draft, true)}
            />
          ) : (
            <>
              {onClear ? (
                <button
                  type="button"
                  className="color-picker-none"
                  onClick={() => {
                    onClear();
                    setOpen(false);
                  }}
                >
                  <Ban size={19} />
                  <span>None</span>
                </button>
              ) : null}
              <div className={`color-picker-grid variant-${paletteVariant}`} aria-label="Color palette">
                {paletteRows.flat().map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-picker-swatch${currentColor === color ? " active" : ""}`}
                    style={swatchStyle(mapDisplayColor?.(color) ?? color)}
                    aria-label={`${label}: ${color}`}
                    onClick={() => selectColor(color)}
                  />
                ))}
              </div>
              <div className="color-picker-other">
                <span>Other</span>
                <div>
                  {normalizedRecentColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-picker-swatch recent${currentColor === color ? " active" : ""}`}
                      style={swatchStyle(mapDisplayColor?.(color) ?? color)}
                      aria-label={`${label}: ${color}`}
                      onClick={() => selectColor(color)}
                    />
                  ))}
                  <button type="button" className="color-picker-tool" aria-label="Open custom color" title="Custom color" onClick={() => setCustomOpen(true)}>
                    <PlusCircle size={21} />
                  </button>
                  <button
                    type="button"
                    className="color-picker-tool"
                    aria-label="Pick color from screen"
                    title="Eyedropper"
                    disabled={!canUseEyeDropper()}
                    onClick={() => void pickFromScreen((color) => selectColor(color, true))}
                  >
                    <Pipette size={21} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CustomColorPanel({
  value,
  onChange,
  onCancel,
  onConfirm,
}: {
  value: string;
  onChange: (color: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const areaRef = useRef<HTMLDivElement | null>(null);
  const hsv = useMemo(() => hexToHsv(value), [value]);
  const rgb = useMemo(() => hexToRgb(value), [value]);
  const pureHue = hsvToHex({ h: hsv.h, s: 100, v: 100 });

  const applyHsv = (next: Partial<Hsv>) => onChange(hsvToHex({ ...hsv, ...next }));

  const updateFromArea = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    applyHsv({ s: Math.round((x / rect.width) * 100), v: Math.round(100 - (y / rect.height) * 100) });
  };

  return (
    <div className="custom-color-panel">
      <div
        ref={areaRef}
        className="custom-color-area"
        style={{ ["--picker-hue" as string]: pureHue }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromArea(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons === 1) {
            updateFromArea(event);
          }
        }}
      >
        <span
          className="custom-color-area-handle"
          style={{
            left: `${hsv.s}%`,
            top: `${100 - hsv.v}%`,
            ["--swatch-color" as string]: value,
          }}
        />
      </div>
      <div className="custom-color-controls">
        <span className="custom-color-preview" style={swatchStyle(value)} aria-hidden="true" />
        <button
          type="button"
          className="custom-color-eyedropper"
          aria-label="Pick color from screen"
          title="Eyedropper"
          disabled={!canUseEyeDropper()}
          onClick={() => void pickFromScreen(onChange)}
        >
          <Pipette size={24} />
        </button>
        <input
          className="custom-color-hue"
          type="range"
          min="0"
          max="360"
          value={Math.round(hsv.h)}
          aria-label="Hue"
          onChange={(event) => applyHsv({ h: Number(event.target.value) })}
        />
      </div>
      <div className="custom-color-fields">
        <label>
          <span>Hex</span>
          <input
            value={value}
            onChange={(event) => {
              const next = normalizeHex(event.target.value);
              onChange(next ?? event.target.value);
            }}
            onBlur={(event) => onChange(normalizeHex(event.target.value) ?? DEFAULT_COLOR)}
          />
        </label>
        {(["r", "g", "b"] as const).map((channel) => (
          <label key={channel}>
            <span>{channel.toUpperCase()}</span>
            <input
              type="number"
              min="0"
              max="255"
              value={rgb[channel]}
              onChange={(event) => {
                const next = Math.min(255, Math.max(0, Number(event.target.value) || 0));
                onChange(rgbToHex({ ...rgb, [channel]: next }));
              }}
            />
          </label>
        ))}
      </div>
      <div className="custom-color-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="primary-button" onClick={onConfirm}>
          OK
        </button>
      </div>
    </div>
  );
}

function swatchStyle(color?: string): React.CSSProperties {
  return { ["--swatch-color" as string]: color ?? "transparent" };
}

function canUseEyeDropper() {
  return typeof window !== "undefined" && "EyeDropper" in window;
}

async function pickFromScreen(onPick: (color: string) => void) {
  if (!canUseEyeDropper()) {
    return;
  }
  const eyeDropper = new (window as unknown as Window & { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
  const result = await eyeDropper.open();
  onPick(result.sRGBHex);
}

function normalizeHex(value?: string) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed.toLowerCase()}`;
  }
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function uniqueHexColors(colors: string[]) {
  const seen = new Set<string>();
  return colors
    .map((color) => normalizeHex(color) ?? "")
    .filter((color) => {
      if (!color || seen.has(color)) {
        return false;
      }
      seen.add(color);
      return true;
    });
}

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsv {
  h: number;
  s: number;
  v: number;
}

function hexToRgb(value: string): Rgb {
  const hex = normalizeHex(value) ?? DEFAULT_COLOR;
  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb) {
  return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function hexToHsv(value: string): Hsv {
  const { r, g, b } = hexToRgb(value);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === red) {
      h = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      h = 60 * ((blue - red) / delta + 2);
    } else {
      h = 60 * ((red - green) / delta + 4);
    }
  }
  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : (delta / max) * 100,
    v: max * 100,
  };
}

function hsvToHex({ h, s, v }: Hsv) {
  const saturation = s / 100;
  const value = v / 100;
  const c = value * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = value - c;
  let rgb: Rgb;
  if (h < 60) {
    rgb = { r: c, g: x, b: 0 };
  } else if (h < 120) {
    rgb = { r: x, g: c, b: 0 };
  } else if (h < 180) {
    rgb = { r: 0, g: c, b: x };
  } else if (h < 240) {
    rgb = { r: 0, g: x, b: c };
  } else if (h < 300) {
    rgb = { r: x, g: 0, b: c };
  } else {
    rgb = { r: c, g: 0, b: x };
  }
  return rgbToHex({
    r: (rgb.r + m) * 255,
    g: (rgb.g + m) * 255,
    b: (rgb.b + m) * 255,
  });
}
