const NexusWidgetModule = {
  async updateWidget(): Promise<void> {
    // Android home-screen widgets do not exist on web.
  },
  async consumePendingActions(): Promise<string> {
    return "[]";
  },
};

export default NexusWidgetModule;
