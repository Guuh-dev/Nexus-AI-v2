package expo.modules.nexuswidget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Renders the single-purpose families added in 3.1 (Timer, Captura, Sequência).
 * Their layouts declare only their own view ids, so this renderer never touches
 * the shared ids used by the five original families.
 */
internal object NexusUtilityWidgets {
  private const val ACTIVITY_DAYS = 84
  private const val ACTIVITY_WEEKS = 12

  fun render(
    context: Context,
    views: RemoteViews,
    widgetId: Int,
    family: NexusWidgetFamily,
    payload: JSONObject?,
    privateMode: Boolean,
    accentColor: Int,
    textColor: Int,
    secondaryTextColor: Int,
    mascotDrawable: Int,
    showMascot: Boolean,
  ): RemoteViews {
    when (family) {
      NexusWidgetFamily.TIMER -> renderTimer(context, views, widgetId, payload, privateMode, accentColor, textColor, secondaryTextColor, mascotDrawable, showMascot)
      NexusWidgetFamily.CAPTURE -> renderCapture(context, views, widgetId, accentColor, textColor, secondaryTextColor)
      NexusWidgetFamily.STREAK -> renderStreak(context, views, widgetId, payload, privateMode, accentColor, textColor, secondaryTextColor, mascotDrawable, showMascot)
      else -> Unit
    }
    return views
  }

  private fun renderTimer(
    context: Context,
    views: RemoteViews,
    widgetId: Int,
    payload: JSONObject?,
    privateMode: Boolean,
    accentColor: Int,
    textColor: Int,
    secondaryTextColor: Int,
    mascotDrawable: Int,
    showMascot: Boolean,
  ) {
    val status = if (privateMode) "" else payload?.optString("focusStatus").orEmpty()
    val targetMinutes = payload?.optInt("focusTargetMinutes", 25)?.takeIf { it in 5..360 } ?: 25
    val confirmedSeconds = payload?.optLong("focusElapsedSeconds", 0L)?.coerceIn(0L, 86_400L) ?: 0L
    val runStartedAt = payload?.optLong("focusRunStartedAt", 0L) ?: 0L
    val running = status == "running" && runStartedAt > 0L
    val elapsedMs = confirmedSeconds * 1000L +
      if (running) (System.currentTimeMillis() - runStartedAt).coerceIn(0L, 86_400_000L) else 0L

    views.setTextViewText(R.id.nexus_timer_label, when {
      privateMode -> "Foco protegido"
      running -> "Em foco"
      status == "paused" -> "Pausado"
      status == "completed" -> "Revisar entrega"
      else -> "Pronto para focar"
    })
    views.setTextColor(R.id.nexus_timer_label, accentColor)
    views.setImageViewResource(R.id.nexus_timer_mascot, mascotDrawable)
    views.setViewVisibility(R.id.nexus_timer_mascot, if (showMascot) View.VISIBLE else View.GONE)

    val hasSession = status in setOf("running", "paused", "completed")
    if (hasSession) {
      // Chronometer counts on the launcher side; no per-second widget updates.
      views.setChronometer(R.id.nexus_timer_clock, SystemClock.elapsedRealtime() - elapsedMs, null, running)
      views.setViewVisibility(R.id.nexus_timer_clock, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_timer_idle, View.GONE)
      views.setTextColor(R.id.nexus_timer_clock, textColor)
    } else {
      views.setViewVisibility(R.id.nexus_timer_clock, View.GONE)
      views.setViewVisibility(R.id.nexus_timer_idle, View.VISIBLE)
      views.setTextViewText(R.id.nexus_timer_idle, "%d:00".format(targetMinutes))
      views.setTextColor(R.id.nexus_timer_idle, textColor)
    }
    val ratio = if (hasSession) (elapsedMs * 100 / (targetMinutes * 60_000L)).toInt().coerceIn(0, 100) else 0
    views.setProgressBar(R.id.nexus_timer_ring, 100, ratio, false)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      views.setColorStateList(R.id.nexus_timer_ring, "setProgressTintList", ColorStateList.valueOf(accentColor))
    }

