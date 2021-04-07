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

export function toggleItem(item: any, list: any[], force?: boolean): any[] {
  if (force === true) return removeItem(item, list);
  if (force === false) return addOnce(item, list);
  if (list.includes(item)) return removeItem(item, list);
  return [...list, item];
}

export function addOnce(item: any, list: any[]): any[] {
  if (list.includes(item)) return list;
  return [...list, item];
}

export function removeItem(item: any, list: any[]): any[] {
  return list.filter((listItem) => listItem !== item);
}

export function loadScript(url: string): Promise<boolean> {
  const scriptEl = document.createElement("script");
  scriptEl.setAttribute("src", url);

  return new Promise((resolve, reject) => {
    scriptEl.addEventListener("load", () => resolve(true));
    scriptEl.addEventListener("error", reject);

    document.head.appendChild(scriptEl);
  });
}
