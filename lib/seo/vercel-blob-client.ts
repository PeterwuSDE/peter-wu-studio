import { del, get, list, put } from "@vercel/blob";
import type { PrivateBlobClient } from "./blob-inquiry-store.ts";

const LIST_CAP = 500;

/**
 * Private Vercel Blob adapter. Lead JSON is unreadable without the store token.
 * Create the store as private on the existing Vercel project; do not upload
 * inquiries to a public store.
 */
export function createVercelBlobClient(): PrivateBlobClient {
  return {
    async put(pathname, body, { allowOverwrite }) {
      await put(pathname, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite,
        contentType: "application/json",
        cacheControlMaxAge: 60,
      });
    },
    async get(pathname) {
      const result = await get(pathname, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return new Response(result.stream).text();
    },
    async del(pathname) {
      await del(pathname);
    },
    async list(prefix) {
      const pathnames: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const blob of page.blobs) pathnames.push(blob.pathname);
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor && pathnames.length < LIST_CAP);
      return pathnames.slice(0, LIST_CAP);
    },
  };
}
