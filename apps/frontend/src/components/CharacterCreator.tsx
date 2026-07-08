"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  type CharacterConfig,
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

interface CharacterCreatorProps {
  value: CharacterConfig;
  onChange: (character: CharacterConfig) => void;
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
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <span className="text-gray-300 text-xs">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-orange-500"
      />
    </label>
  );
}

function Section({
  title,
  enabled,
  onToggle,
  children,
}: {
  title: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <Toggle checked={enabled} onChange={onToggle} />
      </div>
      {children}
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
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = FACE_BASE_COLOR;
    ctx.fillRect(0, 0, PAINT_SIZE, PAINT_SIZE);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, PAINT_SIZE, PAINT_SIZE);
      img.src = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL("image/png"));
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
    onChange(null);
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-3 space-y-2">
      <h3 className="text-sm font-bold text-white">顔ペイント</h3>
      <div className="flex gap-3">
        <canvas
          ref={canvasRef}
          width={PAINT_SIZE}
          height={PAINT_SIZE}
          className="border-2 border-gray-500 rounded-lg cursor-crosshair shrink-0"
          style={{ width: 140, height: 140, touchAction: "none", backgroundColor: FACE_BASE_COLOR }}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
        <div className="flex-1 space-y-2">
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
        </div>
      </div>
      <p className="text-gray-400 text-[11px]">
        顔のベース(四角形)に直接描けます。目や口のパーツはこの上に表示されます。
      </p>
    </div>
  );
}

export function CharacterCreator({ value, onChange }: CharacterCreatorProps) {
  // Debounced auto-save to IndexedDB whenever the character changes
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveCharacter(value);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    }, 400);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [value]);

  const update = (patch: Partial<CharacterConfig>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-[720px] max-w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">キャラクリ</h2>
        <span
          className={`text-xs transition-opacity duration-300 ${
            savedFlash ? "text-green-400 opacity-100" : "opacity-0"
          }`}
        >
          ✓ 自動保存しました
        </span>
      </div>

      <div className="flex gap-4 flex-col sm:flex-row">
        {/* Left: live 3D preview */}
        <div className="sm:w-[280px] shrink-0">
          <div className="h-[380px] bg-gray-900 rounded-xl overflow-hidden">
            <CharacterPreview character={value} />
          </div>
          <p className="text-gray-500 text-[11px] text-center mt-1">
            ドラッグで回転できます
          </p>
        </div>

        {/* Right: parameter controls */}
        <div className="flex-1 space-y-3 max-h-[420px] overflow-y-auto pr-1">
          <Section
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
            <div className={`flex items-center gap-2 ${!value.hair.enabled ? "opacity-40 pointer-events-none" : ""}`}>
              <span className="text-gray-300 text-xs">反転</span>
              <Toggle
                checked={value.hair.flip}
                onChange={(flip) => update({ hair: { ...value.hair, flip } })}
              />
            </div>
          </Section>

          <Section
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
              onChange={(offsetY) => update({ eyes: { ...value.eyes, offsetY } })}
            />
            <Slider
              label="左右の離れ"
              value={value.eyes.spacing}
              min={0}
              max={1}
              disabled={!value.eyes.enabled}
              onChange={(spacing) => update({ eyes: { ...value.eyes, spacing } })}
            />
          </Section>

          <Section
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
              onChange={(offsetY) => update({ mouth: { ...value.mouth, offsetY } })}
            />
            <Slider
              label="左右"
              value={value.mouth.offsetX}
              min={-1}
              max={1}
              disabled={!value.mouth.enabled}
              onChange={(offsetX) => update({ mouth: { ...value.mouth, offsetX } })}
            />
          </Section>

          <FacePaint
            value={value.facePaint}
            onChange={(facePaint) => update({ facePaint })}
          />
        </div>
      </div>
    </div>
  );
}
