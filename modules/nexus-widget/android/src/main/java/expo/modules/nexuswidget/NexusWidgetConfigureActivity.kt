package expo.modules.nexuswidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject

class NexusWidgetConfigureActivity : Activity() {
  private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)
    widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      ?: AppWidgetManager.INVALID_APPWIDGET_ID
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }

    window.statusBarColor = Color.rgb(5, 5, 5)
    window.navigationBarColor = Color.rgb(5, 5, 5)
    val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(22), dp(24), dp(22), dp(24)); setBackgroundColor(Color.rgb(5, 5, 5)) }
    root.addView(label("CONFIGURAR INSTÂNCIA", 12, Color.rgb(167, 139, 250)))
    root.addView(label("Seu Widget Nexus", 28, Color.WHITE).apply { setPadding(0, dp(6), 0, dp(16)) })
    root.addView(label("Cada widget pode ter aparência e conteúdo próprios. O tamanho é ajustado diretamente na tela inicial.", 14, Color.rgb(161, 161, 170)).apply { setPadding(0, 0, 0, dp(18)) })

    val preferences = getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, MODE_PRIVATE)
    val saved = try { JSONObject(preferences.getString("instance_$widgetId", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
    val style = radioSection(root, "Estilo", listOf("nexus" to "Nexus", "amoled" to "AMOLED", "transparent" to "Transparente", "glass" to "Glass", "pixel" to "Pixel", "minimal" to "Minimal", "gamer" to "Gamer", "privacy" to "Privacidade"), saved.optString("style", "nexus"))
    val content = radioSection(root, "Conteúdo", listOf("full" to "Missão + tarefas", "mission" to "Somente missão", "tasks" to "Somente tarefas", "progress" to "Progresso e XP", "learning" to "Aula do Atlas", "private" to "Privado"), saved.optString("content", "full"))
    val mascot = radioSection(root, "Mascote", listOf("nexus" to "Nexus", "atlas" to "Professor Atlas", "nova" to "Nova", "byte" to "Byte", "pulse" to "Pulse", "none" to "Sem mascote"), saved.optString("mascot", "nexus"))
    val professor = radioSection(root, "Professor ao lado", listOf("global" to "Seguir Widget Studio", "show" to "Sempre mostrar", "hide" to "Esconder nesta instância"), saved.optString("professor", "global"))
    val accent = radioSection(root, "Cor", listOf("#8B5CF6" to "Roxo", "#38BDF8" to "Azul", "#10B981" to "Verde", "#F97316" to "Laranja", "#EC4899" to "Rosa", "#E4E4E7" to "Monocromático"), saved.optString("accentColor", "#8B5CF6"))

    val save = Button(this).apply {
      text = "Salvar widget"
      textSize = 16f
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.rgb(139, 92, 246))
      setPadding(dp(12), dp(12), dp(12), dp(12))
      setOnClickListener {
        val config = JSONObject()
          .put("style", selected(style, "nexus"))
          .put("content", selected(content, "full"))
          .put("mascot", selected(mascot, "nexus"))
          .put("professor", selected(professor, "global"))
          .put("accentColor", selected(accent, "#8B5CF6"))
        preferences.edit().putString("instance_$widgetId", config.toString()).apply()
        val manager = AppWidgetManager.getInstance(this@NexusWidgetConfigureActivity)
        NexusWidgetProvider.updateWidgets(this@NexusWidgetConfigureActivity, manager, intArrayOf(widgetId))
        val result = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
        setResult(RESULT_OK, result)
        finish()
      }
    }
    root.addView(save, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)).apply { topMargin = dp(22) })
    setContentView(ScrollView(this).apply { addView(root) })
  }

  private fun radioSection(root: LinearLayout, title: String, options: List<Pair<String, String>>, default: String): RadioGroup {
    root.addView(label(title, 16, Color.WHITE).apply { setPadding(0, dp(14), 0, dp(7)) })
    val group = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
    options.forEach { (value, textValue) ->
      group.addView(RadioButton(this).apply { text = textValue; tag = value; textSize = 14f; setTextColor(Color.rgb(247, 247, 248)); buttonTintList = android.content.res.ColorStateList.valueOf(Color.rgb(139, 92, 246)); isChecked = value == default; setPadding(dp(4), dp(4), 0, dp(4)) })
    }
    root.addView(group)
    return group
  }

  private fun selected(group: RadioGroup, fallback: String): String = group.findViewById<RadioButton>(group.checkedRadioButtonId)?.tag?.toString() ?: fallback
  private fun label(value: String, size: Int, color: Int) = TextView(this).apply { text = value; textSize = size.toFloat(); setTextColor(color) }
  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
