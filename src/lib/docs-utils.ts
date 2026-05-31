type RandomValuesSource = {
  getRandomValues(values: Uint32Array): Uint32Array;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function generateDocId(randomSource: RandomValuesSource = crypto): string {
  const buf = new Uint32Array(1);
  randomSource.getRandomValues(buf);
  const suffix = (10000000 + (buf[0] % 90000000)).toString();
  return `DOC-${suffix}`;
}

export function stripUndefinedFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedFields(item))
      .filter((item) => item !== undefined) as T;
  }

  if (!isPlainObject(value)) return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) => {
      if (nested === undefined) return [];
      return [[key, stripUndefinedFields(nested)]];
    }),
  ) as T;
}
