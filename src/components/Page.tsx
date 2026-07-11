import type { ReactNode } from "react";

interface PageProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function Page({ title, subtitle, children }: PageProps) {
  return (
    <main className="page fade-in">
      {(title || subtitle) && (
        <header className="stack" style={{ gap: "var(--space-2)" }}>
          {title && <h1 className="page-title">{title}</h1>}
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </header>
      )}
      {children}
    </main>
  );
}
