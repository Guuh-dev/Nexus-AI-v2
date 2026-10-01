import { NativeModule, requireNativeModule } from "expo";

declare class NexusWidgetModule extends NativeModule {
  journalSupported?(): Promise<boolean>;
  saveJournal?(id: string, text: string): Promise<void>;
  readJournal?(id: string): Promise<string | null>;
  deleteJournal?(id: string): Promise<void>;
  clearJournal?(): Promise<void>;
  pixelCompanionsSupported?(): Promise<boolean>;
  updateWidget(payload: string): Promise<void>;
  peekPendingActions(): Promise<string>;
  acknowledgePendingActions(actions: string): Promise<void>;
  listWidgetInstances(): Promise<string>;
  saveWidgetConfiguration(appWidgetId: number, configuration: string): Promise<void>;
}

export default requireNativeModule<NexusWidgetModule>("NexusWidget");
