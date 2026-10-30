"use client";

import React, { useEffect } from "react";
import { Button } from "./Button";

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  confirmVariant = "danger",
  onConfirm,
  onCancel,
  isLoading = false,
  confirmMatchText,
  matchValue,
  onMatchValueChange,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  confirmMatchText?: string;
  matchValue?: string;
  onMatchValueChange?: (val: string) => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isMatchValid = confirmMatchText
    ? matchValue?.trim() === confirmMatchText.trim()
    : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-lg max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
        <div>
          <h3 className="text-base font-semibold text-text">{title}</h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">{description}</p>
        </div>

        {confirmMatchText && (
          <div className="flex flex-col gap-1.5 my-1">
            <span className="text-xs text-muted">
              Please type <code className="text-text font-mono font-bold bg-surface-2 px-1.5 py-0.5 rounded">{confirmMatchText}</code> to confirm:
            </span>
            <input
              type="text"
              value={matchValue || ""}
              onChange={(e) => onMatchValueChange?.(e.target.value)}
              placeholder={confirmMatchText}
              className="h-9 w-full rounded-md bg-surface-2 border border-border px-3 text-sm text-text focus:border-cyan focus:outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={!isMatchValid}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
