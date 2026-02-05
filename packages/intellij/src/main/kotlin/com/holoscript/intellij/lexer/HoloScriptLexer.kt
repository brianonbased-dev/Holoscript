package com.holoscript.intellij.lexer

import com.holoscript.intellij.HoloScriptLanguage
import com.intellij.lexer.LexerBase
import com.intellij.psi.tree.IElementType

/**
 * Token types for HoloScript lexer
 */
object HoloScriptTokenTypes {
    // Keywords
    val KEYWORD = IElementType("KEYWORD", HoloScriptLanguage)
    
    // Traits (@annotations)
    val TRAIT = IElementType("TRAIT", HoloScriptLanguage)
    
    // Literals
    val STRING = IElementType("STRING", HoloScriptLanguage)
    val NUMBER = IElementType("NUMBER", HoloScriptLanguage)
    val BOOLEAN = IElementType("BOOLEAN", HoloScriptLanguage)
    
    // Comments
    val LINE_COMMENT = IElementType("LINE_COMMENT", HoloScriptLanguage)
    val BLOCK_COMMENT = IElementType("BLOCK_COMMENT", HoloScriptLanguage)
    
    // Identifiers
    val IDENTIFIER = IElementType("IDENTIFIER", HoloScriptLanguage)
    val OBJECT_NAME = IElementType("OBJECT_NAME", HoloScriptLanguage)
    val PROPERTY = IElementType("PROPERTY", HoloScriptLanguage)
    val EVENT = IElementType("EVENT", HoloScriptLanguage)
    
    // Operators and punctuation
    val OPERATOR = IElementType("OPERATOR", HoloScriptLanguage)
    val COLON = IElementType("COLON", HoloScriptLanguage)
    val COMMA = IElementType("COMMA", HoloScriptLanguage)
    val DOT = IElementType("DOT", HoloScriptLanguage)
    
    // Brackets
    val LBRACE = IElementType("LBRACE", HoloScriptLanguage)
    val RBRACE = IElementType("RBRACE", HoloScriptLanguage)
    val LBRACKET = IElementType("LBRACKET", HoloScriptLanguage)
    val RBRACKET = IElementType("RBRACKET", HoloScriptLanguage)
    val LPAREN = IElementType("LPAREN", HoloScriptLanguage)
    val RPAREN = IElementType("RPAREN", HoloScriptLanguage)
    
    // Whitespace
    val WHITESPACE = IElementType("WHITESPACE", HoloScriptLanguage)
    val NEWLINE = IElementType("NEWLINE", HoloScriptLanguage)
    
    // Error
    val BAD_CHARACTER = IElementType("BAD_CHARACTER", HoloScriptLanguage)
}

/**
 * HoloScript lexer implementation
 * 
 * Tokenizes HoloScript source code for syntax highlighting.
 */
class HoloScriptLexer : LexerBase() {
    
    private var buffer: CharSequence = ""
    private var bufferEnd: Int = 0
    private var tokenStart: Int = 0
    private var tokenEnd: Int = 0
    private var currentToken: IElementType? = null
    
    companion object {
        private val KEYWORDS = setOf(
            "orb", "world", "composition", "template", "object", "system", "environment",
            "if", "else", "while", "for", "return", "break", "continue",
            "import", "from", "export", "as",
            "true", "false", "null", "undefined",
            "state", "logic", "animation", "physics", "spatial_group", "networked_object",
            "using", "extends", "connect", "execute", "function"
        )
        
        private val TRAITS = setOf(
            "grabbable", "throwable", "holdable", "clickable", "hoverable", "draggable",
            "pointable", "scalable", "collidable", "physics", "rigid", "kinematic",
            "trigger", "gravity", "glowing", "emissive", "transparent", "reflective",
            "animated", "billboard", "networked", "synced", "persistent", "owned",
            "host_only", "stackable", "attachable", "equippable", "consumable",
            "destructible", "anchor", "tracked", "world_locked", "hand_tracked",
            "eye_tracked", "spatial_audio", "ambient", "voice_activated", "state",
            "reactive", "observable", "computed"
        )
    }
    
    override fun start(buffer: CharSequence, startOffset: Int, endOffset: Int, initialState: Int) {
        this.buffer = buffer
        this.bufferEnd = endOffset
        this.tokenStart = startOffset
        this.tokenEnd = startOffset
        advance()
    }
    
    override fun getState(): Int = 0
    
    override fun getTokenType(): IElementType? = currentToken
    
    override fun getTokenStart(): Int = tokenStart
    
    override fun getTokenEnd(): Int = tokenEnd
    
    override fun getBufferSequence(): CharSequence = buffer
    
    override fun getBufferEnd(): Int = bufferEnd
    
