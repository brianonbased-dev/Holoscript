package com.holoscript.intellij

import com.intellij.extapi.psi.PsiFileBase
import com.intellij.openapi.fileTypes.FileType
import com.intellij.psi.FileViewProvider

/**
 * PSI file for HoloScript.
 */
class HoloScriptFile(viewProvider: FileViewProvider) : PsiFileBase(viewProvider, HoloScriptLanguage) {
    override fun getFileType(): FileType = HoloScriptFileType

    override fun toString(): String = "HoloScript File"
}
