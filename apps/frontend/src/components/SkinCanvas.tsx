"use client";

import { useRef, useState, useEffect } from "react";

interface SkinCanvasProps {
  onSave: (dataUrl: string) => void;
  initialSkin?: string | null;
}

const CANVAS_SIZE = 128;

export function SkinCanvas({ onSave, initialSkin }: SkinCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const [initialized, setInitialized] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (initialized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (initialSkin) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setInitialized(true);
      };
      img.src = initialSkin;
    } else {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      setInitialized(true);
    }
  }, [initialSkin, initialized]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDirty(true);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    setIsDirty(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onSave(dataUrl);
    setIsDirty(false);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <h2 className="text-lg font-bold text-white mb-3 text-center">
        🎨 顔を描こう
        {isDirty && <span className="text-yellow-400 text-sm ml-2">*未保存</span>}
      </h2>
      
      <div className="flex justify-center mb-3">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="border-4 border-gray-600 rounded-lg cursor-crosshair bg-white"
          style={{ width: 200, height: 200, touchAction: "none" }}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseMove={draw}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
        />
      </div>

      <div className="mb-3 flex items-center justify-center gap-2">
        <label className="text-gray-300 text-sm">カラー:</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border-0"
        />
      </div>

      <div className="mb-3">
        <label className="text-gray-300 text-xs mb-1 block text-center">
          ブラシ: {brushSize}px
        </label>
        <input
          type="range"
          min="2"
          max="20"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={clearCanvas}
          className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
        >
          クリア
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
        >
          保存
        </button>
      </div>
    </div>
  );
}
