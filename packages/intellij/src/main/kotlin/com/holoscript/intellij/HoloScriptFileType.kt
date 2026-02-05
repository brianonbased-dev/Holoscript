package com.holoscript.intellij

import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

/**
 * HoloScript file type definition.
 * 
 * Supports .hs, .hsplus, and .holo extensions.
 */
class HoloScriptFileType private constructor() : LanguageFileType(HoloScriptLanguage) {
    
    companion object {
        @JvmStatic
        val INSTANCE = HoloScriptFileType()
    }
    
    override fun getName(): String = "HoloScript"
    
    override fun getDescription(): String = "HoloScript language file"
    
    override fun getDefaultExtension(): String = "hsplus"
    
    override fun getIcon(): Icon? = HoloScriptIcons.FILE
}

/**
 * Icons for HoloScript
 */
object HoloScriptIcons {
    // TODO: Load actual icon resources
    val FILE: Icon? = null
    val OBJECT: Icon? = null
    val TRAIT: Icon? = null
    val FUNCTION: Icon? = null
    val PROPERTY: Icon? = null
}
