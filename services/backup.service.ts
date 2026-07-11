import { Platform } from "react-native";

export async function shareBackupJson(json: string): Promise<void> {
  if (Platform.OS === "web") {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    return;
  }
  const FileSystem = await import("expo-file-system/legacy");
  const Sharing = await import("expo-sharing");
  const path = `${FileSystem.cacheDirectory}nexus-backup-${new Date().toISOString().slice(0, 10)}.json`;
  await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Compartilhamento indisponível");
  await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Exportar backup do Nexus" });
}

export async function pickBackupJson(): Promise<string | null> {
  const DocumentPicker = await import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 5_000_000) throw new Error("O backup ultrapassa o limite de 5 MB.");
  if (Platform.OS === "web" && asset.file) return asset.file.text();
  const FileSystem = await import("expo-file-system/legacy");
  return FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.UTF8 });
}
