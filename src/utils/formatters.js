/**
 * Purpose: Central place for UI formatting helpers used by multiple components.
 * Why: Keeping date/number formatting in one module prevents drift between pages.
 */

/**
 * Converts API date values into a readable local date.
 *
 * @param {string | null | undefined} dateValue
 * @returns {string}
 */
export function formatDate(dateValue) {
  if (!dateValue) {
    return 'N/A';
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return String(dateValue);
  }

  return date.toLocaleDateString();
}

/**
 * Normalizes optional numeric stats for consistent UI output.
 *
 * @param {number | string | null | undefined} value
 * @returns {string}
 */
export function formatStatValue(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return value.toLocaleString();
    }

    return value.toFixed(2);
  }

  return String(value);
}

/**
 * Converts machine style values to human-readable title case.
 *
 * @param {string | null | undefined} value
 * @returns {string}
 */
export function toTitleCase(value) {
  return String(value || '')
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
