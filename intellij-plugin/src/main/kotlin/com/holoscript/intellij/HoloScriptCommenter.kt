package com.holoscript.intellij

import com.intellij.lang.Commenter

/**
 * Commenter for HoloScript (Ctrl+/ to toggle comments).
 */
class HoloScriptCommenter : Commenter {
    override fun getLineCommentPrefix(): String = "//"

    override fun getBlockCommentPrefix(): String = "/*"

    override fun getBlockCommentSuffix(): String = "*/"

    override fun getCommentedBlockCommentPrefix(): String? = null

    override fun getCommentedBlockCommentSuffix(): String? = null
}
