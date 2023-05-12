/**
 * Create template string
 *
 * @param template
 * @param context
 * @returns
 */
export function createTemplateString(template: string, context: Record<string, unknown>): string {
  return Object.keys(context).reduce((accumulator, contextParamKey) => {
    const interpolationRegex = new RegExp(`\\$\\{${contextParamKey}}`, 'g');

    return accumulator.replace(interpolationRegex, context[contextParamKey].toString());
  }, template);
}

/**
 * Convert value to boolean, number or string value
 *
 * @param value
 * @returns
 */
export function coerce(value: string): string | number | boolean {
  if (_isBoolean(value)) {
    return value === 'true';
  }

  if (_isNumeric(value)) {
    return parseFloat(value);
  }

  return value;
}

/**
 * Check if value is a number
 *
 * @param value
 * @returns
 * @private
 */
function _isNumeric(value: string): boolean {
  return !isNaN(+value) && !isNaN(parseFloat(value));
}

/**
 * Check if value is a boolean
 *
 * @param value
 * @returns
 * @private
 */
function _isBoolean(value: string): boolean {
  return value === 'true' || value === 'false';
}
