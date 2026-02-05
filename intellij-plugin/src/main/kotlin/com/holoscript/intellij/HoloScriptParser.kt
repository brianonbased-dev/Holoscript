package com.holoscript.intellij

import com.intellij.lang.ASTNode
import com.intellij.lang.PsiBuilder
import com.intellij.lang.PsiParser
import com.intellij.psi.tree.IElementType

/**
 * Simple parser for HoloScript.
 *
 * Since we rely on LSP for semantic analysis, this parser just
 * creates a flat structure of tokens for basic IDE features.
 */
class HoloScriptParser : PsiParser {
    override fun parse(root: IElementType, builder: PsiBuilder): ASTNode {
        val rootMarker = builder.mark()

        while (!builder.eof()) {
            builder.advanceLexer()
        }

        rootMarker.done(root)
        return builder.treeBuilt
    }
}
