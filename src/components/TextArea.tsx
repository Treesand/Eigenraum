import { useId, type TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
}

export function TextArea({ label, hint, id, ...rest }: TextAreaProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <div>
      <label className="field-label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea className="textarea" id={fieldId} {...rest} />
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}
