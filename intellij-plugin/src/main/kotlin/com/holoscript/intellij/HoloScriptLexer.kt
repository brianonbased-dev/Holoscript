package com.holoscript.intellij

import com.intellij.lexer.LexerBase
import com.intellij.psi.tree.IElementType

/**
 * Lexer for HoloScript files.
 *
 * Tokenizes HoloScript source code for syntax highlighting.
 */
class HoloScriptLexer : LexerBase() {
    private var buffer: CharSequence = ""
    private var startOffset: Int = 0
    private var endOffset: Int = 0
    private var currentOffset: Int = 0
    private var currentTokenType: IElementType? = null
    private var currentTokenEnd: Int = 0

    companion object {
        // HoloScript keywords
        private val KEYWORDS = setOf(
            "composition", "world", "orb", "entity", "object", "template",
            "group", "cube", "sphere", "plane", "cylinder", "mesh",
            "npc", "quest", "ability", "dialogue", "state_machine",
            "achievement", "talent_tree", "environment", "logic",
            "if", "else", "for", "while", "return", "true", "false", "null",
            "function", "const", "let", "var", "import", "export", "from", "as",
            "using", "extends", "implements"
        )

        // HoloScript object types
        private val TYPES = setOf(
            "orb", "entity", "object", "composition", "world", "template",
            "cube", "sphere", "plane", "cylinder", "group", "mesh",
            "npc", "quest", "ability", "dialogue", "state_machine",
            "achievement", "talent_tree", "environment"
        )
    }

    override fun start(buffer: CharSequence, startOffset: Int, endOffset: Int, initialState: Int) {
        this.buffer = buffer
        this.startOffset = startOffset
        this.endOffset = endOffset
        this.currentOffset = startOffset
        advance()
    }

    override fun getState(): Int = 0

    override fun getTokenType(): IElementType? = currentTokenType

    override fun getTokenStart(): Int = currentOffset - (currentTokenEnd - currentOffset).coerceAtLeast(0)

    override fun getTokenEnd(): Int = currentTokenEnd

    override fun getBufferSequence(): CharSequence = buffer

    override fun getBufferEnd(): Int = endOffset

    override fun advance() {
        if (currentOffset >= endOffset) {
            currentTokenType = null
            return
        }

        val tokenStart = currentOffset
        val char = buffer[currentOffset]

        currentTokenType = when {
            // Whitespace
            char.isWhitespace() -> {
                skipWhitespace()
                HoloScriptTokenTypes.WHITE_SPACE
            }

            // Comments
            char == '/' && peekNext() == '/' -> {
                skipLineComment()
                HoloScriptTokenTypes.COMMENT
            }
            char == '/' && peekNext() == '*' -> {
                skipBlockComment()
                HoloScriptTokenTypes.BLOCK_COMMENT
            }
            char == '#' -> {
                skipLineComment()
                HoloScriptTokenTypes.COMMENT
            }

            // Trait annotations
            char == '@' -> {
                currentOffset++
                skipIdentifier()
                HoloScriptTokenTypes.TRAIT
            }

            // Strings
            char == '"' || char == '\'' -> {
                skipString(char)
                HoloScriptTokenTypes.STRING
            }

            // Numbers
            char.isDigit() || (char == '-' && peekNext()?.isDigit() == true) -> {
                skipNumber()
                HoloScriptTokenTypes.NUMBER
            }

            // Identifiers and keywords
            char.isLetter() || char == '_' -> {
                val word = readWord()
                when {
                    word in TYPES && isTypeContext() -> HoloScriptTokenTypes.TYPE
                    word in KEYWORDS -> HoloScriptTokenTypes.KEYWORD
                    isPropertyContext() -> HoloScriptTokenTypes.PROPERTY
                    else -> HoloScriptTokenTypes.IDENTIFIER
                }
            }

            // Operators and punctuation
            char == ':' -> { currentOffset++; HoloScriptTokenTypes.COLON }
            char == ',' -> { currentOffset++; HoloScriptTokenTypes.COMMA }
            char == '.' -> { currentOffset++; HoloScriptTokenTypes.DOT }
            char == '=' -> {
                if (peekNext() == '>') {
                    currentOffset += 2
                    HoloScriptTokenTypes.ARROW
                } else {
                    currentOffset++
                    HoloScriptTokenTypes.EQUALS
                }
            }
            char == '{' -> { currentOffset++; HoloScriptTokenTypes.LBRACE }
            char == '}' -> { currentOffset++; HoloScriptTokenTypes.RBRACE }
            char == '[' -> { currentOffset++; HoloScriptTokenTypes.LBRACKET }
            char == ']' -> { currentOffset++; HoloScriptTokenTypes.RBRACKET }
            char == '(' -> { currentOffset++; HoloScriptTokenTypes.LPAREN }
            char == ')' -> { currentOffset++; HoloScriptTokenTypes.RPAREN }
            char in "+-*/<>!&|^%" -> {
                currentOffset++
                HoloScriptTokenTypes.OPERATOR
            }

            else -> {
                currentOffset++
                HoloScriptTokenTypes.BAD_CHARACTER
            }
        }

        currentTokenEnd = currentOffset
        currentOffset = tokenStart
        currentOffset = currentTokenEnd
    }

