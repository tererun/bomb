"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  type CharacterConfig,
  BODY_COLOR_PRESETS,
  EYE_TYPES,
  HAIR_TYPES,
  MOUTH_TYPES,
} from "@/lib/character";
import { saveCharacter } from "@/lib/characterStore";

const CharacterPreview = dynamic(
  () => import("./CharacterPreview").then((m) => m.CharacterPreview),
  { ssr: false }
);

const PAINT_SIZE = 128;
const FACE_BASE_COLOR = "#e8c4a0";
/** Slider drags等の連続変更をこの時間内なら1つのUndoステップにまとめる */
const GESTURE_MERGE_MS = 800;

type SectionId = "hair" | "eyes" | "mouth" | "body" | "facePaint";

const SECTIONS: { id: SectionId; label: string; icon: string }[] = [
  { id: "hair", label: "髪型", icon: "💇" },
  { id: "eyes", label: "目", icon: "👀" },
  { id: "mouth", label: "口", icon: "👄" },
  { id: "body", label: "服", icon: "👕" },
  { id: "facePaint", label: "顔ペイント", icon: "🎨" },
];

interface CharacterCreatorModalProps {
  value: CharacterConfig;
  onChange: (character: CharacterConfig) => void;
  onClose: () => void;
}

/**
 * Undo/Redo history for the character config.
 *
 * Discrete changes (buttons, toggles, paint strokes) each become one undo
 * step. Continuous changes (slider drags) pass a `gestureKey`; consecutive
 * changes with the same key are merged into a single step so undo jumps back
 * to the value before the drag started.
 */
function useCharacterHistory(
  value: CharacterConfig,
  onChange: (c: CharacterConfig) => void
) {
  const [past, setPast] = useState<CharacterConfig[]>([]);
  const [future, setFuture] = useState<CharacterConfig[]>([]);
  const gestureRef = useRef<string | null>(null);
  const gestureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endGesture = useCallback(() => {
    gestureRef.current = null;
    if (gestureTimerRef.current) {
      clearTimeout(gestureTimerRef.current);
      gestureTimerRef.current = null;
    }
  }, []);

  const change = useCallback(
    (next: CharacterConfig, gestureKey?: string) => {
      if (!gestureKey || gestureRef.current !== gestureKey) {
        setPast((p) => [...p, value]);
        setFuture([]);
      }
      gestureRef.current = gestureKey ?? null;
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
      if (gestureKey) {
        gestureTimerRef.current = setTimeout(() => {
          gestureRef.current = null;
        }, GESTURE_MERGE_MS);
      }
      onChange(next);
    },
    [value, onChange]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    endGesture();
    const prev = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture((f) => [...f, value]);
    onChange(prev);
  }, [past, value, onChange, endGesture]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    endGesture();
    const next = future[future.length - 1];
    setFuture(future.slice(0, -1));
    setPast((p) => [...p, value]);
    onChange(next);
  }, [future, value, onChange, endGesture]);

  return {
    change,
    undo,
    redo,
    endGesture,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}

function UndoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h10a6 6 0 0 1 0 12h-3" />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H10a6 6 0 0 0 0 12h3" />
    </svg>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? "bg-green-500" : "bg-gray-600"
      }`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

function TypeButtons({
  types,
  selected,
  onSelect,
  disabled,
}: {
  types: { id: number; label: string }[];
  selected: number;
  onSelect: (id: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      {types.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            selected === t.id
              ? "bg-orange-500 text-white"
              : "bg-gray-600 text-gray-200 hover:bg-gray-500"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** ドラッグ終了時に呼ばれ、Undoのまとまり(ジェスチャ)を区切る */
  onCommit?: () => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <span className="text-gray-300 text-xs">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onBlur={onCommit}
        className="w-full accent-orange-500"
      />
    </label>
  );
}

function Panel({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled?: boolean;
  onToggle?: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-white">{title}</h3>
        {onToggle && <Toggle checked={enabled ?? false} onChange={onToggle} />}
      </div>
      {children}
    </div>
  );
}

function BodyColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  /** gestureKeyはカラーピッカーの連続変更を1つのUndoステップにまとめるために使う */
  onChange: (color: string | null, gestureKey?: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {BODY_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`服の色 ${c}`}
            className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
              value === c ? "border-orange-400 scale-110" : "border-gray-600"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-xs">カスタム</span>
        <input
          type="color"
          value={value ?? "#4a90d9"}
          onChange={(e) => onChange(e.target.value, "body.color")}
          className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
        />
      </div>
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={value === null}
        className="w-full py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition-colors disabled:opacity-40 disabled:pointer-events-none"
      >
        おまかせに戻す
      </button>
      <p className="text-gray-400 text-[11px]">
        おまかせの場合、入室順にプレイヤーごとの色が自動で割り当てられます。
      </p>
    </div>
  );
}

function FacePaint({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const isDrawingRef = useRef(false);
  // 自分がcommitした値を覚えておき、外部からの変更(Undo/Redo)時のみ再描画する
  const lastCommittedRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (value === lastCommittedRef.current) return;
    lastCommittedRef.current = value;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.fillStyle = FACE_BASE_COLOR;
    ctx.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
    if (value) {
      const img = new Image();
      img.onload = () => {
        // 読み込み中にさらに変更されていたら描かない
        if (lastCommittedRef.current === value) {
          ctx.drawImage(img, 0, 0, PAINT_SIZE, PAINT_SIZE);
        }
      };
      img.src = value;
    }
  }, [value]);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    lastCommittedRef.current = dataUrl;
    onChange(dataUrl);
  }, [onChange]);

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : e;
    const x = ((point.clientX - rect.left) * canvas.width) / rect.width;
    const y = ((point.clientY - rect.top) * canvas.height) / rect.height;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    draw(e);
  };

  const stopDrawing = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    canvasRef.current?.getContext("2d")?.beginPath();
    commit();
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = FACE_BASE_COLOR;
    ctx.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
    lastCommittedRef.current = null;
    onChange(null);
  };

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        width={PAINT_SIZE}
        height={PAINT_SIZE}
        className="border-2 border-gray-500 rounded-lg cursor-crosshair w-full max-w-[240px] aspect-square mx-auto block"
        style={{ touchAction: "none", backgroundColor: FACE_BASE_COLOR }}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
      />
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-xs">色</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
        />
      </div>
      <label className="block">
        <span className="text-gray-300 text-xs">ブラシ: {brushSize}px</span>
        <input
          type="range"
          min={2}
          max={20}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
      </label>
      <button
        type="button"
        onClick={clearCanvas}
        className="w-full py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition-colors"
      >
        クリア
      </button>
      <p className="text-gray-400 text-[11px]">
        顔のベース(四角形)に直接描けます。目や口のパーツはこの上に表示されます。
      </p>
    </div>
  );
}

export function CharacterCreatorModal({
  value,
  onChange,
  onClose,
}: CharacterCreatorModalProps) {
  const [section, setSection] = useState<SectionId>("hair");
  const { change, undo, redo, endGesture, canUndo, canRedo } =
    useCharacterHistory(value, onChange);

  // Debounced auto-save to IndexedDB whenever the character changes
  const valueRef = useRef(value);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    valueRef.current = value;
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      dirtyRef.current = false;
      await saveCharacter(value);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }, 400);
  }, [value]);

  // モーダルを閉じるとき、保留中の保存があれば即座に書き込む
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (dirtyRef.current) void saveCharacter(valueRef.current);
    };
  }, []);

  // モーダル表示中は背面ページのスクロールをロック
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // キーボードショートカット: Esc=閉じる, Ctrl/Cmd+Z=Undo, Ctrl/Cmd+Shift+Z / Ctrl+Y=Redo
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, onClose]);

  const update = (patch: Partial<CharacterConfig>, gestureKey?: string) => {
    change({ ...value, ...patch }, gestureKey);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="キャラクリ"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
    >
      <div className="bg-gray-800 sm:rounded-2xl shadow-2xl w-full h-full sm:h-[92vh] sm:max-h-[720px] max-w-6xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-700 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-white">キャラクリ</h2>
          <span
            className={`text-xs text-green-400 transition-opacity duration-300 hidden sm:inline ${
              savedFlash ? "opacity-100" : "opacity-0"
            }`}
          >
            ✓ 自動保存しました
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="元に戻す (Ctrl+Z)"
            aria-label="元に戻す"
            className="p-2 rounded-lg text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <UndoIcon />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="やり直す (Ctrl+Shift+Z)"
            aria-label="やり直す"
            className="p-2 rounded-lg text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          >
            <RedoIcon />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-sm font-bold rounded-lg transition-all"
          >
            完了
          </button>
        </header>

        {/* Body: nav (left / top) + preview (center) + panel (right / bottom) */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Navigation */}
          <nav className="flex lg:flex-col gap-1 p-2 shrink-0 overflow-x-auto lg:overflow-y-auto lg:w-44 border-b lg:border-b-0 lg:border-r border-gray-700">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-3 py-2 lg:py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  section === s.id
                    ? "bg-orange-500 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span aria-hidden>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </nav>

          {/* Live 3D preview */}
          <div className="relative shrink-0 lg:shrink lg:flex-1 h-56 sm:h-72 lg:h-auto bg-gray-900 min-w-0">
            <CharacterPreview character={value} />
            <p className="absolute bottom-1 inset-x-0 text-center text-gray-500 text-[11px] pointer-events-none">
              ドラッグで回転できます
            </p>
          </div>

          {/* Edit panel */}
          <div className="flex-1 lg:flex-none lg:w-[360px] min-h-0 overflow-y-auto p-4 border-t lg:border-t-0 lg:border-l border-gray-700">
            {section === "hair" && (
              <Panel
                title="髪型"
                enabled={value.hair.enabled}
                onToggle={(enabled) => update({ hair: { ...value.hair, enabled } })}
              >
                <TypeButtons
                  types={HAIR_TYPES}
                  selected={value.hair.type}
                  disabled={!value.hair.enabled}
                  onSelect={(type) => update({ hair: { ...value.hair, type } })}
                />
                <div
                  className={`flex items-center gap-2 ${
                    !value.hair.enabled ? "opacity-40 pointer-events-none" : ""
                  }`}
                >
                  <span className="text-gray-300 text-xs">反転</span>
                  <Toggle
                    checked={value.hair.flip}
                    onChange={(flip) => update({ hair: { ...value.hair, flip } })}
                  />
                </div>
              </Panel>
            )}

            {section === "eyes" && (
              <Panel
                title="目"
                enabled={value.eyes.enabled}
                onToggle={(enabled) => update({ eyes: { ...value.eyes, enabled } })}
              >
                <TypeButtons
                  types={EYE_TYPES}
                  selected={value.eyes.type}
                  disabled={!value.eyes.enabled}
                  onSelect={(type) => update({ eyes: { ...value.eyes, type } })}
                />
                <Slider
                  label="上下"
                  value={value.eyes.offsetY}
                  min={-1}
                  max={1}
                  disabled={!value.eyes.enabled}
                  onChange={(offsetY) =>
                    update({ eyes: { ...value.eyes, offsetY } }, "eyes.offsetY")
                  }
                  onCommit={endGesture}
                />
                <Slider
                  label="左右の離れ"
                  value={value.eyes.spacing}
                  min={0}
                  max={1}
                  disabled={!value.eyes.enabled}
                  onChange={(spacing) =>
                    update({ eyes: { ...value.eyes, spacing } }, "eyes.spacing")
                  }
                  onCommit={endGesture}
                />
                <Slider
                  label="大きさ"
                  value={value.eyes.scale}
                  min={0.5}
                  max={1.5}
                  disabled={!value.eyes.enabled}
                  onChange={(scale) =>
                    update({ eyes: { ...value.eyes, scale } }, "eyes.scale")
                  }
                  onCommit={endGesture}
                />
                <Slider
                  label="傾き (たれ目 ← → つり目)"
                  value={value.eyes.rotation}
                  min={-30}
                  max={30}
                  step={1}
                  disabled={!value.eyes.enabled}
                  onChange={(rotation) =>
                    update({ eyes: { ...value.eyes, rotation } }, "eyes.rotation")
                  }
                  onCommit={endGesture}
                />
              </Panel>
            )}

            {section === "mouth" && (
              <Panel
                title="口"
                enabled={value.mouth.enabled}
                onToggle={(enabled) => update({ mouth: { ...value.mouth, enabled } })}
              >
                <TypeButtons
                  types={MOUTH_TYPES}
                  selected={value.mouth.type}
                  disabled={!value.mouth.enabled}
                  onSelect={(type) => update({ mouth: { ...value.mouth, type } })}
                />
                <Slider
                  label="上下"
                  value={value.mouth.offsetY}
                  min={-1}
                  max={1}
                  disabled={!value.mouth.enabled}
                  onChange={(offsetY) =>
                    update({ mouth: { ...value.mouth, offsetY } }, "mouth.offsetY")
                  }
                  onCommit={endGesture}
                />
                <Slider
                  label="左右"
                  value={value.mouth.offsetX}
                  min={-1}
                  max={1}
                  disabled={!value.mouth.enabled}
                  onChange={(offsetX) =>
                    update({ mouth: { ...value.mouth, offsetX } }, "mouth.offsetX")
                  }
                  onCommit={endGesture}
                />
                <Slider
                  label="大きさ"
                  value={value.mouth.scale}
                  min={0.5}
                  max={1.5}
                  disabled={!value.mouth.enabled}
                  onChange={(scale) =>
                    update({ mouth: { ...value.mouth, scale } }, "mouth.scale")
                  }
                  onCommit={endGesture}
                />
                <Slider
                  label="回転"
                  value={value.mouth.rotation}
                  min={-45}
                  max={45}
                  step={1}
                  disabled={!value.mouth.enabled}
                  onChange={(rotation) =>
                    update({ mouth: { ...value.mouth, rotation } }, "mouth.rotation")
                  }
                  onCommit={endGesture}
                />
              </Panel>
            )}

            {section === "body" && (
              <Panel title="服">
                <BodyColorPicker
                  value={value.body.color}
                  onChange={(color, gestureKey) =>
                    update({ body: { color } }, gestureKey)
                  }
                />
              </Panel>
            )}

            {section === "facePaint" && (
              <Panel title="顔ペイント">
                <FacePaint
                  value={value.facePaint}
                  onChange={(facePaint) => update({ facePaint })}
                />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
