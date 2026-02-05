package com.holoscript.intellij

import com.intellij.lang.ASTNode
import com.intellij.lang.ParserDefinition
import com.intellij.lang.PsiParser
import com.intellij.lexer.Lexer
import com.intellij.openapi.project.Project
import com.intellij.psi.FileViewProvider
import com.intellij.psi.PsiElement
import com.intellij.psi.PsiFile
import com.intellij.psi.tree.IFileElementType
import com.intellij.psi.tree.TokenSet

/**
 * Parser definition for HoloScript.
 *
 * Since we use LSP for most language features, this provides
 * minimal parsing for basic IDE integration.
 */
class HoloScriptParserDefinition : ParserDefinition {

    companion object {
        val FILE = IFileElementType(HoloScriptLanguage)
    }

    override fun createLexer(project: Project?): Lexer = HoloScriptLexer()

    override fun createParser(project: Project?): PsiParser = HoloScriptParser()

    override fun getFileNodeType(): IFileElementType = FILE

    override fun getCommentTokens(): TokenSet = HoloScriptTokenTypes.COMMENTS

    override fun getStringLiteralElements(): TokenSet = HoloScriptTokenTypes.STRINGS

    override fun getWhitespaceTokens(): TokenSet = HoloScriptTokenTypes.WHITESPACES

    override fun createElement(node: ASTNode): PsiElement = HoloScriptPsiElement(node)

    override fun createFile(viewProvider: FileViewProvider): PsiFile = HoloScriptFile(viewProvider)
}
