import { type InputHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";

interface FieldWrapperProps {
  label: string;
  children: ReactNode;
}

function FieldWrapper({ label, children }: FieldWrapperProps) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputBase =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3.5 py-2.5 text-sm placeholder:text-[var(--color-muted-2)] focus:border-[var(--color-ink)] outline-none transition-colors";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

export function TextField({ label, className, ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label}>
      <input className={`${inputBase} ${className ?? ""}`} {...props} />
    </FieldWrapper>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
};

export function SelectField({ label, className, children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label}>
      <select className={`${inputBase} ${className ?? ""}`} {...props}>
        {children}
      </select>
    </FieldWrapper>
  );
}
