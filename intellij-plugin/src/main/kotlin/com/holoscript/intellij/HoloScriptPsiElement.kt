package com.holoscript.intellij

import com.intellij.extapi.psi.ASTWrapperPsiElement
import com.intellij.lang.ASTNode

/**
 * Base PSI element for HoloScript.
 */
open class HoloScriptPsiElement(node: ASTNode) : ASTWrapperPsiElement(node)
