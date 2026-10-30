import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-text">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-9 w-full rounded-md bg-surface border px-3 text-sm text-text placeholder:text-muted/60 transition-colors focus:border-cyan focus:outline-none glow-focus ${
            error ? "border-critical focus:border-critical" : "border-border"
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-critical">{error}</span>}
        {helperText && !error && <span className="text-xs text-muted">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
