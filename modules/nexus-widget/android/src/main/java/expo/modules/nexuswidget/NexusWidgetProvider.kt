package expo.modules.nexuswidget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.UUID

enum class NexusWidgetFamily(val storageName: String, val layout: Int, val taskLimit: Int) {
  MINI("mini", R.layout.nexus_widget_mini, 0),
  STRIP("strip", R.layout.nexus_widget_strip, 0),
  COMPANION("companion", R.layout.nexus_widget_companion, 0),
  MISSION("mission", R.layout.nexus_widget_mission, 2),
  COMMAND("command", R.layout.nexus_widget, 4),
}

private data class NativeWidgetRenderSpec(
  val family: NexusWidgetFamily,
  val style: String,
  val content: String,
  val taskLimit: Int,
  val accentColor: Int,
  val textColor: Int,
  val secondaryTextColor: Int,
  val opacityPercent: Int,
  val mascot: String,
  val personality: String,
  val speech: String,
  val tapAction: String,
  val taskToggle: Boolean,
  val emptyTitle: String,
  val emptyBody: String,
  val emptyAction: String,
  val privateMode: Boolean,
)

open class NexusWidgetProvider : AppWidgetProvider() {
  protected open val family = NexusWidgetFamily.COMMAND

  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, manager, appWidgetIds, family, javaClass)
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    manager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: Bundle,
  ) {
    super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions)
    manager.updateAppWidget(appWidgetId, buildRemoteViews(context, appWidgetId, family, javaClass))
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    val editor = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE).edit()
    appWidgetIds.forEach { widgetId ->
      editor.remove("instance_$widgetId")
      editor.remove("page_$widgetId")
    }
    editor.apply()
    super.onDeleted(context, appWidgetIds)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_REFRESH -> updateAllWidgetFamilies(context)
      ACTION_TOGGLE_TASK -> {
        if (!validNonce(context, intent)) return
        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
        if (toggleTask(context, taskId)) updateAllWidgetFamilies(context)
      }
      // Kept only so v2 instances configured with page cycling remain safe.
      // Widget Studio v3 no longer exposes this control.
      ACTION_NEXT_PAGE -> {
        if (!validNonce(context, intent)) return
        val widgetId = intent.getIntExtra(
          AppWidgetManager.EXTRA_APPWIDGET_ID,
          AppWidgetManager.INVALID_APPWIDGET_ID,
        )
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val nextPage = (preferences.getInt("page_$widgetId", 0) + 1) % LEGACY_PAGE_CONTENT.size
        preferences.edit().putInt("page_$widgetId", nextPage).apply()
        AppWidgetManager.getInstance(context).updateAppWidget(
          widgetId,
          buildRemoteViews(context, widgetId, family, javaClass),
        )
      }
    }
  }

  private fun validNonce(context: Context, intent: Intent): Boolean {
    val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    val expectedNonce = preferences.getString(ACTION_NONCE_KEY, null)
    return !expectedNonce.isNullOrBlank() && expectedNonce == intent.getStringExtra(EXTRA_NONCE)
  }

  companion object {
    const val PREFERENCES_NAME = "nexus_widget_data"
    const val PAYLOAD_KEY = "payload"
    const val PENDING_ACTIONS_KEY = "pending_actions"
    const val ACTION_NONCE_KEY = "action_nonce"
    const val ACTION_REFRESH = "com.gustavoaraujo.nexusai.NEXUS_WIDGET_REFRESH"
    const val ACTION_TOGGLE_TASK = "com.gustavoaraujo.nexusai.NEXUS_WIDGET_TOGGLE_TASK"
    const val ACTION_NEXT_PAGE = "com.gustavoaraujo.nexusai.NEXUS_WIDGET_NEXT_PAGE"
    const val EXTRA_TASK_ID = "task_id"
    const val EXTRA_NONCE = "nonce"

    private val LEGACY_PAGE_CONTENT = listOf("command", "companion", "focus")
    private val PROVIDERS: List<Pair<Class<out NexusWidgetProvider>, NexusWidgetFamily>> = listOf(
      NexusMiniWidgetProvider::class.java to NexusWidgetFamily.MINI,
      NexusStripWidgetProvider::class.java to NexusWidgetFamily.STRIP,
      NexusCompanionWidgetProvider::class.java to NexusWidgetFamily.COMPANION,
      NexusMissionWidgetProvider::class.java to NexusWidgetFamily.MISSION,
      NexusWidgetProvider::class.java to NexusWidgetFamily.COMMAND,
    )

    fun familyForProviderClass(className: String): NexusWidgetFamily? =
      PROVIDERS.firstOrNull { (provider, _) -> provider.name == className }?.second

    fun updateAllWidgetFamilies(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      PROVIDERS.forEach { (provider, family) ->
        updateWidgets(
          context,
          manager,
          manager.getAppWidgetIds(ComponentName(context, provider)),
          family,
          provider,
        )
      }
    }

    fun updateWidgets(
      context: Context,
      manager: AppWidgetManager,
      ids: IntArray,
      family: NexusWidgetFamily = NexusWidgetFamily.COMMAND,
      providerClass: Class<out NexusWidgetProvider> = NexusWidgetProvider::class.java,
    ) {
      ensureNonce(context)
      ids.forEach { widgetId ->
        manager.updateAppWidget(widgetId, buildRemoteViews(context, widgetId, family, providerClass))
      }
    }

    private fun ensureNonce(context: Context): String {
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val existing = preferences.getString(ACTION_NONCE_KEY, null)
      if (!existing.isNullOrBlank()) return existing
      val created = UUID.randomUUID().toString()
      preferences.edit().putString(ACTION_NONCE_KEY, created).apply()
      return created
    }

    private fun toggleTask(context: Context, taskId: String): Boolean =
      synchronized(NexusWidgetProvider::class.java) {
        val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val raw = preferences.getString(PAYLOAD_KEY, null) ?: return@synchronized false
        val payload = try { JSONObject(raw) } catch (_: Exception) { return@synchronized false }
        val tasks = payload.optJSONArray("tasks") ?: return@synchronized false
        var completedValue: Boolean? = null
        var previousValue: Boolean? = null
        for (index in 0 until tasks.length()) {
          val task = tasks.optJSONObject(index) ?: continue
          if (task.optString("id") != taskId) continue
          val wasCompleted = task.optBoolean("completed", false)
          previousValue = wasCompleted
          completedValue = !wasCompleted
          task.put("completed", completedValue)
          break
        }
        val completed = completedValue ?: return@synchronized false
        val totalCount = payload.optInt("totalCount", tasks.length()).coerceAtLeast(0)
        val delta = when {
          completed && previousValue == false -> 1
          !completed && previousValue == true -> -1
          else -> 0
        }
        payload.put(
          "completedCount",
          (payload.optInt("completedCount", 0) + delta).coerceIn(0, totalCount),
        )

        val pending = try {
          JSONArray(preferences.getString(PENDING_ACTIONS_KEY, "[]"))
        } catch (_: Exception) {
          JSONArray()
        }
        val compact = JSONArray()
        for (index in maxOf(0, pending.length() - 48) until pending.length()) {
          compact.put(pending.opt(index))
        }
        compact.put(
          JSONObject()
            .put("id", UUID.randomUUID().toString())
            .put("type", "toggle_task")
            .put("taskId", taskId)
            .put("completed", completed)
            .put("createdAt", System.currentTimeMillis().toString()),
        )
        preferences.edit()
          .putString(PAYLOAD_KEY, payload.toString())
          .putString(PENDING_ACTIONS_KEY, compact.toString())
          .commit()
      }

    private fun buildRemoteViews(
      context: Context,
      widgetId: Int,
      family: NexusWidgetFamily,
      providerClass: Class<out NexusWidgetProvider>,
    ): RemoteViews {
      val views = RemoteViews(context.packageName, family.layout)
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val rawPayload = preferences.getString(PAYLOAD_KEY, null)
      val payload = try {
        if (rawPayload.isNullOrBlank()) null else JSONObject(rawPayload)
      } catch (_: Exception) {
        null
      }
      val appearance = payload?.optJSONObject("appearance")
      val parsedInstance = try {
        JSONObject(preferences.getString("instance_$widgetId", "{}") ?: "{}")
      } catch (_: Exception) {
        JSONObject()
      }
      val instance = migrateInstanceConfiguration(preferences, widgetId, parsedInstance)
      val legacyPageCycle = family == NexusWidgetFamily.COMMAND && instance.optBoolean("pageCycle", false)
      val pageIndex = preferences.getInt("page_$widgetId", 0).coerceAtLeast(0)
      val forcedContent = if (legacyPageCycle) LEGACY_PAGE_CONTENT[pageIndex % LEGACY_PAGE_CONTENT.size] else null
      val spec = resolveRenderSpec(payload, appearance, instance, family, forcedContent)
      val backgroundResource = backgroundResource(spec.style, spec.opacityPercent)
      views.setInt(R.id.nexus_widget_root, "setBackgroundResource", backgroundResource)

      resetVisibility(views)
      applyColorsAndMascot(views, payload, appearance, instance, widgetId, spec)

      val completed = payload?.optInt("completedCount", 0) ?: 0
      val total = payload?.optInt("totalCount", 0) ?: 0
      val planAvailable = payload?.optBoolean("planAvailable", total > 0) ?: false
      val progressPercentage = if (total > 0) (completed * 100 / total).coerceIn(0, 100) else 0
      val mission = if (spec.privateMode) {
        "Missão protegida"
      } else if (planAvailable) {
        payload?.optString("mainMission", spec.emptyTitle) ?: spec.emptyTitle
      } else {
        spec.emptyTitle
      }
      val nextAction = if (spec.privateMode) {
        "Próxima ação protegida"
      } else {
        payload?.optString("nextAction", spec.emptyTitle) ?: spec.emptyTitle
      }

      views.setTextViewText(R.id.nexus_widget_brand, brandForFamily(spec.family))
      views.setTextViewText(R.id.nexus_widget_mission, mission)
      views.setTextViewText(R.id.nexus_widget_progress_text, if (total > 0) "$completed/$total" else "0%")

      when (family) {
        NexusWidgetFamily.MINI -> renderMini(views, payload, spec, planAvailable)
        NexusWidgetFamily.STRIP -> renderStrip(views, spec, nextAction, completed, total, progressPercentage)
        NexusWidgetFamily.COMPANION -> renderCompanion(views, payload, spec, planAvailable)
        NexusWidgetFamily.MISSION -> renderMission(
          context,
          views,
          widgetId,
          payload,
          spec,
          mission,
          planAvailable,
          completed,
          total,
        )
        NexusWidgetFamily.COMMAND -> renderCommand(
          context,
          views,
          widgetId,
          payload,
          spec,
          mission,
          planAvailable,
          completed,
          total,
        )
      }

      bindRootAction(context, views, widgetId, spec.tapAction)
      if (legacyPageCycle) {
        views.setViewVisibility(R.id.nexus_widget_page, View.VISIBLE)
        views.setTextViewText(R.id.nexus_widget_page, "↻")
        val pageIntent = Intent(context, providerClass)
          .setAction(ACTION_NEXT_PAGE)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
          .putExtra(EXTRA_NONCE, ensureNonce(context))
        views.setOnClickPendingIntent(
          R.id.nexus_widget_page,
          PendingIntent.getBroadcast(
            context,
            9700 + widgetId,
            pageIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          ),
        )
      }
      return views
    }

    private fun resolveRenderSpec(
      payload: JSONObject?,
      appearance: JSONObject?,
      instance: JSONObject,
      family: NexusWidgetFamily,
      forcedContent: String?,
    ): NativeWidgetRenderSpec {
      val familySpecs = payload?.optJSONObject("renderSpecs")
      val shared = familySpecs?.optJSONObject(family.storageName)
        ?: payload?.optJSONObject("renderSpec")
        ?: JSONObject()
      val sharedColors = shared.optJSONObject("colors") ?: JSONObject()
      val sharedMascot = shared.optJSONObject("mascot") ?: JSONObject()
      val sharedActions = shared.optJSONObject("actions") ?: JSONObject()
      val emptyState = shared.optJSONObject("emptyState") ?: JSONObject()

      val style = normalizeStyle(
        instance.optString("style", shared.optString("style", appearance?.optString("style", "nexus") ?: "nexus")),
      )
      val configuredContent = forcedContent
        ?: instance.optString("content", shared.optString("content", appearance?.optString("contentMode", "") ?: ""))
      val content = normalizeContent(family, configuredContent)
      val opacityRaw = when {
        instance.has("opacityPercent") -> instance.optDouble("opacityPercent", 96.0)
        shared.has("opacityPercent") -> shared.optDouble("opacityPercent", 96.0)
        else -> appearance?.optDouble("opacity", 0.96) ?: 0.96
      }
      val opacityPercent = if (style == "transparent") 0 else normalizeOpacityPercent(opacityRaw)
      val accentHex = instance.optString(
        "accentColor",
        sharedColors.optString("accent", appearance?.optString("accentColor", "#8B5CF6") ?: "#8B5CF6"),
      )
      val mascot = instance.optString(
        "mascot",
        sharedMascot.optString("id", appearance?.optString("mascot", "nexus") ?: "nexus"),
      ).takeIf { it in setOf("nexus", "atlas", "nova", "byte", "pulse", "orbit", "ember") } ?: "nexus"
      val personality = instance.optString(
        "personality",
        instance.optString(
          "mood",
          sharedMascot.optString("personality", appearance?.optString("companionMood", "happy") ?: "happy"),
        ),
      )
      val speech = normalizeSpeech(
        instance.optString(
          "speech",
          sharedMascot.optString("speech", appearance?.optString("companionSpeech", "contextual") ?: "contextual"),
        ),
      )
      val globalPrivateMode = shared.optBoolean("privateMode", false) ||
        appearance?.optBoolean("privacyMode", false) == true
      val instancePrivateMode = instance.optBoolean("privateMode", false) ||
        instance.optString("content") == "private" || instance.optString("style") == "privacy"
      // Global privacy is a floor. A per-instance override may add protection,
      // but must never reveal data already protected by the app-wide setting.
      val privateMode = globalPrivateMode || instancePrivateMode

      return NativeWidgetRenderSpec(
        family = family,
        style = style,
        content = content,
        taskLimit = family.taskLimit,
        accentColor = parseColor(accentHex, Color.rgb(139, 92, 246)),
        textColor = parseColor(sharedColors.optString("text", "#F7F7F8"), Color.rgb(247, 247, 248)),
        secondaryTextColor = parseColor(sharedColors.optString("secondaryText", "#A1A1AA"), Color.rgb(161, 161, 170)),
        opacityPercent = opacityPercent,
        mascot = mascot,
        personality = personality,
        speech = speech,
        tapAction = normalizeTapAction(
          instance.optString(
            "tapAction",
            sharedActions.optString("tap", appearance?.optString("tapAction", "today") ?: "today"),
          ),
        ),
        taskToggle = !privateMode && (
          family == NexusWidgetFamily.COMMAND ||
            (family == NexusWidgetFamily.MISSION && content == "tasks")
        ),
        emptyTitle = emptyState.optString("title", defaultEmptyTitle(family)),
        emptyBody = emptyState.optString("body", defaultEmptyBody(family)),
        emptyAction = emptyState.optString("actionLabel", "Abrir Nexus"),
        privateMode = privateMode,
      )
    }

    private fun resetVisibility(views: RemoteViews) {
      intArrayOf(
        R.id.nexus_widget_mascot_stage,
        R.id.nexus_widget_mascot,
        R.id.nexus_widget_accessory,
        R.id.nexus_widget_brand,
        R.id.nexus_widget_page,
        R.id.nexus_widget_mission,
        R.id.nexus_widget_feature_title,
        R.id.nexus_widget_feature_body,
        R.id.nexus_widget_task_1,
        R.id.nexus_widget_task_2,
        R.id.nexus_widget_task_3,
        R.id.nexus_widget_task_4,
        R.id.nexus_widget_task_5,
        R.id.nexus_widget_metrics,
        R.id.nexus_widget_progress,
        R.id.nexus_widget_progress_text,
        R.id.nexus_widget_capture,
        R.id.nexus_widget_streak,
      ).forEach { views.setViewVisibility(it, View.GONE) }
    }

    private fun applyColorsAndMascot(
      views: RemoteViews,
      payload: JSONObject?,
      appearance: JSONObject?,
      instance: JSONObject,
      widgetId: Int,
      spec: NativeWidgetRenderSpec,
    ) {
      intArrayOf(
        R.id.nexus_widget_brand,
        R.id.nexus_widget_feature_title,
        R.id.nexus_widget_page,
        R.id.nexus_widget_progress_text,
      ).forEach { views.setTextColor(it, spec.accentColor) }
      intArrayOf(
        R.id.nexus_widget_mission,
        R.id.nexus_widget_feature_body,
        R.id.nexus_widget_capture,
        R.id.nexus_widget_accessory,
      ).forEach { views.setTextColor(it, spec.textColor) }
      intArrayOf(
        R.id.nexus_widget_metrics,
      ).forEach { views.setTextColor(it, spec.secondaryTextColor) }

      views.setImageViewResource(R.id.nexus_widget_mascot, when (spec.mascot) {
        "atlas" -> R.drawable.ic_nexus_atlas
        "nova" -> R.drawable.ic_nexus_nova
        "byte" -> R.drawable.ic_nexus_byte
        "pulse" -> R.drawable.ic_nexus_pulse
        "orbit" -> R.drawable.ic_nexus_orbit
        "ember" -> R.drawable.ic_nexus_ember
        else -> nexusMascotPose(payload, spec, widgetId)
      })
      // Accent colors belong to chrome and typography, never to character art;
      // tinting RemoteViews vectors destroys each companion's palette.
      views.setContentDescription(R.id.nexus_widget_mascot, "Nexus Companion: ${spec.personality}")
      val accessory = instance.optString("accessory", appearance?.optString("accessory", "") ?: "")
      views.setTextViewText(R.id.nexus_widget_accessory, accessoryGlyph(accessory))
      views.setViewVisibility(R.id.nexus_widget_accessory, if (accessory.isBlank()) View.GONE else View.VISIBLE)
      views.setInt(R.id.nexus_widget_mascot_stage, "setGravity", Gravity.CENTER)
      views.setViewPadding(R.id.nexus_widget_mascot_stage, 0, 0, 0, 0)

      val gravity = if (spec.family in listOf(NexusWidgetFamily.MINI, NexusWidgetFamily.COMPANION)) {
        Gravity.CENTER
      } else {
        Gravity.START or Gravity.CENTER_VERTICAL
      }
      intArrayOf(
        R.id.nexus_widget_brand,
        R.id.nexus_widget_mission,
        R.id.nexus_widget_feature_title,
        R.id.nexus_widget_feature_body,
        R.id.nexus_widget_metrics,
        R.id.nexus_widget_progress_text,
      ).forEach { views.setInt(it, "setGravity", gravity) }
    }

    private fun nexusMascotPose(
      payload: JSONObject?,
      spec: NativeWidgetRenderSpec,
      widgetId: Int,
    ): Int {
      val completed = payload?.optInt("completedCount", 0) ?: 0
      val total = payload?.optInt("totalCount", 0) ?: 0
      return when {
        total > 0 && completed >= total -> R.drawable.ic_nexus_mascot_celebrating
        spec.personality == "quiet" || spec.speech == "silent" -> R.drawable.ic_nexus_mascot_resting
        spec.personality == "strict" -> R.drawable.ic_nexus_mascot_watching
        (widgetId + completed).mod(4) == 0 -> R.drawable.ic_nexus_mascot_celebrating
        else -> R.drawable.ic_nexus_mascot
      }
    }

    private fun renderMini(
      views: RemoteViews,
      payload: JSONObject?,
      spec: NativeWidgetRenderSpec,
      planAvailable: Boolean,
    ) {
      views.setViewVisibility(R.id.nexus_widget_mascot_stage, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_mascot, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_streak, View.VISIBLE)
      views.setTextColor(R.id.nexus_widget_streak, spec.accentColor)
      views.setTextViewText(
        R.id.nexus_widget_streak,
        if (spec.privateMode) {
          "NEXUS"
        } else if (spec.content == "xp") {
          "⬡ ${payload?.optInt("totalXp", 0) ?: 0} XP"
        } else {
          "♨ ${payload?.optInt("streak", 0) ?: 0}"
        },
      )
      views.setContentDescription(
        R.id.nexus_widget_root,
        if (planAvailable) "Nexus Mini" else "${spec.emptyTitle}. ${spec.emptyAction}",
      )
    }

    private fun renderStrip(
      views: RemoteViews,
      spec: NativeWidgetRenderSpec,
      nextAction: String,
      completed: Int,
      total: Int,
      percentage: Int,
    ) {
      views.setViewVisibility(R.id.nexus_widget_brand, View.VISIBLE)
      views.setViewVisibility(
        R.id.nexus_widget_mission,
        View.VISIBLE,
      )
      views.setViewVisibility(R.id.nexus_widget_progress_text, View.VISIBLE)
      if (spec.privateMode) {
        views.setTextViewText(R.id.nexus_widget_brand, "PRIVACIDADE")
        views.setTextViewText(R.id.nexus_widget_mission, "Próxima ação protegida")
        views.setViewVisibility(R.id.nexus_widget_progress_text, View.GONE)
        return
      }
      if (spec.content == "progress") {
        views.setTextViewText(R.id.nexus_widget_brand, "PROGRESSO DE HOJE")
        views.setTextViewText(
          R.id.nexus_widget_mission,
          if (total > 0) "$percentage% concluído" else spec.emptyTitle,
        )
      } else {
        views.setTextViewText(R.id.nexus_widget_brand, "→ PRÓXIMA AÇÃO")
        views.setTextViewText(R.id.nexus_widget_mission, nextAction)
      }
      views.setTextViewText(R.id.nexus_widget_progress_text, "${progressMeter(percentage)}  $completed/$total")
    }

    private fun renderCompanion(
      views: RemoteViews,
      payload: JSONObject?,
      spec: NativeWidgetRenderSpec,
      planAvailable: Boolean,
    ) {
      views.setViewVisibility(R.id.nexus_widget_mascot_stage, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_mascot, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_brand, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_feature_title, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_feature_body, View.VISIBLE)
      views.setTextViewText(R.id.nexus_widget_brand, "NEXUS COMPANION")
      views.setTextViewText(
        R.id.nexus_widget_feature_title,
        spec.personality.uppercase(Locale.getDefault()),
      )
      views.setTextViewText(
        R.id.nexus_widget_feature_body,
        if (spec.privateMode) "Conteúdo protegido."
        else if (planAvailable) companionLine(payload, spec)
        else spec.emptyBody,
      )
    }

    private fun renderMission(
      context: Context,
      views: RemoteViews,
      widgetId: Int,
      payload: JSONObject?,
      spec: NativeWidgetRenderSpec,
      mission: String,
      planAvailable: Boolean,
      completed: Int,
      total: Int,
    ) {
      views.setViewVisibility(R.id.nexus_widget_brand, View.VISIBLE)
      views.setViewVisibility(
        R.id.nexus_widget_mission,
        if (spec.content == "tasks" && !spec.privateMode) View.GONE else View.VISIBLE,
      )
      views.setViewVisibility(R.id.nexus_widget_progress_text, View.VISIBLE)
      views.setTextViewText(R.id.nexus_widget_brand, if (spec.content == "tasks") "TAREFAS DE HOJE" else "MISSÃO DE HOJE")
      if (spec.privateMode) {
        views.setTextViewText(R.id.nexus_widget_mission, "Missão protegida")
      } else if (spec.content != "tasks") {
        views.setTextViewText(R.id.nexus_widget_mission, mission)
      }
      views.setTextViewText(
        R.id.nexus_widget_progress_text,
        if (total > 0) "${progressMeter(completed * 100 / total)}  $completed/$total" else "${spec.emptyAction} →",
      )
      if (spec.privateMode) {
        views.setViewVisibility(R.id.nexus_widget_progress_text, View.GONE)
      }
      renderTasks(context, views, widgetId, payload, spec, planAvailable)
    }

    private fun renderCommand(
      context: Context,
      views: RemoteViews,
      widgetId: Int,
      payload: JSONObject?,
      spec: NativeWidgetRenderSpec,
      mission: String,
      planAvailable: Boolean,
      completed: Int,
      total: Int,
    ) {
      views.setViewVisibility(R.id.nexus_widget_mascot_stage, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_mascot, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_brand, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_mission, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_feature_title, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_feature_body, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_metrics, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_progress_text, View.VISIBLE)
      views.setTextViewText(R.id.nexus_widget_brand, "NEXUS COMMAND")
      views.setTextViewText(R.id.nexus_widget_mission, mission)
      views.setTextViewText(
        R.id.nexus_widget_feature_title,
        if (spec.content == "focus") "FOCUS AGORA" else "COMPANION • ${spec.personality.uppercase(Locale.getDefault())}",
      )
      views.setTextViewText(
        R.id.nexus_widget_feature_body,
        if (spec.privateMode) "Conteúdo protegido."
        else if (!planAvailable) spec.emptyBody
        else if (spec.content == "focus") "${payload?.optInt("focusMinutes", 0) ?: 0} minutos focados hoje."
        else companionLine(payload, spec),
      )
      views.setTextViewText(
        R.id.nexus_widget_metrics,
        if (spec.privateMode) "PRIVADO" else "${payload?.optInt("focusMinutes", 0) ?: 0}m foco • $completed/$total tarefas",
      )
      views.setTextViewText(
        R.id.nexus_widget_progress_text,
        if (total > 0) "${progressMeter(completed * 100 / total)}  $completed/$total" else "${spec.emptyAction} →",
      )
      if (spec.privateMode) {
        views.setViewVisibility(R.id.nexus_widget_metrics, View.GONE)
        views.setViewVisibility(R.id.nexus_widget_progress_text, View.GONE)
      }
      renderTasks(context, views, widgetId, payload, spec, planAvailable)
    }

    private fun renderTasks(
      context: Context,
      views: RemoteViews,
      widgetId: Int,
      payload: JSONObject?,
      spec: NativeWidgetRenderSpec,
      planAvailable: Boolean,
    ) {
      val tasks = payload?.optJSONArray("tasks")
      val familyShowsTasks = spec.family == NexusWidgetFamily.COMMAND ||
        (spec.family == NexusWidgetFamily.MISSION && spec.content == "tasks")
      val visibleLimit = if (planAvailable && familyShowsTasks && !spec.privateMode) {
        spec.taskLimit.coerceAtMost(spec.family.taskLimit)
      } else 0
      for (index in 0..4) {
        val task = tasks?.optJSONObject(index)
        setTask(
          context = context,
          views = views,
          widgetId = widgetId,
          index = index,
          taskId = task?.optString("id"),
          title = if (spec.privateMode && task != null) "Tarefa privada" else task?.optString("title"),
          completed = task?.optBoolean("completed", false) ?: false,
          accentColor = spec.accentColor,
          allowed = index < visibleLimit,
          mainText = spec.textColor,
          secondaryText = spec.secondaryTextColor,
          allowToggle = spec.taskToggle && !spec.privateMode,
        )
      }
    }

    private fun companionLine(payload: JSONObject?, spec: NativeWidgetRenderSpec): String {
      if (spec.speech == "silent") return "Nexus ativo."
      val lines = payload?.optJSONObject("companionLines")
      return lines?.optString(spec.personality, payload?.optString("quote", "Nexus ativo.") ?: "Nexus ativo.")
        ?: "Nexus ativo."
    }

    private fun bindRootAction(
      context: Context,
      views: RemoteViews,
      widgetId: Int,
      tapAction: String,
    ) {
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_VIEW)
      launchIntent.data = Uri.parse(when (normalizeTapAction(tapAction)) {
        "brain" -> "nexusai://brain"
        "focus" -> "nexusai://focus"
        "progress" -> "nexusai://progress"
        else -> "nexusai://today"
      })
      launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      views.setOnClickPendingIntent(
        R.id.nexus_widget_root,
        PendingIntent.getActivity(
          context,
          9001 + widgetId,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        ),
      )
    }

    private fun setTask(
      context: Context,
      views: RemoteViews,
      widgetId: Int,
      index: Int,
      taskId: String?,
      title: String?,
      completed: Boolean,
      accentColor: Int,
      allowed: Boolean,
      mainText: Int,
      secondaryText: Int,
      allowToggle: Boolean,
    ) {
      val containerIds = intArrayOf(
        R.id.nexus_widget_task_1,
        R.id.nexus_widget_task_2,
        R.id.nexus_widget_task_3,
        R.id.nexus_widget_task_4,
        R.id.nexus_widget_task_5,
      )
      val checkIds = intArrayOf(
        R.id.nexus_widget_check_1,
        R.id.nexus_widget_check_2,
        R.id.nexus_widget_check_3,
        R.id.nexus_widget_check_4,
        R.id.nexus_widget_check_5,
      )
      val titleIds = intArrayOf(
        R.id.nexus_widget_task_title_1,
        R.id.nexus_widget_task_title_2,
        R.id.nexus_widget_task_title_3,
        R.id.nexus_widget_task_title_4,
        R.id.nexus_widget_task_title_5,
      )
      if (!allowed || title.isNullOrBlank()) {
        views.setViewVisibility(containerIds[index], View.GONE)
        return
      }
      views.setViewVisibility(containerIds[index], View.VISIBLE)
      views.setTextViewText(checkIds[index], if (completed) "✓" else "○")
      views.setTextColor(checkIds[index], if (completed) Color.rgb(74, 222, 128) else accentColor)
      views.setTextViewText(titleIds[index], title)
      views.setTextColor(titleIds[index], if (completed) secondaryText else mainText)
      if (allowToggle && !taskId.isNullOrBlank()) {
        val intent = Intent(context, providerClassForWidget(context, widgetId))
          .setAction(ACTION_TOGGLE_TASK)
          .putExtra(EXTRA_TASK_ID, taskId)
          .putExtra(EXTRA_NONCE, ensureNonce(context))
        views.setOnClickPendingIntent(
          containerIds[index],
          PendingIntent.getBroadcast(
            context,
            10_000 + widgetId * 10 + index,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
          ),
        )
      }
    }

    private fun providerClassForWidget(
      context: Context,
      widgetId: Int,
    ): Class<out NexusWidgetProvider> {
      val configured = AppWidgetManager.getInstance(context).getAppWidgetInfo(widgetId)?.provider?.className
      return PROVIDERS.firstOrNull { it.first.name == configured }?.first ?: NexusWidgetProvider::class.java
    }

    private fun backgroundResource(style: String, opacityPercent: Int): Int = when {
      style == "transparent" || opacityPercent == 0 -> R.drawable.nexus_widget_background_transparent
      style == "amoled" -> opacityResource(
        opacityPercent,
        R.drawable.nexus_widget_background_amoled_50,
        R.drawable.nexus_widget_background_amoled_70,
        R.drawable.nexus_widget_background_amoled_85,
        R.drawable.nexus_widget_background_amoled_96,
        R.drawable.nexus_widget_background_amoled,
      )
      style == "pixel" -> opacityResource(
        opacityPercent,
        R.drawable.nexus_widget_background_pixel_50,
        R.drawable.nexus_widget_background_pixel_70,
        R.drawable.nexus_widget_background_pixel_85,
        R.drawable.nexus_widget_background_pixel_96,
        R.drawable.nexus_widget_background_pixel,
      )
      style == "minimal" -> opacityResource(
        opacityPercent,
        R.drawable.nexus_widget_background_minimal_50,
        R.drawable.nexus_widget_background_minimal_70,
        R.drawable.nexus_widget_background_minimal_85,
        R.drawable.nexus_widget_background_minimal_96,
        R.drawable.nexus_widget_background_minimal,
      )
      opacityPercent <= 50 -> R.drawable.nexus_widget_background_50
      opacityPercent <= 70 -> R.drawable.nexus_widget_background_70
      opacityPercent <= 85 -> R.drawable.nexus_widget_background_85
      opacityPercent <= 96 -> R.drawable.nexus_widget_background_96
      else -> R.drawable.nexus_widget_background
    }

    private fun opacityResource(
      opacityPercent: Int,
      at50: Int,
      at70: Int,
      at85: Int,
      at96: Int,
      solid: Int,
    ): Int = when {
      opacityPercent <= 50 -> at50
      opacityPercent <= 70 -> at70
      opacityPercent <= 85 -> at85
      opacityPercent <= 96 -> at96
      else -> solid
    }

    private fun normalizeOpacityPercent(value: Double): Int {
      val percentage = if (value <= 1.0) value * 100.0 else value
      return percentage.toInt().coerceIn(0, 100)
    }

    private fun progressMeter(percentage: Int): String {
      val filled = (percentage.coerceIn(0, 100) * 8 / 100).coerceIn(0, 8)
      return "●".repeat(filled) + "○".repeat(8 - filled)
    }

    private fun normalizeStyle(value: String): String = when (value) {
      "nexus", "amoled", "transparent", "pixel", "minimal" -> value
      "gamer" -> "pixel"
      "privacy", "light" -> "minimal"
      else -> "nexus"
    }

    private fun normalizeContent(family: NexusWidgetFamily, value: String): String = when (family) {
      NexusWidgetFamily.MINI -> if (value == "xp") "xp" else "streak"
      NexusWidgetFamily.STRIP -> if (value == "progress") "progress" else "nextAction"
      NexusWidgetFamily.COMPANION -> "companion"
      NexusWidgetFamily.MISSION -> if (value == "tasks") "tasks" else "mission"
      NexusWidgetFamily.COMMAND -> if (value == "focus") "focus" else "command"
    }

    private fun normalizeSpeech(value: String): String = if (value == "silent") "silent" else "contextual"

    private fun normalizeTapAction(value: String): String = when (value) {
      "brain", "focus", "progress" -> value
      else -> "today"
    }

    private fun migrateInstanceConfiguration(
      preferences: android.content.SharedPreferences,
      widgetId: Int,
      instance: JSONObject,
    ): JSONObject {
      var changed = false
      if (instance.has("tapAction")) {
        val current = instance.optString("tapAction", "today")
        val normalized = normalizeTapAction(current)
        if (normalized != current) {
          instance.put("tapAction", normalized)
          changed = true
        }
      }
      if (instance.has("speech")) {
        val current = instance.optString("speech", "contextual")
        val normalized = normalizeSpeech(current)
        if (normalized != current) {
          instance.put("speech", normalized)
          changed = true
        }
      }
      if (instance.optString("style") == "privacy") {
        instance.put("style", "minimal")
        instance.put("privateMode", true)
        changed = true
      }
      if (instance.optString("content") == "private") {
        instance.remove("content")
        instance.put("privateMode", true)
        changed = true
      }
      if (changed) {
        preferences.edit().putString("instance_$widgetId", instance.toString()).apply()
      }
      return instance
    }

    private fun parseColor(value: String, fallback: Int): Int = try {
      Color.parseColor(value.take(9))
    } catch (_: Exception) {
      fallback
    }

    private fun brandForFamily(family: NexusWidgetFamily): String = when (family) {
      NexusWidgetFamily.MINI -> "NEXUS MINI"
      NexusWidgetFamily.STRIP -> "→ PRÓXIMA AÇÃO"
      NexusWidgetFamily.COMPANION -> "NEXUS COMPANION"
      NexusWidgetFamily.MISSION -> "MISSÃO DE HOJE"
      NexusWidgetFamily.COMMAND -> "NEXUS COMMAND"
    }

    private fun defaultEmptyTitle(family: NexusWidgetFamily): String = when (family) {
      NexusWidgetFamily.MINI -> "Nexus pronto"
      NexusWidgetFamily.STRIP -> "Defina a próxima ação"
      NexusWidgetFamily.COMPANION -> "Nexus está aqui"
      NexusWidgetFamily.MISSION -> "Prepare sua missão"
      NexusWidgetFamily.COMMAND -> "Command pronto"
    }

    private fun defaultEmptyBody(family: NexusWidgetFamily): String = when (family) {
      NexusWidgetFamily.MINI -> "Abra o app para sincronizar seu ritmo."
      NexusWidgetFamily.STRIP -> "Seu primeiro passo aparecerá aqui."
      NexusWidgetFamily.COMPANION -> "Abra o app para dar contexto ao Companion."
      NexusWidgetFamily.MISSION -> "Gere o plano de hoje para preencher este widget."
      NexusWidgetFamily.COMMAND -> "Gere o plano de hoje para ativar sua central."
    }

    private fun accessoryGlyph(accessory: String): String = when (accessory) {
      "glasses" -> "▣▣"
      "crown" -> "♛"
      "headphones" -> "🎧"
      "cap" -> "⌁"
      "scarf" -> "🧣"
      "backpack" -> "🎒"
      "laptop" -> "💻"
      "book" -> "📖"
      "coffee" -> "☕"
      "sword" -> "⚔"
      "controller" -> "🎮"
      "wizard_hat" -> "🧙"
      "medal" -> "🏅"
      "cape" -> "◢"
      else -> ""
    }
  }
}

class NexusMiniWidgetProvider : NexusWidgetProvider() {
  override val family = NexusWidgetFamily.MINI
}

class NexusStripWidgetProvider : NexusWidgetProvider() {
  override val family = NexusWidgetFamily.STRIP
}

class NexusCompanionWidgetProvider : NexusWidgetProvider() {
  override val family = NexusWidgetFamily.COMPANION
}

class NexusMissionWidgetProvider : NexusWidgetProvider() {
  override val family = NexusWidgetFamily.MISSION
}
