package com.holoscript.intellij

import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.HighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.editor.colors.TextAttributesKey.createTextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.openapi.fileTypes.SyntaxHighlighterFactory
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.tree.IElementType

/**
 * Syntax highlighter for HoloScript files.
 */
class HoloScriptSyntaxHighlighter : SyntaxHighlighterBase() {

    override fun getHighlightingLexer(): Lexer = HoloScriptLexer()

    override fun getTokenHighlights(tokenType: IElementType): Array<TextAttributesKey> {
        return when (tokenType) {
            HoloScriptTokenTypes.KEYWORD -> KEYWORD_KEYS
            HoloScriptTokenTypes.TRAIT -> TRAIT_KEYS
            HoloScriptTokenTypes.STRING -> STRING_KEYS
            HoloScriptTokenTypes.NUMBER -> NUMBER_KEYS
            HoloScriptTokenTypes.COMMENT -> COMMENT_KEYS
            HoloScriptTokenTypes.IDENTIFIER -> IDENTIFIER_KEYS
            HoloScriptTokenTypes.OPERATOR -> OPERATOR_KEYS
            HoloScriptTokenTypes.BRACE -> BRACE_KEYS
            HoloScriptTokenTypes.BRACKET -> BRACKET_KEYS
            HoloScriptTokenTypes.PROPERTY -> PROPERTY_KEYS
            HoloScriptTokenTypes.TYPE -> TYPE_KEYS
            HoloScriptTokenTypes.BAD_CHARACTER -> BAD_CHAR_KEYS
            else -> EMPTY_KEYS
        }
    }

    companion object {
        // Text attribute keys
        val KEYWORD = createTextAttributesKey("HOLOSCRIPT_KEYWORD", DefaultLanguageHighlighterColors.KEYWORD)
        val TRAIT = createTextAttributesKey("HOLOSCRIPT_TRAIT", DefaultLanguageHighlighterColors.METADATA)
        val STRING = createTextAttributesKey("HOLOSCRIPT_STRING", DefaultLanguageHighlighterColors.STRING)
        val NUMBER = createTextAttributesKey("HOLOSCRIPT_NUMBER", DefaultLanguageHighlighterColors.NUMBER)
        val COMMENT = createTextAttributesKey("HOLOSCRIPT_COMMENT", DefaultLanguageHighlighterColors.LINE_COMMENT)
        val IDENTIFIER = createTextAttributesKey("HOLOSCRIPT_IDENTIFIER", DefaultLanguageHighlighterColors.IDENTIFIER)
        val OPERATOR = createTextAttributesKey("HOLOSCRIPT_OPERATOR", DefaultLanguageHighlighterColors.OPERATION_SIGN)
        val BRACE = createTextAttributesKey("HOLOSCRIPT_BRACE", DefaultLanguageHighlighterColors.BRACES)
        val BRACKET = createTextAttributesKey("HOLOSCRIPT_BRACKET", DefaultLanguageHighlighterColors.BRACKETS)
        val PROPERTY = createTextAttributesKey("HOLOSCRIPT_PROPERTY", DefaultLanguageHighlighterColors.INSTANCE_FIELD)
        val TYPE = createTextAttributesKey("HOLOSCRIPT_TYPE", DefaultLanguageHighlighterColors.CLASS_NAME)
        val BAD_CHARACTER = createTextAttributesKey("HOLOSCRIPT_BAD_CHARACTER", HighlighterColors.BAD_CHARACTER)

        // Token to key mappings
        private val KEYWORD_KEYS = arrayOf(KEYWORD)
        private val TRAIT_KEYS = arrayOf(TRAIT)
        private val STRING_KEYS = arrayOf(STRING)
        private val NUMBER_KEYS = arrayOf(NUMBER)
        private val COMMENT_KEYS = arrayOf(COMMENT)
        private val IDENTIFIER_KEYS = arrayOf(IDENTIFIER)
        private val OPERATOR_KEYS = arrayOf(OPERATOR)
        private val BRACE_KEYS = arrayOf(BRACE)
        private val BRACKET_KEYS = arrayOf(BRACKET)
        private val PROPERTY_KEYS = arrayOf(PROPERTY)
        private val TYPE_KEYS = arrayOf(TYPE)
        private val BAD_CHAR_KEYS = arrayOf(BAD_CHARACTER)
        private val EMPTY_KEYS = emptyArray<TextAttributesKey>()
    }
}

/**
 * Factory for HoloScript syntax highlighter.
 */
class HoloScriptSyntaxHighlighterFactory : SyntaxHighlighterFactory() {
    override fun getSyntaxHighlighter(project: Project?, virtualFile: VirtualFile?): SyntaxHighlighter {
        return HoloScriptSyntaxHighlighter()
    }
}
