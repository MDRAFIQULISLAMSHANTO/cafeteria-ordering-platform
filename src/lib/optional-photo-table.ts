/** Photo storage can lag behind an app deployment. Only tolerate that missing table. */
export function isMissingPhotoTable(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const cause = current as { code?: string; message?: string; cause?: unknown };
    if (cause.code === "42P01" && /relation "(?:public\.)?product_photo" does not exist/.test(cause.message ?? "")) return true;
    current = cause.cause;
  }
  return false;
}

export async function readOptionalPhotos<T>(read: () => Promise<T[]>) : Promise<T[]> {
  try {
    return await read();
  } catch (error) {
    if (!isMissingPhotoTable(error)) throw error;
    console.warn("Menu photo storage is unavailable: apply database migration 0003_menu_photos. Using bundled images.");
    return [];
  }
}
