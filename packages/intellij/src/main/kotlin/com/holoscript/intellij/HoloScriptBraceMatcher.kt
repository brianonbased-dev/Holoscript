package com.holoscript.intellij

import com.holoscript.intellij.lexer.HoloScriptTokenTypes
import com.intellij.lang.BracePair
import com.intellij.lang.PairedBraceMatcher
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IElementType

/**
 * Brace matcher for HoloScript
 * 
 * Matches:
 * - { } for blocks
 * - [ ] for arrays
 * - ( ) for function calls
 */
class HoloScriptBraceMatcher : PairedBraceMatcher {
    
    companion object {
        private val PAIRS = arrayOf(
            BracePair(HoloScriptTokenTypes.LBRACE, HoloScriptTokenTypes.RBRACE, true),
            BracePair(HoloScriptTokenTypes.LBRACKET, HoloScriptTokenTypes.RBRACKET, false),
            BracePair(HoloScriptTokenTypes.LPAREN, HoloScriptTokenTypes.RPAREN, false)
        )
    }
    
    override fun getPairs(): Array<BracePair> = PAIRS
    
    override fun isPairedBracesAllowedBeforeType(
        lbraceType: IElementType,
        contextType: IElementType?
    ): Boolean {
        return true
    }
    
    override fun getCodeConstructStart(file: PsiFile, openingBraceOffset: Int): Int {
        return openingBraceOffset
    }
}
