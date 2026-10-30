"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeProps {
  text: string;
  size?: number;
  className?: string;
}

export function QRCodeView({ text, size = 150, className = "" }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !text) return;

    QRCode.toCanvas(canvasRef.current, text, {
      width: size,
      margin: 1,
      color: {
        dark: "#FFFFFF",
        light: "#00000000",
      },
    }).catch((err: any) => {
      console.error("[QRCodeView] render error:", err);
    });
  }, [text, size]);

  return (
    <div
      className={`p-2 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size + 16, height: size + 16 }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
