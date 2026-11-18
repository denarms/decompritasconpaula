import React from 'react';

/**
 * Sanitizes numeric input on mobile and desktop keyboards.
 * - Strips characters that are not digits or decimal points.
 * - Automatically removes leading zeros when typing integers (e.g., "0100" -> "100", "045654" -> "45654").
 * - If treatSingleZeroAsEmpty is true, a lone "0" is automatically converted to "" so it never gets stuck on mobile.
 * - Preserves decimals like "0.50" or "0.".
 * - Allows full deletion (empty string "") without forcing a 0 back into the input.
 */
export const sanitizeNumberInput = (
  value: string,
  allowDecimals = true,
  treatSingleZeroAsEmpty = false
): string => {
  if (!value) return '';

  // Replace comma with period for international/mobile keyboards
  let clean = value.replace(/,/g, '.');

  if (allowDecimals) {
    // Only digits and dots
    clean = clean.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) {
      clean = parts[0] + '.' + parts.slice(1).join('');
    }
  } else {
    // Only integer digits
    clean = clean.replace(/[^0-9]/g, '');
  }

  // If user entered e.g. "0100", "0200", "045654", strip the leading zeros:
  if (/^0+[1-9]/.test(clean)) {
    clean = clean.replace(/^0+/, '');
  } else if (/^0{2,}$/.test(clean)) {
    // Collapse "00", "000" into a single "0"
    clean = '0';
  }

  if (treatSingleZeroAsEmpty && clean === '0') {
    return '';
  }

  return clean;
};

/**
 * Helper to auto-select the entire field on mobile when tapped.
 * Uses a small timeout so Android and iOS touch release don't undo the selection.
 */
export const handleSelectOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  const target = e.currentTarget;
  setTimeout(() => {
    try {
      target.select();
    } catch {
      // Ignore if unmounted
    }
  }, 60);
};
