export function containsDuplicate(values: number[]): boolean {
  return values.some(
    (width, _i, arr) => arr.filter((val) => val === width).length > 1
  );
}

export function isEmpty(collection: Record<string, unknown>): boolean {
  return !collection || Object.keys(collection).length === 0;
}

export const URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()!@:%_+.~#?&//=]*)/;

export function randomId(length = 6) {
  return Math.random().toString(36).substr(3, length);
}