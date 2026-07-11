const { withAndroidManifest } = require("expo/config-plugins");

const PROVIDER = "expo.modules.nexuswidget.NexusWidgetProvider";
const CONFIGURE_ACTIVITY = "expo.modules.nexuswidget.NexusWidgetConfigureActivity";

module.exports = function withNexusWidget(config) {
  return withAndroidManifest(config, (configWithManifest) => {
    const application = configWithManifest.modResults.manifest.application?.[0];
    if (!application) throw new Error("Nexus widget: Android application manifest not found");
    application.$ = application.$ ?? {};
    application.$["android:allowBackup"] = "false";
    application.receiver = application.receiver ?? [];
    application.activity = application.activity ?? [];
    if (!application.activity.some((activity) => activity.$?.["android:name"] === CONFIGURE_ACTIVITY)) {
      application.activity.push({
        $: {
          "android:name": CONFIGURE_ACTIVITY,
          "android:exported": "true",
          "android:theme": "@android:style/Theme.Material.NoActionBar",
        },
        "intent-filter": [{ action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_CONFIGURE" } }] }],
      });
    }
    const mainActivity = application.activity.find((activity) => {
      const name = activity.$?.["android:name"] ?? "";
      return name === ".MainActivity" || name.endsWith(".MainActivity");
    });
    if (mainActivity) {
      mainActivity["meta-data"] = mainActivity["meta-data"] ?? [];
      if (!mainActivity["meta-data"].some((item) => item.$?.["android:name"] === "android.app.shortcuts")) {
        mainActivity["meta-data"].push({ $: { "android:name": "android.app.shortcuts", "android:resource": "@xml/nexus_shortcuts" } });
      }
    }
    const exists = application.receiver.some((receiver) => receiver.$?.["android:name"] === PROVIDER);
    if (!exists) {
      application.receiver.push({
        $: {
          "android:name": PROVIDER,
          "android:exported": "true",
          "android:label": "@string/nexus_widget_name",
        },
        "intent-filter": [
          {
            action: [
              { $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.appwidget.provider",
              "android:resource": "@xml/nexus_widget_info",
            },
          },
        ],
      });
    }
    return configWithManifest;
  });
};
