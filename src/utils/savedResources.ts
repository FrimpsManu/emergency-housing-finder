export type SavedResource = {
  id: string;
  name: string;
  city: string;
  state: string;
};

const KEY = "ehf_saved_resources";

export function getSaved(): SavedResource[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedResource[];
  } catch {
    return [];
  }
}

export function isSaved(id: string): boolean {
  return getSaved().some((r) => r.id === id);
}

export function saveResource(resource: SavedResource) {
  const current = getSaved();
  if (current.some((r) => r.id === resource.id)) return;
  localStorage.setItem(KEY, JSON.stringify([resource, ...current]));
}

export function removeResource(id: string) {
  const next = getSaved().filter((r) => r.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
}
