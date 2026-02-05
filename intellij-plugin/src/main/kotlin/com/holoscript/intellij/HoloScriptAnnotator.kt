package com.holoscript.intellij

import com.intellij.lang.annotation.AnnotationHolder
import com.intellij.lang.annotation.Annotator
import com.intellij.lang.annotation.HighlightSeverity
import com.intellij.openapi.editor.colors.TextAttributesKey
import com.intellij.psi.PsiElement

/**
 * Annotator for additional HoloScript highlighting.
 *
 * Provides semantic highlighting beyond lexer-based highlighting.
 */
class HoloScriptAnnotator : Annotator {

    companion object {
        // Known traits for validation
        private val KNOWN_TRAITS = setOf(
            "grabbable", "pointable", "collidable", "hoverable",
            "physics", "networked", "synced", "persistent",
            "animated", "glowing", "emissive", "billboard",
            "rotating", "clickable", "interactive", "lod",
            "audio_source", "spatial_audio", "voice_input",
            "ai_driver", "dialogue", "llm_agent",
            "shareable", "collaborative", "tweetable",
            "wot_thing", "mqtt_source", "mqtt_sink"
        )
    }

    override fun annotate(element: PsiElement, holder: AnnotationHolder) {
        val text = element.text

        // Highlight unknown traits with a warning
        if (text.startsWith("@") && text.length > 1) {
            val traitName = text.substring(1)
            if (traitName.isNotEmpty() && traitName !in KNOWN_TRAITS) {
                // Only warn for identifiers that look like trait names
                if (traitName.matches(Regex("^[a-z_][a-z0-9_]*$"))) {
                    holder.newAnnotation(HighlightSeverity.WEAK_WARNING, "Unknown trait: $text")
                        .range(element.textRange)
                        .create()
                }
            }
        }
    }
}
