package expo.modules.nexuswidget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.content.SharedPreferences
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
    widgetId = intent?.extras?.getInt(
      AppWidgetManager.EXTRA_APPWIDGET_ID,
      AppWidgetManager.INVALID_APPWIDGET_ID,
    ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    window.statusBarColor = Color.rgb(5, 5, 5)
    window.navigationBarColor = Color.rgb(5, 5, 5)
    val family = resolveFamily()
    if (family == null) {
      finish()
      return
    }
    val preferences = getSharedPreferences(NexusWidgetProvider.PREFERENCES_NAME, MODE_PRIVATE)
    val saved = loadConfiguration(preferences, family)

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(22), dp(24), dp(22), dp(30))
      setBackgroundColor(Color.rgb(5, 5, 5))
    }
    root.addView(label("WIDGET STUDIO 3.0 • ${familyLabel(family)}", 12, Color.rgb(167, 139, 250)))
    root.addView(label("Configure esta instância", 27, Color.WHITE).apply {
      setPadding(0, dp(6), 0, dp(10))
    })
    root.addView(label(
      "Só aparecem opções que esta família consegue renderizar. Você pode ajustar novamente pelo Widget Studio no app.",
      14,
      Color.rgb(161, 161, 170),
    ).apply { setPadding(0, 0, 0, dp(12)) })

    val style = radioSection(
      root,
      "Estilo",
      listOf(
        "nexus" to "Nexus",
        "amoled" to "AMOLED",
        "transparent" to "Transparente real",
        "pixel" to "Pixel",
        "minimal" to "Minimal",
      ),
      normalizeStyle(saved.optString("style", "nexus")),
    )
    val contentOptions = contentOptions(family)
    val content = radioSection(
      root,
      "Conteúdo",
      contentOptions,
      normalizeContent(family, saved.optString("content", contentOptions.first().first)),
    )
    val opacity = radioSection(
      root,
      "Transparência do fundo",
      listOf(
        "100" to "Sólido",
        "96" to "Padrão 96%",
        "85" to "85%",
        "70" to "70%",
        "0" to "Transparente",
      ),
      normalizeOpacity(saved).toString(),
    )
    val accentValue = saved.optString("accentColor", "#8B5CF6")
    val accentOptions = mutableListOf(
      "#8B5CF6" to "Roxo Nexus",
      "#38BDF8" to "Azul",
      "#10B981" to "Verde",
      "#F59E0B" to "Dourado",
      "#EC4899" to "Rosa",
    ).apply {
      if (none { (value, _) -> value == accentValue }) add(0, accentValue to "Atual ($accentValue)")
    }
    val accent = radioSection(
      root,
      "Cor de destaque",
      accentOptions,
      accentValue,
    )

    val hasCompanion = family in setOf("mini", "companion", "command")
    val mascot = if (hasCompanion) radioSection(
      root,
      "Mascote",
      listOf(
        "nexus" to "Nexus",
        "atlas" to "Atlas",
        "byte" to "Byte",
        "nova" to "Nova",
        "pulse" to "Pulse",
        "orbit" to "Orbit",
        "ember" to "Ember",
      ),
      saved.optString("mascot", "nexus"),
    ) else null
    val personality = if (hasCompanion) radioSection(
      root,
      "Personalidade",
      listOf(
        "happy" to "Feliz",
        "playful" to "Zoeiro",
        "motivational" to "Motivador",
        "serious" to "Sério",
        "strict" to "Exigente",
        "calm" to "Calmo",
        "quiet" to "Quieto",
      ),
      saved.optString("personality", saved.optString("mood", "happy")),
    ) else null
    val speech = if (hasCompanion) radioSection(
      root,
      "Fala",
      listOf(
        "contextual" to "Contextual",
        "silent" to "Silencioso",
      ),
      normalizeSpeech(saved.optString("speech", "contextual")),
    ) else null
    val privacyFloor = saved.optBoolean("privacyFloor", false)
    val privateMode = radioSection(
      root,
      "Privacidade",
      if (privacyFloor) {
        listOf("true" to "Modo privado (exigido pelo padrão global)")
      } else {
        listOf(
          "false" to "Conteúdo visível",
          "true" to "Modo privado",
        )
      },
      saved.optBoolean("privateMode", false).toString(),
    )
    val tapAction = radioSection(
      root,
      "Ao tocar",
      listOf(
        "today" to "Abrir Hoje",
        "brain" to "Abrir Brain",
        "focus" to "Abrir Focus",
        "progress" to "Abrir Progresso",
      ),
      normalizeTapAction(saved.optString("tapAction", "today")),
    )

    val save = Button(this).apply {
      text = "Salvar e ativar"
      textSize = 16f
      setTextColor(Color.WHITE)
      setBackgroundColor(Color.rgb(139, 92, 246))
      setPadding(dp(12), dp(12), dp(12), dp(12))
      setOnClickListener {
        val requestedStyle = selected(style, "nexus")
        val selectedOpacity = selected(opacity, "96").toIntOrNull()?.coerceIn(0, 100) ?: 96
        val selectedStyle = if (selectedOpacity == 0) "transparent" else requestedStyle
        val config = JSONObject()
          .put("schemaVersion", 3)
          .put("family", family)
          .put("style", selectedStyle)
          .put("content", normalizeContent(family, selected(content, contentOptions.first().first)))
          .put("opacityPercent", if (selectedStyle == "transparent") 0 else selectedOpacity)
          .put("accentColor", selected(accent, "#8B5CF6"))
          .put("mascot", mascot?.let { selected(it, "nexus") } ?: "nexus")
          .put("personality", personality?.let { selected(it, "happy") } ?: "happy")
          .put("speech", normalizeSpeech(speech?.let { selected(it, "contextual") } ?: "contextual"))
          .put("tapAction", normalizeTapAction(selected(tapAction, "today")))
          .put("privateMode", privacyFloor || selected(privateMode, "false") == "true")
        val persisted = preferences.edit()
          .putString("instance_$widgetId", config.toString())
          .putInt("page_$widgetId", 0)
          .commit()
        if (!persisted) return@setOnClickListener
        NexusWidgetProvider.updateAllWidgetFamilies(this@NexusWidgetConfigureActivity)
        setResult(
          RESULT_OK,
          Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId),
        )
        finish()
      }
    }
    root.addView(
      save,
      LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)).apply {
        topMargin = dp(22)
      },
    )
    root.addView(label(
      "Para trocar a família, remova este widget e adicione Mini, Strip, Companion, Mission ou Command pelo launcher.",
      12,
      Color.rgb(161, 161, 170),
    ).apply { setPadding(0, dp(16), 0, 0) })
    setContentView(ScrollView(this).apply { addView(root) })
  }

  private fun resolveFamily(): String? {
    val providerName = AppWidgetManager.getInstance(this)
      .getAppWidgetInfo(widgetId)
      ?.provider
      ?.className
      ?: return null
    return NexusWidgetProvider.familyForProviderClass(providerName)?.storageName
  }

  private fun loadConfiguration(preferences: SharedPreferences, family: String): JSONObject {
    val payload = try {
      JSONObject(preferences.getString(NexusWidgetProvider.PAYLOAD_KEY, "{}") ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }
    val appearance = payload.optJSONObject("appearance") ?: JSONObject()
    val shared = payload.optJSONObject("renderSpecs")?.optJSONObject(family)
      ?: payload.optJSONObject("renderSpec")
      ?: JSONObject()
    val colors = shared.optJSONObject("colors") ?: JSONObject()
    val mascot = shared.optJSONObject("mascot") ?: JSONObject()
    val actions = shared.optJSONObject("actions") ?: JSONObject()
    val instance = try {
      JSONObject(preferences.getString("instance_$widgetId", "{}") ?: "{}")
    } catch (_: Exception) {
      JSONObject()
    }
    val legacyPrivateMode = instance.optString("style") == "privacy" || instance.optString("content") == "private"
    val defaultContent = contentOptions(family).first().first
    val styleValue = instance.optString(
      "style",
      shared.optString("style", appearance.optString("style", "nexus")),
    )
    val opacityValue = when {
      instance.has("opacityPercent") -> instance.optDouble("opacityPercent", 96.0)
      instance.has("opacity") -> instance.optDouble("opacity", 0.96)
      shared.has("opacityPercent") -> shared.optDouble("opacityPercent", 96.0)
      else -> appearance.optDouble("opacity", 0.96)
    }
    val normalizedStyle = normalizeStyle(styleValue)
    val opacityPercent = normalizeOpacityValue(opacityValue)
    val globalPrivateMode = shared.optBoolean("privateMode", false) ||
      appearance.optBoolean("privacyMode", false)
    val instancePrivateMode = when {
      instance.has("privateMode") -> instance.optBoolean("privateMode", false)
      legacyPrivateMode -> true
      else -> false
    }
    val isPrivate = globalPrivateMode || instancePrivateMode

    return JSONObject()
      .put("style", normalizedStyle)
      .put(
        "content",
        normalizeContent(
          family,
          instance.optString(
            "content",
            shared.optString("content", appearance.optString("contentMode", defaultContent)),
          ),
        ),
      )
      .put("opacityPercent", if (normalizedStyle == "transparent") 0 else opacityPercent)
      .put(
        "accentColor",
        instance.optString("accentColor", colors.optString("accent", appearance.optString("accentColor", "#8B5CF6"))),
      )
      .put("mascot", instance.optString("mascot", mascot.optString("id", appearance.optString("mascot", "nexus"))))
      .put(
        "personality",
        instance.optString(
          "personality",
          instance.optString(
            "mood",
            mascot.optString("personality", appearance.optString("companionMood", "happy")),
          ),
        ),
      )
      .put(
        "speech",
        normalizeSpeech(
          instance.optString(
            "speech",
            mascot.optString("speech", appearance.optString("companionSpeech", "contextual")),
          ),
        ),
      )
      .put(
        "tapAction",
        normalizeTapAction(
          instance.optString(
            "tapAction",
            actions.optString("tap", appearance.optString("tapAction", "today")),
          ),
        ),
      )
      .put("privateMode", isPrivate)
      .put("privacyFloor", globalPrivateMode)
  }

  private fun familyLabel(family: String): String = when (family) {
    "mini" -> "MINI 1×1"
    "strip" -> "STRIP 2×1"
    "companion" -> "COMPANION 2×2"
    "mission" -> "MISSION 4×2"
    else -> "COMMAND 4×4"
  }

  private fun contentOptions(family: String): List<Pair<String, String>> = when (family) {
    "mini" -> listOf("streak" to "Streak", "xp" to "XP")
    "strip" -> listOf("nextAction" to "Próxima ação", "progress" to "Progresso")
    "companion" -> listOf("companion" to "Fala do Companion")
    "mission" -> listOf("mission" to "Missão + progresso", "tasks" to "Duas tarefas + progresso")
    else -> listOf("command" to "Command completo", "focus" to "Foco em destaque")
  }

  private fun normalizeContent(family: String, value: String): String = when (family) {
    "mini" -> if (value == "xp") "xp" else "streak"
    "strip" -> if (value == "progress") "progress" else "nextAction"
    "companion" -> "companion"
    "mission" -> if (value == "tasks") "tasks" else "mission"
    else -> if (value == "focus") "focus" else "command"
  }

  private fun normalizeStyle(value: String): String = when (value) {
    "nexus", "amoled", "transparent", "pixel", "minimal" -> value
    "gamer" -> "pixel"
    "privacy", "light" -> "minimal"
    else -> "nexus"
  }

  private fun normalizeSpeech(value: String): String = if (value == "silent") "silent" else "contextual"

  private fun normalizeTapAction(value: String): String = when (value) {
    "brain", "focus", "progress" -> value
    else -> "today"
  }

  private fun normalizeOpacity(saved: JSONObject): Int {
    val raw = when {
      saved.has("opacityPercent") -> saved.optDouble("opacityPercent", 96.0)
      saved.has("opacity") -> saved.optDouble("opacity", 0.96)
      saved.optString("style") == "transparent" -> 0.0
      else -> 96.0
    }
    val normalized = normalizeOpacityValue(raw)
    return listOf(0, 70, 85, 96, 100).minByOrNull { kotlin.math.abs(it - normalized) } ?: 96
  }

  private fun normalizeOpacityValue(raw: Double): Int {
    val percent = if (raw <= 1.0) raw * 100.0 else raw
    return percent.toInt().coerceIn(0, 100)
  }

  private fun radioSection(
    root: LinearLayout,
    title: String,
    options: List<Pair<String, String>>,
    default: String,
  ): RadioGroup {
    root.addView(label(title, 16, Color.WHITE).apply { setPadding(0, dp(16), 0, dp(7)) })
    val group = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
    options.forEach { (value, textValue) ->
      group.addView(RadioButton(this).apply {
        text = textValue
        tag = value
        textSize = 14f
        setTextColor(Color.rgb(247, 247, 248))
        buttonTintList = android.content.res.ColorStateList.valueOf(Color.rgb(139, 92, 246))
        isChecked = value == default
        setPadding(dp(4), dp(5), 0, dp(5))
      })
    }
    root.addView(group)
    return group
  }

  private fun selected(group: RadioGroup, fallback: String): String =
    group.findViewById<RadioButton>(group.checkedRadioButtonId)?.tag?.toString() ?: fallback

  private fun label(value: String, size: Int, color: Int) = TextView(this).apply {
    text = value
    textSize = size.toFloat()
    setTextColor(color)
  }

  private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()
}
