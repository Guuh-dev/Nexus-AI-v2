import { NativeModule, requireNativeModule } from "expo";

declare class NexusWidgetModule extends NativeModule {
  updateWidget(payload: string): Promise<void>;
  peekPendingActions(): Promise<string>;
  acknowledgePendingActions(actions: string): Promise<void>;
  listWidgetInstances(): Promise<string>;
  saveWidgetConfiguration(appWidgetId: number, configuration: string): Promise<void>;
}

export default requireNativeModule<NexusWidgetModule>("NexusWidget");
