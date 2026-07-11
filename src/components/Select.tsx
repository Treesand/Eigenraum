import { useId } from "react";

interface SelectOption<T extends string> {
  id: T;
  label: string;
  description?: string;
}

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  hint?: string;
  testId?: string;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  testId,
}: SelectProps<T>) {
  const id = useId();
  const selected = options.find((option) => option.id === value);

  return (
    <div>
      <div className="settings-row" style={{ borderBottom: "none", padding: 0 }}>
        <label className="field-label" htmlFor={id} style={{ marginBottom: 0 }}>
          {label}
        </label>
        <select
          id={id}
          className="select"
          value={value}
          data-testid={testId}
          onChange={(event) => {
            const next = event.target.value as T;
            if (options.some((option) => option.id === next)) {
              onChange(next);
            }
          }}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {(selected?.description ?? hint) && (
        <p className="field-hint">{selected?.description ?? hint}</p>
      )}
    </div>
  );
}