    override fun advance() {
        tokenStart = tokenEnd
        
        if (tokenStart >= bufferEnd) {
            currentToken = null
            return
        }
        
        val c = buffer[tokenStart]
        
        currentToken = when {
            c.isWhitespace() -> {
                tokenEnd = skipWhitespace()
                if (c == '\n' || c == '\r') HoloScriptTokenTypes.NEWLINE 
                else HoloScriptTokenTypes.WHITESPACE
            }
            c == '/' && tokenStart + 1 < bufferEnd -> {
                val next = buffer[tokenStart + 1]
                when (next) {
                    '/' -> {
                        tokenEnd = skipLineComment()
                        HoloScriptTokenTypes.LINE_COMMENT
                    }
                    '*' -> {
                        tokenEnd = skipBlockComment()
                        HoloScriptTokenTypes.BLOCK_COMMENT
                    }
                    else -> {
                        tokenEnd = tokenStart + 1
                        HoloScriptTokenTypes.OPERATOR
                    }
                }
            }
            c == '#' -> {
                tokenEnd = skipLineComment()
                HoloScriptTokenTypes.LINE_COMMENT
            }
            c == '@' -> {
                tokenEnd = readTrait()
                HoloScriptTokenTypes.TRAIT
            }
            c == '"' || c == '\'' -> {
                tokenEnd = readString(c)
                HoloScriptTokenTypes.STRING
            }
            c.isDigit() || (c == '-' && tokenStart + 1 < bufferEnd && buffer[tokenStart + 1].isDigit()) -> {
                tokenEnd = readNumber()
                HoloScriptTokenTypes.NUMBER
            }
            c.isLetter() || c == '_' -> {
                tokenEnd = readIdentifier()
                val text = buffer.subSequence(tokenStart, tokenEnd).toString()
                when {
                    text in KEYWORDS -> HoloScriptTokenTypes.KEYWORD
                    text == "true" || text == "false" -> HoloScriptTokenTypes.BOOLEAN
                    text.startsWith("on") || text.startsWith("on_") -> HoloScriptTokenTypes.EVENT
                    else -> HoloScriptTokenTypes.IDENTIFIER
                }
            }
            c == '{' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.LBRACE }
            c == '}' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.RBRACE }
            c == '[' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.LBRACKET }
            c == ']' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.RBRACKET }
            c == '(' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.LPAREN }
            c == ')' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.RPAREN }
            c == ':' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.COLON }
            c == ',' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.COMMA }
            c == '.' -> { tokenEnd = tokenStart + 1; HoloScriptTokenTypes.DOT }
            c in "+-*/<>=!&|" -> {
                tokenEnd = readOperator()
                HoloScriptTokenTypes.OPERATOR
            }
            else -> {
                tokenEnd = tokenStart + 1
                HoloScriptTokenTypes.BAD_CHARACTER
            }
        }
    }
    
    private fun skipWhitespace(): Int {
        var pos = tokenStart
        while (pos < bufferEnd && buffer[pos].isWhitespace()) {
            pos++
        }
        return pos
    }
    
    private fun skipLineComment(): Int {
        var pos = tokenStart
        while (pos < bufferEnd && buffer[pos] != '\n' && buffer[pos] != '\r') {
            pos++
        }
        return pos
    }
    
    private fun skipBlockComment(): Int {
        var pos = tokenStart + 2 // Skip /*
        while (pos + 1 < bufferEnd) {
            if (buffer[pos] == '*' && buffer[pos + 1] == '/') {
                return pos + 2
            }
            pos++
        }
        return bufferEnd
    }
    
    private fun readTrait(): Int {
        var pos = tokenStart + 1 // Skip @
        while (pos < bufferEnd && (buffer[pos].isLetterOrDigit() || buffer[pos] == '_')) {
            pos++
        }
        return pos
    }
    
    private fun readString(quote: Char): Int {
        var pos = tokenStart + 1 // Skip opening quote
        while (pos < bufferEnd) {
            val c = buffer[pos]
            if (c == quote) {
                return pos + 1
            }
            if (c == '\\' && pos + 1 < bufferEnd) {
                pos++ // Skip escaped character
            }
            pos++
        }
        return bufferEnd
    }
    
    private fun readNumber(): Int {
        var pos = tokenStart
        if (buffer[pos] == '-') pos++
        
        while (pos < bufferEnd && buffer[pos].isDigit()) {
            pos++
        }
        
        // Decimal point
        if (pos < bufferEnd && buffer[pos] == '.' && pos + 1 < bufferEnd && buffer[pos + 1].isDigit()) {
            pos++
            while (pos < bufferEnd && buffer[pos].isDigit()) {
                pos++
            }
        }
        
        // Exponent
        if (pos < bufferEnd && (buffer[pos] == 'e' || buffer[pos] == 'E')) {
            pos++
            if (pos < bufferEnd && (buffer[pos] == '+' || buffer[pos] == '-')) {
                pos++
            }
            while (pos < bufferEnd && buffer[pos].isDigit()) {
                pos++
            }
        }
        
        return pos
    }
    
    private fun readIdentifier(): Int {
        var pos = tokenStart
        while (pos < bufferEnd && (buffer[pos].isLetterOrDigit() || buffer[pos] == '_')) {
            pos++
        }
        return pos
    }
    
    private fun readOperator(): Int {
        var pos = tokenStart + 1
        // Handle multi-character operators
        if (pos < bufferEnd) {
            val twoChar = buffer.subSequence(tokenStart, pos + 1).toString()
            if (twoChar in listOf("==", "!=", "<=", ">=", "&&", "||", "->", "=>")) {
                return pos + 1
            }
        }
        return pos
    }
}
