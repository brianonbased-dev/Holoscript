package com.holoscript.intellij

import com.intellij.lang.BracePair
import com.intellij.lang.PairedBraceMatcher
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IElementType

/**
 * Brace matcher for HoloScript.
 */
class HoloScriptBraceMatcher : PairedBraceMatcher {

    private val pairs = arrayOf(
        BracePair(HoloScriptTokenTypes.LBRACE, HoloScriptTokenTypes.RBRACE, true),
        BracePair(HoloScriptTokenTypes.LBRACKET, HoloScriptTokenTypes.RBRACKET, false),
        BracePair(HoloScriptTokenTypes.LPAREN, HoloScriptTokenTypes.RPAREN, false)
    )

    override fun getPairs(): Array<BracePair> = pairs

    override fun isPairedBracesAllowedBeforeType(
        lbraceType: IElementType,
        contextType: IElementType?
    ): Boolean = true

    override fun getCodeConstructStart(
        file: PsiFile?,
        openingBraceOffset: Int
    ): Int = openingBraceOffset
}
