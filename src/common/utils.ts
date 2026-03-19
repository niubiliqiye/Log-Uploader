export function maskValue(value: unknown): string {
  if (typeof value === 'string') {
    if (value.length <= 6) return '***';
    return `${value.slice(0, 3)}***${value.slice(-2)}`;
  }

  return '***';
}

export function deepRedact(input: unknown, redactFields: string[] = []): unknown {
  if (input === null || input === undefined) return input;

  if (Array.isArray(input)) {
    return input.map((item) => deepRedact(item, redactFields));
  }

  if (typeof input !== 'object') {
    return input;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const shouldRedact = redactFields.some((field) => field.toLowerCase() === key.toLowerCase());

    result[key] = shouldRedact ? maskValue(value) : deepRedact(value, redactFields);
  }

  return result;
}
