import { vercelSeoHandler, type NodeIncomingMessage, type NodeServerResponse } from "../lib/seo/vercel-handler.ts";

export default function handler(req: NodeIncomingMessage, res: NodeServerResponse) {
  return vercelSeoHandler(req, res);
}
