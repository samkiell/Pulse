import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "secondary",
      size = "md",
      isLoading = false,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    let sizeStyle = "h-9 px-4 text-sm";
    if (size === "sm") sizeStyle = "h-7 px-2.5 text-xs";
    if (size === "lg") sizeStyle = "h-11 px-6 text-base";

    let variantStyle = "bg-surface-2 hover:bg-border text-text border border-border";

    if (variant === "primary") {
      variantStyle =
        "bg-gradient-to-r from-cyan to-violet text-bg font-semibold border-none glow-primary hover:opacity-95";
    } else if (variant === "ghost") {
      variantStyle = "bg-transparent hover:bg-surface-2 text-muted hover:text-text border-none";
    } else if (variant === "danger") {
      variantStyle =
        "bg-critical/10 hover:bg-critical/20 text-critical border border-critical/30";
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none glow-focus ${sizeStyle} ${variantStyle} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

