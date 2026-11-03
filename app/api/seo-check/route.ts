/**
 * App route so `vinext start` serves the same handler as the Vercel
 * function at api/seo-check.ts. The static export does not replace that
 * function; both call handleSeoCheckRequest.
 */
export { OPTIONS, POST } from "../../../api/seo-check";
