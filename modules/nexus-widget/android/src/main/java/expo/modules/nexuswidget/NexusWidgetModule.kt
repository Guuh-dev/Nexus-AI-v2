package expo.modules.nexuswidget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

class NexusWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NexusWidget")

    AsyncFunction("updateWidget") { payload: String ->
      require(payload.toByteArray(Charsets.UTF_8).size <= 32_768) { "Widget payload is too large" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val parsed = JSONObject(payload)
      require(parsed.optInt("schemaVersion", 0) in 0..3) { "Unsupported widget payload version" }
      synchronized(NexusWidgetProvider::class.java) {
        context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
          .edit()
          .putString(NexusWidgetProvider.PAYLOAD_KEY, payload)
          .apply()
      }

      NexusWidgetProvider.updateAllWidgetFamilies(context)
    }

    AsyncFunction("listWidgetInstances") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val manager = AppWidgetManager.getInstance(context)
      val preferences = context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
      val result = JSONArray()
      widgetProviders().forEach { (provider, family) ->
        manager.getAppWidgetIds(ComponentName(context, provider)).forEach { widgetId ->
          val raw = preferences.getString("instance_$widgetId", null)
          result.put(
            JSONObject()
              .put("appWidgetId", widgetId)
              .put("family", family)
              .put("configured", !raw.isNullOrBlank())
              .apply {
                if (!raw.isNullOrBlank()) {
                  try { put("config", JSONObject(raw)) } catch (_: Exception) { /* Legacy corruption stays isolated. */ }
                }
              },
          )
        }
      }
      result.toString()
    }

    AsyncFunction("saveWidgetConfiguration") { appWidgetId: Int, configuration: String ->
      require(appWidgetId > AppWidgetManager.INVALID_APPWIDGET_ID) { "Invalid appWidgetId" }
      require(configuration.toByteArray(Charsets.UTF_8).size <= 8_192) { "Widget configuration is too large" }
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      val manager = AppWidgetManager.getInstance(context)
      val info = manager.getAppWidgetInfo(appWidgetId) ?: throw IllegalArgumentException("Widget instance not found")
      val actual = widgetProviders().firstOrNull { it.first.name == info.provider.className }
        ?: throw IllegalArgumentException("Widget instance does not belong to Nexus")
      val family = actual.second
      val raw = JSONObject(configuration)
      val sanitized = sanitizeConfiguration(raw, family)
      synchronized(NexusWidgetProvider::class.java) {
        val persisted = context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
          .edit()
          .putString("instance_$appWidgetId", sanitized.toString())
          .commit()
        check(persisted) { "Could not persist widget configuration" }
      }
      NexusWidgetProvider.updateAllWidgetFamilies(context)
    }

    AsyncFunction("peekPendingActions") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      synchronized(NexusWidgetProvider::class.java) {
        val preferences = context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
        preferences.getString(NexusWidgetProvider.PENDING_ACTIONS_KEY, "[]") ?: "[]"
      }
    }

    AsyncFunction("acknowledgePendingActions") { acknowledgedRaw: String ->
      require(acknowledgedRaw.toByteArray(Charsets.UTF_8).size <= 32_768) {
        "Widget action acknowledgement is too large"
      }
      val acknowledged = JSONArray(acknowledgedRaw)
      val identities = mutableSetOf<String>()
      for (index in 0 until acknowledged.length()) {
        acknowledged.optJSONObject(index)?.let { identities.add(actionIdentity(it)) }
      }
      if (identities.isEmpty()) return@AsyncFunction

      val context = appContext.reactContext ?: throw IllegalStateException("React context unavailable")
      synchronized(NexusWidgetProvider::class.java) {
        val preferences = context.getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, Context.MODE_PRIVATE)
        val pending = try {
          JSONArray(preferences.getString(NexusWidgetProvider.PENDING_ACTIONS_KEY, "[]"))
        } catch (_: Exception) {
          JSONArray()
        }
        val remaining = JSONArray()
        for (index in 0 until pending.length()) {
          val action = pending.optJSONObject(index) ?: continue
          if (actionIdentity(action) !in identities) remaining.put(action)
        }
        val persisted = preferences.edit()
          .putString(NexusWidgetProvider.PENDING_ACTIONS_KEY, remaining.toString())
          .commit()
        check(persisted) { "Could not acknowledge widget actions" }
      }
    }
  }

  private fun widgetProviders(): List<Pair<Class<out NexusWidgetProvider>, String>> = listOf(
    NexusMiniWidgetProvider::class.java to "mini",
    NexusStripWidgetProvider::class.java to "strip",
    NexusCompanionWidgetProvider::class.java to "companion",
    NexusMissionWidgetProvider::class.java to "mission",
    NexusWidgetProvider::class.java to "command",
  )

  private fun actionIdentity(action: JSONObject): String {
    val id = action.optString("id")
    if (id.isNotBlank()) return "id:$id"
    return listOf(
      action.optString("type"),
      action.optString("taskId"),
      action.optBoolean("completed", false).toString(),
      action.optString("createdAt"),
    ).joinToString("|")
  }

  private fun sanitizeConfiguration(raw: JSONObject, family: String): JSONObject {
    val styles = setOf("nexus", "amoled", "transparent", "pixel", "minimal")
    val mascots = setOf("nexus", "atlas", "nova", "byte", "pulse", "orbit", "ember")
    val personalities = setOf("happy", "playful", "motivational", "serious", "strict", "calm", "quiet")
    val speeches = setOf("contextual", "silent")
    val tapActions = setOf("today", "brain", "focus", "progress")
    val contentByFamily = mapOf(
      "mini" to setOf("streak", "xp"),
      "strip" to setOf("nextAction", "progress"),
      "companion" to setOf("companion"),
      "mission" to setOf("mission", "tasks"),
      "command" to setOf("command", "focus"),
    )
    val defaultContent = mapOf(
      "mini" to "streak",
      "strip" to "nextAction",
      "companion" to "companion",
      "mission" to "mission",
      "command" to "command",
    )
    val legacyPrivateMode = raw.optString("style") == "privacy" || raw.optString("content") == "private"
    val style = when (raw.optString("style", "nexus")) {
      "gamer" -> "pixel"
      "privacy", "light" -> "minimal"
      else -> raw.optString("style", "nexus").takeIf(styles::contains) ?: "nexus"
    }
    val opacityRaw = raw.optDouble("opacityPercent", if (style == "transparent") 0.0 else 96.0)
    val opacityPercent = (if (opacityRaw <= 1.0) opacityRaw * 100.0 else opacityRaw).toInt().coerceIn(0, 100)
    val familyDefaultContent = defaultContent[family] ?: "command"
    val requestedContent = raw.optString("content", familyDefaultContent)
    val content = requestedContent.takeIf { contentByFamily[family]?.contains(it) == true } ?: familyDefaultContent
    val accent = raw.optString("accentColor", "#8B5CF6").uppercase()
      .takeIf { it.matches(Regex("^#[0-9A-F]{6}$")) } ?: "#8B5CF6"
    val personality = raw.optString("personality", raw.optString("mood", "happy"))
      .takeIf(personalities::contains) ?: "happy"
    return JSONObject()
      .put("schemaVersion", 3)
      .put("family", family)
      .put("style", style)
      .put("accentColor", accent)
      .put("opacityPercent", if (style == "transparent") 0 else opacityPercent)
      .put("content", content)
      .put("mascot", raw.optString("mascot", "nexus").takeIf(mascots::contains) ?: "nexus")
      .put("personality", personality)
      .put("speech", raw.optString("speech", "contextual").takeIf(speeches::contains) ?: "contextual")
      .put("tapAction", raw.optString("tapAction", "today").takeIf(tapActions::contains) ?: "today")
      .put("privateMode", raw.optBoolean("privateMode", false) || legacyPrivateMode)
  }
}
