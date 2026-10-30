"use client";

import React, { useEffect, useState } from "react";

export function formatRelativeTime(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek}w ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RelativeTime({
  date,
  className = "",
}: {
  date: Date | string | number | null | undefined;
  className?: string;
}) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    if (!date) return;
    setFormatted(formatRelativeTime(date));
    const interval = setInterval(() => {
      setFormatted(formatRelativeTime(date));
    }, 30000);
    return () => clearInterval(interval);
  }, [date]);

  if (!date) return <span className={className}>-</span>;

  return (
    <span
      className={className}
      title={new Date(date).toLocaleString()}
    >
      {formatted || formatRelativeTime(date)}
    </span>
  );
}
