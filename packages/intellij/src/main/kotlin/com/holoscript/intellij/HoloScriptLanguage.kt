package com.holoscript.intellij

import com.intellij.lang.Language

/**
 * The HoloScript language definition.
 */
object HoloScriptLanguage : Language("HoloScript") {
    
    override fun getDisplayName(): String = "HoloScript"
    
    override fun isCaseSensitive(): Boolean = true
    
    override fun getAssociatedFileType() = HoloScriptFileType.INSTANCE
}
