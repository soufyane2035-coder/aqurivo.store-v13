'use client';

import React, { useState } from 'react';
import styles from './ProductPage.module.css';
import { recordVisitorInteraction } from '@/lib/productSearch';

interface BuyNowButtonProps {
  href: string;
  label: string;
  variant?: 'primary' | 'sticky';
  productId: string;
  categorySlug: string;
}

export function BuyNowButton({
  href,
  label,
  variant = 'primary',
  productId,
  categorySlug,
}: BuyNowButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const triggerPressFeedback = () => {
    setIsPressed(true);
    window.setTimeout(() => {
      setIsPressed(false);
    }, 280);
  };

  const recordPurchaseIntent = () => {
    recordVisitorInteraction({
      productId,
      categorySlug,
      action: 'outbound',
    });
  };

  const baseClass =
    variant === 'sticky' ? styles.stickyButton : styles.buyNowBtn;
  const pressedClass =
    variant === 'sticky'
      ? styles.stickyButtonPressed
      : styles.buyNowBtnPressed;

  return (
    <a
      href={href}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className={`${baseClass} ${isPressed ? pressedClass : ''}`}
      onClick={() => {
        triggerPressFeedback();
        recordPurchaseIntent();
      }}
      onMouseDown={triggerPressFeedback}
      onTouchStart={triggerPressFeedback}
    >
      <span>{label}</span>
    </a>
  );
}
