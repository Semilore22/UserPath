'use client';

import { type SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  filled?: boolean;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  filled = false,
  className,
  id,
  value,
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const rootClassName = [styles.root, className].filter(Boolean).join(' ');
  const selectClassName = [styles.select, filled ? styles.filled : ''].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      {label ? (
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <div className={styles.wrapper}>
        <select
          id={selectId}
          className={selectClassName}
          aria-invalid={!!error}
          value={value}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
