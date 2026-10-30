"use client";

import React, { useState } from "react";

export interface OccurrencePoint {
  label: string;
  count: number;
}

export function OccurrencesChart({
  points24h,
  points7d,
}: {
  points24h: OccurrencePoint[];
  points7d: OccurrencePoint[];
}) {
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const data = range === "24h" ? points24h : points7d;

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const chartHeight = 120;
  const chartWidth = 560;
  const paddingX = 24;
  const barWidth = Math.max(4, Math.floor((chartWidth - paddingX * 2) / data.length) - 4);

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text">Occurrences Distribution</span>
        <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded border border-border text-[11px] font-mono">
          <button
            type="button"
            onClick={() => setRange("24h")}
            className={`px-2 py-0.5 rounded ${
              range === "24h" ? "bg-surface text-cyan font-bold" : "text-muted hover:text-text"
            }`}
          >
            Last 24h
          </button>
          <button
            type="button"
            onClick={() => setRange("7d")}
            className={`px-2 py-0.5 rounded ${
              range === "7d" ? "bg-surface text-cyan font-bold" : "text-muted hover:text-text"
            }`}
          >
            Last 7d
          </button>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="w-full bg-surface-2/40 border border-border rounded-md p-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`}
          className="w-full h-36 min-w-[320px]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={chartHeight}
            x2={chartWidth - paddingX}
            y2={chartHeight}
            stroke="#232734"
            strokeWidth="1"
          />
          <line
            x1={paddingX}
            y1={chartHeight / 2}
            x2={chartWidth - paddingX}
            y2={chartHeight / 2}
            stroke="#232734"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Bars */}
          {data.map((d, idx) => {
            const x =
              paddingX +
              idx * ((chartWidth - paddingX * 2) / data.length) +
              ((chartWidth - paddingX * 2) / data.length - barWidth) / 2;
            const barHeight = Math.max(3, (d.count / maxCount) * (chartHeight - 15));
            const y = chartHeight - barHeight;

            return (
              <g key={idx} className="group">
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="2"
                  fill={d.count > 0 ? "#00E5FF" : "#232734"}
                  className="transition-colors hover:fill-cyan"
                />
                {/* Value label on hover */}
                {d.count > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    fill="#E6E8EE"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {d.count}
                  </text>
                )}
                {/* X axis labels (sampled) */}
                {(idx % Math.ceil(data.length / 6) === 0 || idx === data.length - 1) && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 18}
                    textAnchor="middle"
                    fill="#8A90A2"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

