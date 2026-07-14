const NexusWidgetModule = {
  async updateWidget(): Promise<void> {
    // Android home-screen widgets do not exist on web.
  },
  async peekPendingActions(): Promise<string> {
    return "[]";
  },
  async acknowledgePendingActions(): Promise<void> {
    // Android home-screen widgets do not exist on web.
  },
  async listWidgetInstances(): Promise<string> {
    return "[]";
  },
  async saveWidgetConfiguration(): Promise<void> {
    // Android home-screen widgets do not exist on web.
  },
};

export default NexusWidgetModule;
