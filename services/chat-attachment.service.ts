import { Platform } from "react-native";
import { CHAT_TEXT_FILE_MAX_BYTES, textAttachmentDraft } from "@/features/assistant/text-attachment";

/** Selection is local. The user reviews the draft and presses Send separately. */
export async function pickChatTextAttachment(existing: string): Promise<string | null> {
  const DocumentPicker = await import("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const FileSystem = Platform.OS === "web" ? undefined : await import("expo-file-system/legacy");
  try {
    const info = asset.size === undefined && FileSystem ? await FileSystem.getInfoAsync(asset.uri) : undefined;
    const size = asset.size ?? (info?.exists ? info.size : asset.file?.size);
    if (size === undefined || size > CHAT_TEXT_FILE_MAX_BYTES) throw new Error("Escolha um arquivo de texto com tamanho conhecido de até 3 KB.");
    const text = Platform.OS === "web" && asset.file
      ? await asset.file.text()
      : await FileSystem!.readAsStringAsync(asset.uri, { encoding: FileSystem!.EncodingType.UTF8 });
    return textAttachmentDraft(asset.name, text, existing);
  } finally {
    // Our picker copy only; never remove the user's original document.
    if (FileSystem && asset.uri.startsWith(FileSystem.cacheDirectory ?? "invalid-cache:")) await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
  }
}
