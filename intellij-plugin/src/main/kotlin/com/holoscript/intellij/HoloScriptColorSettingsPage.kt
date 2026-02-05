package com.holoscript.intellij

import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.openapi.fileTypes.SyntaxHighlighter
import com.intellij.openapi.options.colors.AttributesDescriptor
import com.intellij.openapi.options.colors.ColorDescriptor
import com.intellij.openapi.options.colors.ColorSettingsPage
import javax.swing.Icon

/**
 * Color settings page for HoloScript syntax highlighting customization.
 */
class HoloScriptColorSettingsPage : ColorSettingsPage {

    companion object {
        private val DESCRIPTORS = arrayOf(
            AttributesDescriptor("Keyword", HoloScriptSyntaxHighlighter.KEYWORD),
            AttributesDescriptor("Trait", HoloScriptSyntaxHighlighter.TRAIT),
            AttributesDescriptor("String", HoloScriptSyntaxHighlighter.STRING),
            AttributesDescriptor("Number", HoloScriptSyntaxHighlighter.NUMBER),
            AttributesDescriptor("Comment", HoloScriptSyntaxHighlighter.COMMENT),
            AttributesDescriptor("Identifier", HoloScriptSyntaxHighlighter.IDENTIFIER),
            AttributesDescriptor("Property", HoloScriptSyntaxHighlighter.PROPERTY),
            AttributesDescriptor("Type", HoloScriptSyntaxHighlighter.TYPE),
            AttributesDescriptor("Operator", HoloScriptSyntaxHighlighter.OPERATOR),
            AttributesDescriptor("Braces", HoloScriptSyntaxHighlighter.BRACE),
            AttributesDescriptor("Brackets", HoloScriptSyntaxHighlighter.BRACKET),
            AttributesDescriptor("Bad character", HoloScriptSyntaxHighlighter.BAD_CHARACTER)
        )
    }

    override fun getIcon(): Icon = HoloScriptIcons.FILE

    override fun getHighlighter(): SyntaxHighlighter = HoloScriptSyntaxHighlighter()

    override fun getDemoText(): String = """
        // HoloScript Example Scene
        composition "My VR Room" {
          @manifest {
            title: "Interactive VR Demo"
            version: "1.0.0"
            author: "HoloScript Developer"
          }

          // Interactive button with physics
          orb myButton {
            @grabbable
            @physics { mass: 1.5 }
            @collidable

            position: [0, 1.5, -2]
            scale: 0.15
            color: "#4A90D9"

            onGrab: {
              console.log("Button grabbed!")
            }
          }

          // Networked player tracker
          entity playerTracker {
            @networked
            @synced { interpolate: true }

            position: [0, 0, 0]
            players: []
          }
        }
    """.trimIndent()

    override fun getAdditionalHighlightingTagToDescriptorMap(): Map<String, TextAttributesKey>? = null

    override fun getAttributeDescriptors(): Array<AttributesDescriptor> = DESCRIPTORS

    override fun getColorDescriptors(): Array<ColorDescriptor> = ColorDescriptor.EMPTY_ARRAY

    override fun getDisplayName(): String = "HoloScript"
}
