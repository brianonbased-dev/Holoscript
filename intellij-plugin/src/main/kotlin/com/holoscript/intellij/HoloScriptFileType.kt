package com.holoscript.intellij

import com.intellij.openapi.fileTypes.LanguageFileType
import javax.swing.Icon

/**
 * HoloScript file type for .holo and .hsplus files.
 */
object HoloScriptFileType : LanguageFileType(HoloScriptLanguage) {

    override fun getName(): String = "HoloScript"

    override fun getDescription(): String = "HoloScript VR/XR scene definition file"

    override fun getDefaultExtension(): String = "holo"

    override fun getIcon(): Icon = HoloScriptIcons.FILE
}
