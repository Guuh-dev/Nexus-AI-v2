import Constants from "expo-constants";
import * as Updates from "expo-updates";

export type NexusUpdateInfo = {
  enabled: boolean;
  nativeVersion: string;
  runtimeVersion: string;
  channel: string;
  updateId: string;
  createdAt: string | null;
  isEmbedded: boolean;
  emergencyLaunch: boolean;
};

export type NexusUpdateCheck = {
  available: boolean;
  rollbackAvailable: boolean;
  info: NexusUpdateInfo;
};

function compactUpdateId(value: string | null): string {
  return value ? value.slice(0, 8) : "embutida";
}

export function getNexusUpdateInfo(): NexusUpdateInfo {
  return {
    enabled: Updates.isEnabled,
    nativeVersion: Constants.expoConfig?.version ?? "desconhecida",
    runtimeVersion: Updates.runtimeVersion ?? Constants.expoRuntimeVersion ?? "não configurado",
    channel: Updates.channel ?? "desenvolvimento",
    updateId: compactUpdateId(Updates.updateId),
    createdAt: Updates.createdAt?.toISOString() ?? null,
    isEmbedded: Updates.isEmbeddedLaunch,
    emergencyLaunch: Updates.isEmergencyLaunch,
  };
}

export async function checkForNexusUpdate(): Promise<NexusUpdateCheck> {
  const info = getNexusUpdateInfo();
  if (!info.enabled) return { available: false, rollbackAvailable: false, info };

  const result = await Updates.checkForUpdateAsync();
  return {
    available: result.isAvailable,
    rollbackAvailable: result.isRollBackToEmbedded,
    info,
  };
}

export async function applyNexusUpdate(): Promise<"updated" | "rollback" | "unchanged"> {
  if (!Updates.isEnabled) return "unchanged";
  const result = await Updates.fetchUpdateAsync();
  if (result.isRollBackToEmbedded) {
    await Updates.reloadAsync();
    return "rollback";
  }
  if (!result.isNew) return "unchanged";
  await Updates.reloadAsync();
  return "updated";
}
