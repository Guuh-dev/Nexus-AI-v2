import { Platform } from "react-native";
let epoch = 0;
let queue: Promise<void> = Promise.resolve();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const task = queue.then(work);
  queue = task.then(() => undefined, () => undefined);
  return task;
}
async function bridge() {
  if (Platform.OS !== "android") throw new Error("O diário protegido fica disponível no aplicativo Android atualizado.");
  const module = (await import("@/modules/nexus-widget/src/NexusWidgetModule")).default;
  if (!await module.journalSupported?.()) throw new Error("Atualize o aplicativo Android para usar o diário protegido.");
  return module;
}
export async function journalSupported(): Promise<boolean> { try { await bridge(); return true; } catch { return false; } }
export function saveJournal(id: string, text: string): Promise<void> {
  const expected = epoch;
  return enqueue(async () => {
    if (expected !== epoch) throw new Error("O diário foi substituído. Reabra o registro antes de continuar.");
    const module = await bridge();
    if (expected !== epoch) throw new Error("O diário foi substituído. Reabra o registro antes de continuar.");
    if (!module.saveJournal) throw new Error("Diário indisponível.");
    await module.saveJournal(id, text);
  });
}
export function readJournal(id: string): Promise<string | null> { return enqueue(async () => { const module = await bridge(); if (!module.readJournal) throw new Error("Diário indisponível."); return module.readJournal(id); }); }
export function deleteJournal(id: string): Promise<void> { return enqueue(async () => { const module = await bridge(); if (!module.deleteJournal) throw new Error("Diário indisponível."); await module.deleteJournal(id); }); }
export function clearJournalIfSupported(): Promise<void> {
  epoch++;
  return enqueue(async () => {
    if (Platform.OS !== "android") return;
    const module = (await import("@/modules/nexus-widget/src/NexusWidgetModule")).default;
    if (!module.journalSupported || !await module.journalSupported()) return;
    if (!module.clearJournal) throw new Error("Não foi possível limpar o diário protegido.");
    await module.clearJournal();
  });
}
