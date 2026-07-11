interface ChoiceChipsProps<T extends string> {
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T | null) => void;
  allowDeselect?: boolean;
  ariaLabel: string;
}

export function ChoiceChips<T extends string>({
  options,
  labels,
  value,
  onChange,
  allowDeselect = false,
  ariaLabel,
}: ChoiceChipsProps<T>) {
  return (
    <div className="choice-chips" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            className="choice-chip"
            aria-pressed={selected}
            onClick={() => {
              if (selected && allowDeselect) {
                onChange(null);
              } else {
                onChange(option);
              }
            }}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
