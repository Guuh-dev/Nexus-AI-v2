import { NativeModule, requireNativeModule } from "expo";

declare class NexusWidgetModule extends NativeModule {
  updateWidget(payload: string): Promise<void>;
  consumePendingActions(): Promise<string>;
}

export default requireNativeModule<NexusWidgetModule>("NexusWidget");