    val title = payload?.optString("focusTaskTitle").orEmpty()
    views.setTextViewText(R.id.nexus_timer_task, when {
      privateMode -> "Toque para abrir"
      hasSession && title.isNotBlank() -> "$title · alvo $targetMinutes min"
      else -> "Toque para iniciar"
    })
    views.setTextColor(R.id.nexus_timer_task, secondaryTextColor)
    bindDeepLink(context, views, widgetId, "nexusai://focus")
  }

  private fun renderCapture(
    context: Context,
    views: RemoteViews,
    widgetId: Int,
    accentColor: Int,
    textColor: Int,
    secondaryTextColor: Int,
  ) {
    views.setTextColor(R.id.nexus_capture_title, textColor)
    views.setTextColor(R.id.nexus_capture_caption, secondaryTextColor)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      views.setColorStateList(R.id.nexus_capture_tile, "setBackgroundTintList", ColorStateList.valueOf(accentColor))
    }
    views.setContentDescription(R.id.nexus_widget_root, "Capturar no Nexus")
    // Same destination as the launcher shortcut: Today opens quick capture.
    bindDeepLink(context, views, widgetId, "nexusai://today?capture=1")
  }

  private fun renderStreak(
    context: Context,
    views: RemoteViews,
    widgetId: Int,
    payload: JSONObject?,
    privateMode: Boolean,
    accentColor: Int,
    textColor: Int,
    secondaryTextColor: Int,
    mascotDrawable: Int,
    showMascot: Boolean,
  ) {
    val activity = payload?.optJSONArray("activity")
    val streak = payload?.optInt("streak", 0) ?: 0
    views.setTextColor(R.id.nexus_streak_label, accentColor)
    views.setTextColor(R.id.nexus_streak_title, textColor)
    views.setTextColor(R.id.nexus_streak_hours, textColor)
    views.setTextColor(R.id.nexus_streak_hours_label, secondaryTextColor)
    views.setImageViewResource(R.id.nexus_streak_mascot, mascotDrawable)
    views.setViewVisibility(R.id.nexus_streak_mascot, if (showMascot) View.VISIBLE else View.GONE)

    if (privateMode || activity == null) {
      views.setTextViewText(R.id.nexus_streak_title, if (privateMode) "Sequência protegida" else "Abra o app para sincronizar")
      views.setViewVisibility(R.id.nexus_streak_hours, View.GONE)
      views.setViewVisibility(R.id.nexus_streak_hours_label, View.GONE)
      views.setViewVisibility(R.id.nexus_streak_grid, View.GONE)
    } else {
      val minutes = (payload?.optInt("activityFocusMinutes", 0) ?: 0).coerceAtLeast(0)
      views.setTextViewText(R.id.nexus_streak_title, if (streak == 1) "1 dia seguido" else "$streak dias seguidos")
      views.setTextViewText(R.id.nexus_streak_hours, "${(minutes + 30) / 60}h")
      views.setViewVisibility(R.id.nexus_streak_hours, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_streak_hours_label, View.VISIBLE)
      views.setViewVisibility(R.id.nexus_streak_grid, View.VISIBLE)
      views.setImageViewBitmap(R.id.nexus_streak_grid, activityBitmap(context, activity, accentColor, textColor))
    }
    bindDeepLink(context, views, widgetId, "nexusai://progress")
  }

  /** Draws 12 columns (weeks) by 7 rows (days), oldest first, from the app-computed levels. */
  private fun activityBitmap(context: Context, activity: org.json.JSONArray, accentColor: Int, textColor: Int): Bitmap {
    val density = context.resources.displayMetrics.density
    val cell = 10f * density
    val gap = 3f * density
    val radius = 2.5f * density
    val width = (ACTIVITY_WEEKS * cell + (ACTIVITY_WEEKS - 1) * gap).toInt()
    val height = (7 * cell + 6 * gap).toInt()
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    val empty = Color.argb(28, Color.red(textColor), Color.green(textColor), Color.blue(textColor))
    val alphas = intArrayOf(0, 85, 136, 204, 255)
    for (index in 0 until ACTIVITY_DAYS) {
      val level = activity.optInt(index, 0).coerceIn(0, 4)
      paint.color = if (level == 0) empty else Color.argb(alphas[level], Color.red(accentColor), Color.green(accentColor), Color.blue(accentColor))
      val left = (index / 7) * (cell + gap)
      val top = (index % 7) * (cell + gap)
      canvas.drawRoundRect(RectF(left, top, left + cell, top + cell), radius, radius, paint)
    }
    return bitmap
  }

  private fun bindDeepLink(context: Context, views: RemoteViews, widgetId: Int, uri: String) {
    val intent = (context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent(Intent.ACTION_VIEW)).apply {
      data = Uri.parse(uri)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    views.setOnClickPendingIntent(
      R.id.nexus_widget_root,
      PendingIntent.getActivity(context, 9001 + widgetId, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
    )
  }
}
