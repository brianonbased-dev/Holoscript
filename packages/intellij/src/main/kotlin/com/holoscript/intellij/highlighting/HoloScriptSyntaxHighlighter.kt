package com.holoscript.intellij.highlighting

import com.holoscript.intellij.HoloScriptLanguage
import com.holoscript.intellij.lexer.HoloScriptLexer
import com.holoscript.intellij.lexer.HoloScriptTokenTypes
import com.intellij.lexer.Lexer
import com.intellij.openapi.editor.DefaultLanguageHighlighterColors
import com.intellij.openapi.editor.HighlighterColors
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.fileTypes.SyntaxHighlighterBase
import com.intellij.openapi.fileTypes.SyntaxHighlighterFactory
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.psi.tree.IElementType

/**
 * Syntax highlighter factory for HoloScript
 */
class HoloScriptSyntaxHighlighterFactory : SyntaxHighlighterFactory() {
    override fun getSyntaxHighlighter(project: Project?, virtualFile: VirtualFile?): SyntaxHighlighter {
        return HoloScriptSyntaxHighlighter()
    }
}

/**
 * Syntax highlighter for HoloScript
 * 
 * Provides color coding for:
 * - Keywords (orb, world, composition, etc.)
 * - Traits (@grabbable, @networked, etc.)
 * - Strings and numbers
 * - Comments
 * - Properties
 * - Event handlers
 */
class HoloScriptSyntaxHighlighter : SyntaxHighlighterBase() {
    
    companion object {
        // Color attribute keys
        val KEYWORD = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_KEYWORD",
            DefaultLanguageHighlighterColors.KEYWORD
        )
        
        val TRAIT = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_TRAIT",
            DefaultLanguageHighlighterColors.METADATA
        )
        
        val STRING = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_STRING",
            DefaultLanguageHighlighterColors.STRING
        )
        
        val NUMBER = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_NUMBER",
            DefaultLanguageHighlighterColors.NUMBER
        )
        
        val COMMENT = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_COMMENT",
            DefaultLanguageHighlighterColors.LINE_COMMENT
        )
        
        val BLOCK_COMMENT = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_BLOCK_COMMENT",
            DefaultLanguageHighlighterColors.BLOCK_COMMENT
        )
        
        val OBJECT_NAME = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_OBJECT_NAME",
            DefaultLanguageHighlighterColors.CLASS_NAME
        )
        
        val PROPERTY = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_PROPERTY",
            DefaultLanguageHighlighterColors.INSTANCE_FIELD
        )
        
        val EVENT = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_EVENT",
            DefaultLanguageHighlighterColors.FUNCTION_CALL
        )
        
        val OPERATOR = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_OPERATOR",
            DefaultLanguageHighlighterColors.OPERATION_SIGN
        )
        
        val BRACES = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_BRACES",
            DefaultLanguageHighlighterColors.BRACES
        )
        
        val BRACKETS = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_BRACKETS",
            DefaultLanguageHighlighterColors.BRACKETS
        )
        
        val PARENTHESES = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_PARENTHESES",
            DefaultLanguageHighlighterColors.PARENTHESES
        )
        
        val IDENTIFIER = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_IDENTIFIER",
            DefaultLanguageHighlighterColors.IDENTIFIER
        )
        
        val BAD_CHARACTER = TextAttributesKey.createTextAttributesKey(
            "HOLOSCRIPT_BAD_CHARACTER",
            HighlighterColors.BAD_CHARACTER
        )
        
        // Token to attributes mappings
        private val KEYWORD_KEYS = arrayOf(KEYWORD)
        private val TRAIT_KEYS = arrayOf(TRAIT)
        private val STRING_KEYS = arrayOf(STRING)
        private val NUMBER_KEYS = arrayOf(NUMBER)
        private val COMMENT_KEYS = arrayOf(COMMENT)
        private val BLOCK_COMMENT_KEYS = arrayOf(BLOCK_COMMENT)
        private val OBJECT_NAME_KEYS = arrayOf(OBJECT_NAME)
        private val PROPERTY_KEYS = arrayOf(PROPERTY)
        private val EVENT_KEYS = arrayOf(EVENT)
        private val OPERATOR_KEYS = arrayOf(OPERATOR)
        private val BRACES_KEYS = arrayOf(BRACES)
        private val BRACKETS_KEYS = arrayOf(BRACKETS)
        private val PARENTHESES_KEYS = arrayOf(PARENTHESES)
        private val IDENTIFIER_KEYS = arrayOf(IDENTIFIER)
        private val BAD_CHARACTER_KEYS = arrayOf(BAD_CHARACTER)
        private val EMPTY_KEYS = arrayOf<TextAttributesKey>()
    }
    
    override fun getHighlightingLexer(): Lexer = HoloScriptLexer()
    
    override fun getTokenHighlights(tokenType: IElementType?): Array<TextAttributesKey> {
        return when (tokenType) {
            HoloScriptTokenTypes.KEYWORD -> KEYWORD_KEYS
            HoloScriptTokenTypes.TRAIT -> TRAIT_KEYS
            HoloScriptTokenTypes.STRING -> STRING_KEYS
            HoloScriptTokenTypes.NUMBER -> NUMBER_KEYS
            HoloScriptTokenTypes.LINE_COMMENT -> COMMENT_KEYS
            HoloScriptTokenTypes.BLOCK_COMMENT -> BLOCK_COMMENT_KEYS
            HoloScriptTokenTypes.OBJECT_NAME -> OBJECT_NAME_KEYS
            HoloScriptTokenTypes.PROPERTY -> PROPERTY_KEYS
            HoloScriptTokenTypes.EVENT -> EVENT_KEYS
            HoloScriptTokenTypes.OPERATOR -> OPERATOR_KEYS
            HoloScriptTokenTypes.LBRACE, HoloScriptTokenTypes.RBRACE -> BRACES_KEYS
            HoloScriptTokenTypes.LBRACKET, HoloScriptTokenTypes.RBRACKET -> BRACKETS_KEYS
            HoloScriptTokenTypes.LPAREN, HoloScriptTokenTypes.RPAREN -> PARENTHESES_KEYS
            HoloScriptTokenTypes.IDENTIFIER -> IDENTIFIER_KEYS
            HoloScriptTokenTypes.BAD_CHARACTER -> BAD_CHARACTER_KEYS
            else -> EMPTY_KEYS
        }
    }
}
