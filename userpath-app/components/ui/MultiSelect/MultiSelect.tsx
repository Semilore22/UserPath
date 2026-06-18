'use client';

import { type HTMLAttributes } from 'react';
import styles from './MultiSelect.module.css';

interface MultiSelectProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onValuesChange: (values: string[]) => void;
}

export function MultiSelect({
  label,
  hint,
  error,
  options,
  values,
  onValuesChange,
  className,
  ...props
}: MultiSelectProps) {
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');

  const toggleValue = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value));
    } else {
      onValuesChange([...values, value]);
    }
  };

  return (
    <div className={rootClassName} {...props}>
      {label || hint ? (
        <div className={styles.labelRow}>
          {label ? <span className={styles.label}>{label}</span> : null}
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </div>
      ) : null}
      <div className={styles.options} role="group" aria-label={label}>
        {options.map((opt) => {
          const isSelected = values.includes(opt.value);
          const optionClassName = [
            styles.option,
            isSelected ? styles.selected : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={opt.value}
              type="button"
              className={optionClassName}
              onClick={() => toggleValue(opt.value)}
              aria-pressed={isSelected}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