    private fun peekNext(): Char? {
        return if (currentOffset + 1 < endOffset) buffer[currentOffset + 1] else null
    }

    private fun skipWhitespace() {
        while (currentOffset < endOffset && buffer[currentOffset].isWhitespace()) {
            currentOffset++
        }
    }

    private fun skipLineComment() {
        while (currentOffset < endOffset && buffer[currentOffset] != '\n') {
            currentOffset++
        }
    }

    private fun skipBlockComment() {
        currentOffset += 2 // Skip /*
        while (currentOffset < endOffset - 1) {
            if (buffer[currentOffset] == '*' && buffer[currentOffset + 1] == '/') {
                currentOffset += 2
                return
            }
            currentOffset++
        }
        currentOffset = endOffset
    }

    private fun skipString(quote: Char) {
        currentOffset++ // Skip opening quote
        while (currentOffset < endOffset) {
            val char = buffer[currentOffset]
            if (char == quote) {
                currentOffset++
                return
            }
            if (char == '\\' && currentOffset + 1 < endOffset) {
                currentOffset += 2 // Skip escaped character
            } else {
                currentOffset++
            }
        }
    }

    private fun skipNumber() {
        if (buffer[currentOffset] == '-') currentOffset++
        while (currentOffset < endOffset && (buffer[currentOffset].isDigit() || buffer[currentOffset] == '.')) {
            currentOffset++
        }
        // Handle scientific notation
        if (currentOffset < endOffset && buffer[currentOffset] in "eE") {
            currentOffset++
            if (currentOffset < endOffset && buffer[currentOffset] in "+-") {
                currentOffset++
            }
            while (currentOffset < endOffset && buffer[currentOffset].isDigit()) {
                currentOffset++
            }
        }
    }

    private fun skipIdentifier() {
        while (currentOffset < endOffset) {
            val char = buffer[currentOffset]
            if (char.isLetterOrDigit() || char == '_') {
                currentOffset++
            } else {
                break
            }
        }
    }

    private fun readWord(): String {
        val start = currentOffset
        skipIdentifier()
        return buffer.substring(start, currentOffset)
    }

    private fun isTypeContext(): Boolean {
        // Simple heuristic: types usually appear at the start of a line (after whitespace)
        // or after certain keywords
        return true
    }

    private fun isPropertyContext(): Boolean {
        // Property context is when followed by a colon
        val lookAhead = currentOffset
        var pos = lookAhead
        while (pos < endOffset && buffer[pos].isWhitespace()) {
            pos++
        }
        return pos < endOffset && buffer[pos] == ':'
    }
}
