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
    
    override fun getIcon(): Icon = HoloScriptIcons.FILE
}

/**
 * Icons for HoloScript
 */
object HoloScriptIcons {
    private fun loadIcon(path: String): Icon = com.intellij.openapi.util.IconLoader.getIcon(path, HoloScriptIcons::class.java)
    
    val FILE: Icon = loadIcon("/icons/holoscript.svg")
    val OBJECT: Icon = loadIcon("/icons/object.svg")
    val TRAIT: Icon = loadIcon("/icons/trait.svg")
    val FUNCTION: Icon = loadIcon("/icons/function.svg")
    val PROPERTY: Icon = loadIcon("/icons/property.svg")
}
