import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
}

export function Input({
  label,
  helperText,
  errorText,
  id,
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className={`${styles.fieldWrapper} ${className}`}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`${styles.input} ${errorText ? styles.inputError : ''}`}
        aria-invalid={Boolean(errorText)}
        aria-describedby={errorText ? errorId : helperText ? helperId : undefined}
        {...rest}
      />
      {errorText ? (
        <p id={errorId} className={styles.errorMessage} role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{errorText}</span>
        </p>
      ) : (
        helperText && (
          <p id={helperId} className={styles.helperMessage}>
            {helperText}
          </p>
        )
      )}
    </div>
  );
}
