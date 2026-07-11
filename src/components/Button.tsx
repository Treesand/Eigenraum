import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "quiet" | "danger";
}

export function Button({ variant = "default", className, type, ...rest }: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? "button button-primary"
      : variant === "quiet"
        ? "button button-quiet"
        : variant === "danger"
          ? "button button-danger"
          : "button";

  return (
    <button
      type={type ?? "button"}
      className={className ? `${variantClass} ${className}` : variantClass}
      {...rest}
    />
  );
}
