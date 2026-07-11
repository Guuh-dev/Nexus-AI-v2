package expo.modules.nexuswidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class NexusWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NexusWidget")

    AsyncFunction("updateWidget") { payload: String ->
      require(payload.toByteArray(Charsets.UTF_8).size <= 32_768) { "Widget payload is too large" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(NexusWidgetProvider.PAYLOAD_KEY, payload)
        .apply()

      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, NexusWidgetProvider::class.java)
      val widgetIds = manager.getAppWidgetIds(component)
      NexusWidgetProvider.updateWidgets(context, manager, widgetIds)
    }

    AsyncFunction("consumePendingActions") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val preferences = context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
      val actions = preferences.getString(NexusWidgetProvider.PENDING_ACTIONS_KEY, "[]") ?: "[]"
      preferences.edit().putString(NexusWidgetProvider.PENDING_ACTIONS_KEY, "[]").apply()
      actions
    }
  }
}
