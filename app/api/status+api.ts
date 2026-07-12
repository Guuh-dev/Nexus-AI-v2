import { FREE_ROUTER, PRIMARY_MODEL } from "@/constants/models";

export function GET(): Response {
  const paidFallback = process.env.OPENROUTER_ALLOW_PAID_FALLBACK === "true";
  return Response.json(
    {
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      primaryModel: FREE_ROUTER,
      fallback: paidFallback ? `${PRIMARY_MODEL} → plano local` : "plano local",
      apiVersion: "2.1.2",
      assistantAvailable: true,
      service: "nexus-ai-v2-1",
      capabilities: ["assistant", "professor", "roadmap", "planning", "local-fallback"],
      serverTime: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
