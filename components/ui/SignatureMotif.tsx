import React from 'react';
import styles from './SignatureMotif.module.css';

interface SignatureMotifProps {
  index?: string;
  label: string;
  subtleText?: string;
}

export function SignatureMotif({ label, subtleText }: SignatureMotifProps) {
  return (
    <div className={styles.motifBar}>
      <div className={styles.titleGroup}>
        <span className={styles.accentBar} aria-hidden="true" />
        <h2 className={styles.labelText}>{label}</h2>
      </div>
      {subtleText && <span className={styles.subtleText}>{subtleText}</span>}
    </div>
  );
}
