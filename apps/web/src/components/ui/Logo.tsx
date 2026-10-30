import React from "react";

export function Logo({ className = "w-6 h-6", textClassName = "text-base font-bold" }: { className?: string; textClassName?: string }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id="pulse-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="100%" stopColor="#6A11FF" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="#12141A" stroke="#232734" strokeWidth="1" />
        <path
          d="M4 16h6l2.5-7 4 15 3.5-11 2 4.5 2-1.5h6"
          stroke="url(#pulse-grad)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {textClassName && (
        <span className={`tracking-tight ${textClassName}`}>
          <span className="text-text font-bold">Pulse</span>
        </span>
      )}
    </div>
  );
}

export function FaviconSvg() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#6A11FF" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0B0C10" />
      <path
        d="M4 16h6l2.5-7 4 15 3.5-11 2 4.5 2-1.5h6"
        stroke="url(#g)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
