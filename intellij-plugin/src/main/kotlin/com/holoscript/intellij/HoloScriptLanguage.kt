package com.holoscript.intellij

import com.intellij.lang.Language

/**
 * HoloScript language definition for IntelliJ Platform.
 */
object HoloScriptLanguage : Language("HoloScript") {
    override fun getDisplayName(): String = "HoloScript"

    override fun isCaseSensitive(): Boolean = true
}
