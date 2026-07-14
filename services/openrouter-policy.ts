/**
 * Production routing policy for personal context. Provider failover stays
 * enabled, but every eligible endpoint must deny data collection and support
 * zero data retention. Prices are capped in USD per million tokens.
 */
export function openRouterProviderPolicy(requireParameters: boolean) {
  return {
    sort: "throughput" as const,
    allowFallbacks: true,
    dataCollection: "deny" as const,
    zdr: true,
    maxPrice: {
      prompt: "0.15",
      completion: "0.55",
    },
    requireParameters,
  };
}
