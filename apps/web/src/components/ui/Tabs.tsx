"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 border-b border-border overflow-x-auto ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              isActive
                ? "border-cyan text-text"
                : "border-transparent text-muted hover:text-text hover:border-border"
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                  isActive
                    ? "bg-cyan/15 text-cyan"
                    : "bg-surface-2 text-muted"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
