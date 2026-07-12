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
import java.text.NumberFormat
import java.util.Locale
import java.util.UUID

class NexusWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    updateWidgets(context, appWidgetManager, appWidgetIds)
  }

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, appWidgetId: Int, newOptions: Bundle) {
    super.onAppWidgetOptionsChanged(context, manager, appWidgetId, newOptions)
    manager.updateAppWidget(appWidgetId, buildRemoteViews(context, appWidgetId))
  }

  override fun onDeleted(context: Context, appWidgetIds: IntArray) {
    val editor = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE).edit()
    appWidgetIds.forEach {
      editor.remove("instance_$it")
      editor.remove("page_$it")
    }
    editor.apply()
    super.onDeleted(context, appWidgetIds)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      ACTION_REFRESH -> refreshAll(context)
      ACTION_TOGGLE_TASK -> {
        if (!validNonce(context, intent)) return
        val taskId = intent.getStringExtra(EXTRA_TASK_ID) ?: return
        toggleTask(context, taskId)
        refreshAll(context)
      }
      ACTION_NEXT_PAGE -> {
        if (!validNonce(context, intent)) return
        val widgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) return
        val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val current = preferences.getInt("page_$widgetId", 0)
        preferences.edit().putInt("page_$widgetId", (current + 1) % PAGE_MODES.size).apply()
        AppWidgetManager.getInstance(context).updateAppWidget(widgetId, buildRemoteViews(context, widgetId))
      }
    }
  }

  private fun validNonce(context: Context, intent: Intent): Boolean {
    val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
    val expectedNonce = preferences.getString(ACTION_NONCE_KEY, null)
    return !expectedNonce.isNullOrBlank() && expectedNonce == intent.getStringExtra(EXTRA_NONCE)
  }

  private fun refreshAll(context: Context) {
    val manager = AppWidgetManager.getInstance(context)
    val ids = manager.getAppWidgetIds(ComponentName(context, NexusWidgetProvider::class.java))
    updateWidgets(context, manager, ids)
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

    private val PAGE_MODES = listOf("smart", "companion", "finance", "learning", "progress")

    fun updateWidgets(context: Context, manager: AppWidgetManager, ids: IntArray) {
      ensureNonce(context)
      ids.forEach { widgetId -> manager.updateAppWidget(widgetId, buildRemoteViews(context, widgetId)) }
    }

    private fun ensureNonce(context: Context): String {
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val existing = preferences.getString(ACTION_NONCE_KEY, null)
      if (!existing.isNullOrBlank()) return existing
      val created = UUID.randomUUID().toString()
      preferences.edit().putString(ACTION_NONCE_KEY, created).apply()
      return created
    }

    private fun toggleTask(context: Context, taskId: String) {
      synchronized(NexusWidgetProvider::class.java) {
        val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
        val raw = preferences.getString(PAYLOAD_KEY, null) ?: return
        val payload = try { JSONObject(raw) } catch (_: Exception) { return }
        val tasks = payload.optJSONArray("tasks") ?: return
        var completedValue: Boolean? = null
        for (index in 0 until tasks.length()) {
          val task = tasks.optJSONObject(index) ?: continue
          if (task.optString("id") == taskId) {
            completedValue = !task.optBoolean("completed", false)
            task.put("completed", completedValue)
            break
          }
        }
        val completed = completedValue ?: return
        var completedCount = 0
        for (index in 0 until tasks.length()) {
          if (tasks.optJSONObject(index)?.optBoolean("completed", false) == true) completedCount += 1
        }
        payload.put("completedCount", completedCount)

        val pending = try { JSONArray(preferences.getString(PENDING_ACTIONS_KEY, "[]")) } catch (_: Exception) { JSONArray() }
        val compact = JSONArray()
        val start = maxOf(0, pending.length() - 48)
        for (index in start until pending.length()) compact.put(pending.opt(index))
        compact.put(
          JSONObject()
            .put("type", "toggle_task")
            .put("taskId", taskId)
            .put("completed", completed)
            .put("createdAt", System.currentTimeMillis().toString()),
        )
        preferences.edit()
          .putString(PAYLOAD_KEY, payload.toString())
          .putString(PENDING_ACTIONS_KEY, compact.toString())
          .apply()
      }
    }

    private fun buildRemoteViews(context: Context, widgetId: Int): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.nexus_widget)
      val preferences = context.getSharedPreferences(PREFERENCES_NAME, Context.MODE_PRIVATE)
      val raw = preferences.getString(PAYLOAD_KEY, null)
      val payload = try { if (raw.isNullOrBlank()) null else JSONObject(raw) } catch (_: Exception) { null }
      val appearance = payload?.optJSONObject("appearance")
      val instance = try { JSONObject(preferences.getString("instance_$widgetId", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }

      val style = instance.optString("style", appearance?.optString("style", "nexus") ?: "nexus")
      val configuredContent = instance.optString("content", appearance?.optString("contentMode", "smart") ?: "smart")
      val pageCycle = instance.optBoolean("pageCycle", appearance?.optBoolean("allowPageCycle", false) ?: false)
      val pageIndex = preferences.getInt("page_$widgetId", 0).coerceAtLeast(0)
      val contentMode = if (pageCycle) PAGE_MODES[pageIndex % PAGE_MODES.size] else configuredContent
      val privateMode = contentMode == "private" || style == "privacy" || appearance?.optBoolean("privacyMode", false) == true
      val background = appearance?.optString("background", "solid") ?: "solid"
      val backgroundResource = when {
        style == "light" -> R.drawable.nexus_widget_background_light
        style == "amoled" || background == "amoled" -> R.drawable.nexus_widget_background_amoled
        style == "transparent" || style == "glass" || background == "translucent" -> R.drawable.nexus_widget_background_translucent
        style == "pixel" -> R.drawable.nexus_widget_background_pixel
        style == "minimal" -> R.drawable.nexus_widget_background_minimal
        style == "gamer" -> R.drawable.nexus_widget_background_gamer
        style == "neon" -> R.drawable.nexus_widget_background_neon
        else -> R.drawable.nexus_widget_background
      }
      views.setInt(R.id.nexus_widget_root, "setBackgroundResource", backgroundResource)

      val options = AppWidgetManager.getInstance(context).getAppWidgetOptions(widgetId)
      val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 250)
      val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110)
      val tiny = width < 120 || height < 80
      val compact = width < 220 || height < 115
      val large = width >= 250 && height >= 170

      val selectedMascot = instance.optString("mascot", appearance?.optString("mascot", "nexus") ?: "nexus")
      val mood = instance.optString("mood", appearance?.optString("companionMood", "happy") ?: "happy")
      val speech = instance.optString("speech", appearance?.optString("companionSpeech", "contextual") ?: "contextual")
      val showMascot = (appearance?.optBoolean("showMascot", true) ?: true) && selectedMascot != "none"
      val professorMode = instance.optString("professor", "global")
      val showProfessor = (when (professorMode) {
        "show" -> true
        "hide" -> false
        else -> appearance?.optBoolean("showProfessor", false) ?: false
      }) && selectedMascot != "atlas"

      val showLearning = contentMode == "learning" || (appearance?.optBoolean("showLearning", false) ?: false)
      val showMission = contentMode in listOf("full", "smart", "mission") && (appearance?.optBoolean("showMission", true) ?: true)
      val showTasks = contentMode in listOf("full", "smart", "tasks") && (appearance?.optBoolean("showTasks", true) ?: true)
      val showStreak = appearance?.optBoolean("showStreak", true) ?: true
      val showXp = contentMode == "progress" || (appearance?.optBoolean("showXp", false) ?: false)
      val showLevel = contentMode == "progress" || (appearance?.optBoolean("showLevel", false) ?: false)
      val showFocus = contentMode == "focus" || (appearance?.optBoolean("showFocus", false) ?: false)
      val showProgress = instance.optString("progress", "global").let { mode ->
        when (mode) { "show" -> true; "hide" -> false; else -> appearance?.optBoolean("showProgress", true) ?: true }
      }
      val showCapture = instance.optString("capture", "global").let { mode ->
        when (mode) { "show" -> true; "hide" -> false; else -> appearance?.optBoolean("showCapture", true) ?: true }
      }
      val compactTasks = instance.optString("density", "global").let { mode ->
        when (mode) { "compact" -> true; "comfortable" -> false; else -> appearance?.optBoolean("compactTasks", false) ?: false }
      }
      val progressStyle = instance.optString("progressStyle", appearance?.optString("progressStyle", "bar") ?: "bar")
      val fontScale = appearance?.optString("fontScale", "normal") ?: "normal"
      val textAlign = instance.optString("alignment", appearance?.optString("textAlign", "left") ?: "left")
      val tapAction = instance.optString("tapAction", appearance?.optString("tapAction", "today") ?: "today")
      val customLabel = appearance?.optString("customLabel", "NEXUS ONLINE")?.take(24) ?: "NEXUS ONLINE"
      val skin = appearance?.optString("skin", "classic") ?: "classic"
      val accessory = instance.optString("accessory", appearance?.optString("accessory", "") ?: "")
      val professorVariant = appearance?.optString("professorVariant", "classic") ?: "classic"
      val accentColor = try { Color.parseColor(instance.optString("accentColor", appearance?.optString("accentColor", "#8B5CF6") ?: "#8B5CF6")) } catch (_: Exception) { Color.rgb(139, 92, 246) }
      val lightStyle = style == "light"
      val mainText = if (lightStyle) Color.rgb(21, 19, 27) else Color.rgb(247, 247, 248)
      val secondaryText = if (lightStyle) Color.rgb(98, 93, 112) else Color.rgb(161, 161, 170)

      views.setTextViewText(R.id.nexus_widget_brand, if (pageCycle) "$customLabel • ${pageIndex % PAGE_MODES.size + 1}/${PAGE_MODES.size}" else customLabel.ifBlank { "NEXUS ONLINE" })
      views.setTextColor(R.id.nexus_widget_brand, accentColor)
      views.setTextColor(R.id.nexus_widget_mission, mainText)
      views.setTextColor(R.id.nexus_widget_feature_title, accentColor)
      views.setTextColor(R.id.nexus_widget_feature_body, mainText)
      views.setTextColor(R.id.nexus_widget_metrics, secondaryText)
      views.setTextColor(R.id.nexus_widget_progress_text, secondaryText)
      views.setTextColor(R.id.nexus_widget_capture, mainText)
      views.setTextColor(R.id.nexus_widget_page, accentColor)
      views.setImageViewResource(R.id.nexus_widget_mascot, when (selectedMascot) {
        "atlas" -> R.drawable.ic_nexus_atlas
        "nova" -> R.drawable.ic_nexus_nova
        "byte" -> R.drawable.ic_nexus_byte
        "pulse" -> R.drawable.ic_nexus_pulse
        "orbit" -> R.drawable.ic_nexus_orbit
        "ember" -> R.drawable.ic_nexus_ember
        else -> R.drawable.ic_nexus_mascot
      })
      val skinColor = when (skin) {
        "shadow" -> Color.rgb(113, 113, 122)
        "galaxy" -> Color.rgb(124, 58, 237)
        "emerald" -> Color.rgb(16, 185, 129)
        "gold" -> Color.rgb(245, 158, 11)
        "ice" -> Color.rgb(56, 189, 248)
        "rose" -> Color.rgb(236, 72, 153)
        else -> accentColor
      }
      views.setImageViewResource(R.id.nexus_widget_professor, R.drawable.ic_nexus_atlas)
      val professorColor = when (professorVariant) {
        "emerald" -> Color.rgb(16, 185, 129)
        "gold" -> Color.rgb(245, 158, 11)
        "ice" -> Color.rgb(56, 189, 248)
        "rose" -> Color.rgb(236, 72, 153)
        else -> accentColor
      }
      val mascotColor = when (selectedMascot) {
        "atlas" -> professorColor
        "nova" -> Color.parseColor("#F97316")
        "byte" -> Color.parseColor("#38BDF8")
        "pulse" -> Color.parseColor("#EC4899")
        "orbit" -> Color.parseColor("#22D3EE")
        "ember" -> Color.parseColor("#FB7185")
        else -> skinColor
      }
      views.setInt(R.id.nexus_widget_mascot, "setColorFilter", mascotColor)
      views.setInt(R.id.nexus_widget_professor, "setColorFilter", professorColor)
      views.setTextViewText(R.id.nexus_widget_accessory, accessoryGlyph(accessory))
      views.setTextColor(R.id.nexus_widget_accessory, mainText)
      views.setTextViewTextSize(R.id.nexus_widget_mission, 2, when (fontScale) { "pequena" -> 13f; "grande" -> 17f; else -> 15f })
      views.setViewVisibility(R.id.nexus_widget_mascot, if (showMascot) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_professor, if (showProfessor) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_brand, if (tiny) View.GONE else View.VISIBLE)
      views.setViewVisibility(R.id.nexus_widget_mission, if (showMission && !tiny) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_streak, if (showStreak) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_metrics, if (!tiny && (showXp || showLevel || showFocus)) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_progress, if (showProgress && progressStyle == "bar" && !tiny && contentMode !in listOf("companion", "quote", "finance", "habits", "boss")) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_progress_text, if (showProgress && !tiny && contentMode !in listOf("companion", "quote", "finance", "habits", "boss")) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_capture, if (showCapture && large && contentMode in listOf("full", "smart", "tasks")) View.VISIBLE else View.GONE)
      views.setViewVisibility(R.id.nexus_widget_page, if (pageCycle && !tiny) View.VISIBLE else View.GONE)

      val gravity = if (textAlign == "center") Gravity.CENTER_HORIZONTAL else Gravity.START
      intArrayOf(
        R.id.nexus_widget_brand,
        R.id.nexus_widget_mission,
        R.id.nexus_widget_learning,
        R.id.nexus_widget_feature_title,
        R.id.nexus_widget_feature_body,
        R.id.nexus_widget_metrics,
        R.id.nexus_widget_progress_text,
      ).forEach { views.setInt(it, "setGravity", gravity) }

      if (payload == null) {
        views.setTextViewText(R.id.nexus_widget_mission, "Abra o Nexus para preparar sua missão")
        views.setTextViewText(R.id.nexus_widget_feature_title, "NEXUS COMPANION")
        views.setTextViewText(R.id.nexus_widget_feature_body, "Seu plano aparecerá aqui.")
        views.setViewVisibility(R.id.nexus_widget_feature_title, View.VISIBLE)
        views.setViewVisibility(R.id.nexus_widget_feature_body, View.VISIBLE)
        views.setTextViewText(R.id.nexus_widget_progress_text, "0/0 concluídas")
        views.setTextViewText(R.id.nexus_widget_metrics, "Nível 1 • 0 XP")
        setTask(context, views, widgetId, 0, null, "Seu plano aparecerá aqui", false, accentColor, showTasks && !tiny, mainText, secondaryText)
        for (index in 1..4) setTask(context, views, widgetId, index, null, null, false, accentColor, false, mainText, secondaryText)
        views.setProgressBar(R.id.nexus_widget_progress, 100, 0, false)
        views.setViewVisibility(R.id.nexus_widget_learning, View.GONE)
      } else {
        val completed = payload.optInt("completedCount", 0)
        val total = payload.optInt("totalCount", 0)
        views.setTextViewText(R.id.nexus_widget_mission, if (privateMode) "Missão protegida" else payload.optString("mainMission", "Missão de hoje"))
        views.setTextViewText(R.id.nexus_widget_progress_text, "$completed/$total concluídas")
        views.setTextViewText(R.id.nexus_widget_streak, "♨ ${payload.optInt("streak", 0)}")
        val metrics = mutableListOf<String>()
        if (showLevel) metrics.add("Nível ${payload.optInt("level", 1)}")
        if (showXp) metrics.add("${payload.optInt("totalXp", 0)} XP")
        if (showFocus) metrics.add("${payload.optInt("focusMinutes", 0)}m foco")
        views.setTextViewText(R.id.nexus_widget_metrics, metrics.joinToString(" • "))
        views.setProgressBar(R.id.nexus_widget_progress, maxOf(1, total), completed, false)

        val learning = payload.optJSONObject("learning")
        val learningVisible = showLearning && learning != null && width >= 180
        views.setViewVisibility(R.id.nexus_widget_learning, if (learningVisible) View.VISIBLE else View.GONE)
        if (learningVisible && learning != null) {
          views.setTextColor(R.id.nexus_widget_learning, accentColor)
          views.setTextViewText(R.id.nexus_widget_learning, "ATLAS • ${learning.optString("nextLesson", "Próxima evolução")} • ${learning.optInt("estimatedMinutes", 25)} min")
        }

        val feature = featureContent(payload, contentMode, mood, speech, privateMode)
        views.setViewVisibility(R.id.nexus_widget_feature_title, if (feature != null && !tiny) View.VISIBLE else View.GONE)
        views.setViewVisibility(R.id.nexus_widget_feature_body, if (feature != null && !tiny) View.VISIBLE else View.GONE)
        if (feature != null) {
          views.setTextViewText(R.id.nexus_widget_feature_title, feature.first)
          views.setTextViewText(R.id.nexus_widget_feature_body, feature.second)
        }

        val tasks = payload.optJSONArray("tasks")
        val maxVisible = when {
          tiny -> 0
          compact -> if (compactTasks) 1 else 0
          large -> 5
          compactTasks -> 2
          else -> 3
        }
        for (index in 0..4) {
          val task = tasks?.optJSONObject(index)
          setTask(
            context,
            views,
            widgetId,
            index,
            task?.optString("id"),
            if (privateMode && task != null) "Tarefa privada" else task?.optString("title"),
            task?.optBoolean("completed", false) ?: false,
            accentColor,
            showTasks && index < maxVisible,
            mainText,
            secondaryText,
          )
        }
      }

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(Intent.ACTION_VIEW)
      val tapUri = when (tapAction) {
        "brain" -> "nexusai://brain"
        "focus" -> "nexusai://focus"
        "capture" -> "nexusai://today?capture=1"
        "progress" -> "nexusai://progress"
        "finance" -> "nexusai://finance"
        "habits" -> "nexusai://habits"
        "week" -> "nexusai://week"
        else -> "nexusai://today"
      }
      launchIntent.data = Uri.parse(tapUri)
      launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      views.setOnClickPendingIntent(R.id.nexus_widget_root, PendingIntent.getActivity(context, 9001 + widgetId, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

      val professorIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(Intent.ACTION_VIEW)
      professorIntent.data = Uri.parse("nexusai://brain")
      professorIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      val professorPendingIntent = PendingIntent.getActivity(context, 9300 + widgetId, professorIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      views.setOnClickPendingIntent(R.id.nexus_widget_professor, professorPendingIntent)
      views.setOnClickPendingIntent(R.id.nexus_widget_learning, professorPendingIntent)

      val captureIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(Intent.ACTION_VIEW)
      captureIntent.data = Uri.parse("nexusai://today?capture=1")
      captureIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      views.setOnClickPendingIntent(R.id.nexus_widget_capture, PendingIntent.getActivity(context, 9500 + widgetId, captureIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

      if (pageCycle) {
        val pageIntent = Intent(context, NexusWidgetProvider::class.java)
          .setAction(ACTION_NEXT_PAGE)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
          .putExtra(EXTRA_NONCE, ensureNonce(context))
        views.setOnClickPendingIntent(R.id.nexus_widget_page, PendingIntent.getBroadcast(context, 9700 + widgetId, pageIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
      return views
    }

    private fun featureContent(payload: JSONObject, mode: String, mood: String, speech: String, privateMode: Boolean): Pair<String, String>? {
      if (privateMode) return "PRIVACIDADE" to "Conteúdo oculto nesta instância."
      return when (mode) {
        "companion" -> {
          val lines = payload.optJSONObject("companionLines")
          val line = if (speech == "silent") "Nexus ativo." else lines?.optString(mood, "Nexus ativo.") ?: "Nexus ativo."
          "NEXUS COMPANION • ${mood.uppercase(Locale.getDefault())}" to line
        }
        "quote" -> "ORDEM DO NEXUS" to payload.optString("quote", "Disciplina hoje. Liberdade amanhã.")
        "finance" -> {
          val finance = payload.optJSONObject("finance") ?: JSONObject()
          val revenue = currency(finance.optDouble("monthlyRevenue", 0.0))
          val goal = currency(finance.optDouble("monthlyGoal", 0.0))
          "MONEY MISSION • $revenue / $goal" to "${finance.optInt("prospectsToday", 0)} prospecções hoje • ${finance.optInt("followUpsPending", 0)} follow-ups • ${finance.optInt("activeClients", 0)} clientes"
        }
        "habits" -> {
          val habits = payload.optJSONObject("habits") ?: JSONObject()
          "HÁBITOS • ${habits.optInt("completed", 0)}/${habits.optInt("total", 0)}" to habits.optString("next", "Nenhum hábito pendente.")
        }
        "boss" -> {
          val boss = payload.optJSONObject("boss") ?: JSONObject()
          "BOSS BATTLE • ${boss.optInt("progress", 0)}/${boss.optInt("target", 0)}" to boss.optString("title", "Nenhum boss ativo.")
        }
        "focus" -> "FOCUS OS" to "${payload.optInt("focusMinutes", 0)} minutos focados hoje. Toque para iniciar outro bloco."
        "progress" -> "PROGRESSO" to "Nível ${payload.optInt("level", 1)} • ${payload.optInt("totalXp", 0)} XP • streak ${payload.optInt("streak", 0)}"
        "smart" -> "FAÇA AGORA" to payload.optString("nextAction", "Escolha uma tarefa e comece por 15 minutos.")
        else -> null
      }
    }

    private fun currency(value: Double): String = NumberFormat.getCurrencyInstance(Locale("pt", "BR")).format(value)

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
    ) {
      val containerIds = intArrayOf(R.id.nexus_widget_task_1, R.id.nexus_widget_task_2, R.id.nexus_widget_task_3, R.id.nexus_widget_task_4, R.id.nexus_widget_task_5)
      val checkIds = intArrayOf(R.id.nexus_widget_check_1, R.id.nexus_widget_check_2, R.id.nexus_widget_check_3, R.id.nexus_widget_check_4, R.id.nexus_widget_check_5)
      val titleIds = intArrayOf(R.id.nexus_widget_task_title_1, R.id.nexus_widget_task_title_2, R.id.nexus_widget_task_title_3, R.id.nexus_widget_task_title_4, R.id.nexus_widget_task_title_5)
      if (!allowed || title.isNullOrBlank()) {
        views.setViewVisibility(containerIds[index], View.GONE)
        return
      }
      views.setViewVisibility(containerIds[index], View.VISIBLE)
      views.setTextViewText(checkIds[index], if (completed) "✓" else "○")
      views.setTextColor(checkIds[index], if (completed) Color.rgb(74, 222, 128) else accentColor)
      views.setTextViewText(titleIds[index], title)
      views.setTextColor(titleIds[index], if (completed) secondaryText else mainText)
      if (!taskId.isNullOrBlank()) {
        val intent = Intent(context, NexusWidgetProvider::class.java)
          .setAction(ACTION_TOGGLE_TASK)
          .putExtra(EXTRA_TASK_ID, taskId)
          .putExtra(EXTRA_NONCE, ensureNonce(context))
        val requestCode = 10_000 + widgetId * 10 + index
        views.setOnClickPendingIntent(containerIds[index], PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
    }
  }
}
