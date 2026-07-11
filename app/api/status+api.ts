import { FREE_ROUTER, PRIMARY_MODEL } from "@/constants/models";

export function GET(): Response {
  return Response.json(
    {
      configured: Boolean(process.env.OPENROUTER_API_KEY),
      primaryModel: FREE_ROUTER,
      fallback: process.env.OPENROUTER_ALLOW_PAID_FALLBACK === "true" ? `${PRIMARY_MODEL} → plano local` : "plano local",
      apiVersion: "2.1",
      assistantAvailable: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
