'use client';

import { useRef, useEffect } from 'react';
import { CharacterCounter } from '@/components/ui/CharacterCounter';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { MIN_DESCRIPTION_LENGTH, MAX_DESCRIPTION_LENGTH } from '@/lib/constants';
import styles from './DescriptionInput.module.css';

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
}

export function DescriptionInput({ value, onChange, error }: DescriptionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentLength = value.length;
  const hasError = !!error;

  useEffect(() => {
    if (error && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [error]);

  return (
    <div className={styles.root}>
      <label htmlFor="product-description" className={styles.label}>
        Describe your product
      </label>
      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          id="product-description"
          className={styles.textarea}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="I am designing a fintech app that helps users save money automatically..."
          rows={4}
          maxLength={MAX_DESCRIPTION_LENGTH}
          aria-invalid={hasError}
          aria-describedby={hasError ? 'description-error' : undefined}
        />
        <span className={styles.counter}>
          <CharacterCounter
            current={currentLength}
            min={MIN_DESCRIPTION_LENGTH}
            max={MAX_DESCRIPTION_LENGTH}
            hasError={hasError}
          />
        </span>
      </div>
      {error ? (
        <div id="description-error" role="alert">
          <ErrorMessage error={error} />
        </div>
      ) : null}
    </div>
  );
}
