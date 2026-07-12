import { useEffect } from "react";
import { router } from "expo-router";
import { LoadingPlan } from "@/components/LoadingPlan";
import { Screen } from "@/components/ui/Screen";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { useNexus } from "@/providers/NexusProvider";

export { RouteErrorBoundary as ErrorBoundary };

export default function LoadingPlanRoute() {
  const {
    planGenerating,
    planGenerationError,
    data,
    cancelPlanGeneration,
    retryPlanGeneration,
    recoverPlanLocally,
  } = useNexus();

  useEffect(() => {
    if (!planGenerating && data.onboardingCompleted && data.activePlan) {
      router.replace(data.learning.pendingTopics.length ? "/professor-intake" : "/(tabs)/today");
    }
  }, [data.activePlan, data.learning.pendingTopics.length, data.onboardingCompleted, planGenerating]);

  return (
    <Screen scroll={false} padded={false} keyboardAware={false}>
      <LoadingPlan
        error={planGenerationError}
        generating={planGenerating}
        onRetry={() => void retryPlanGeneration()}
        onUseLocal={recoverPlanLocally}
        onCancel={() => {
          cancelPlanGeneration();
          router.replace(data.onboardingCompleted ? "/(tabs)/today" : "/onboarding");
        }}
      />
    </Screen>
  );
}
