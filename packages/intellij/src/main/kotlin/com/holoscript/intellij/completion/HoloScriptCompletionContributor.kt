package com.holoscript.intellij.completion

import com.holoscript.intellij.HoloScriptLanguage
import com.holoscript.intellij.lexer.HoloScriptTokenTypes
import com.intellij.codeInsight.completion.*
import com.intellij.codeInsight.lookup.LookupElementBuilder
import com.intellij.patterns.PlatformPatterns
import com.intellij.util.ProcessingContext

/**
 * Completion contributor for HoloScript
 * 
 * Provides code completions for:
 * - Keywords
 * - Traits
 * - Event handlers
 * - Properties
 * - Geometry types
 */
class HoloScriptCompletionContributor : CompletionContributor() {
    
    init {
        // Keyword completions
        extend(
            CompletionType.BASIC,
            PlatformPatterns.psiElement().withLanguage(HoloScriptLanguage),
            KeywordCompletionProvider()
        )
        
        // Trait completions (after @)
        extend(
            CompletionType.BASIC,
            PlatformPatterns.psiElement().afterLeaf("@"),
            TraitCompletionProvider()
        )
    }
    
    /**
     * Provider for keyword completions
     */
    private class KeywordCompletionProvider : CompletionProvider<CompletionParameters>() {
        
        companion object {
            private val KEYWORDS = listOf(
                "orb" to "Declare an interactive object",
                "world" to "Declare a world/scene",
                "composition" to "Declare a composition",
                "template" to "Declare a reusable template",
                "object" to "Declare an object",
                "environment" to "Define environment settings",
                "state" to "Define state variables",
                "logic" to "Define logic block",
                "animation" to "Define animation",
                "physics" to "Define physics settings",
                "import" to "Import from module",
                "from" to "Import source",
                "export" to "Export symbol",
                "if" to "Conditional statement",
                "else" to "Else branch",
                "while" to "While loop",
                "for" to "For loop",
                "return" to "Return statement",
                "function" to "Define function",
                "true" to "Boolean true",
                "false" to "Boolean false",
                "null" to "Null value"
            )
        }
        
        override fun addCompletions(
            parameters: CompletionParameters,
            context: ProcessingContext,
            result: CompletionResultSet
        ) {
            for ((keyword, description) in KEYWORDS) {
                result.addElement(
                    LookupElementBuilder.create(keyword)
                        .withTypeText(description)
                        .withBoldness(true)
                )
            }
        }
    }
    
    /**
     * Provider for trait completions
     */
    private class TraitCompletionProvider : CompletionProvider<CompletionParameters>() {
        
        companion object {
            private val TRAITS = listOf(
                // Interaction
                "grabbable" to "Allows objects to be grabbed in VR",
                "throwable" to "Object can be thrown",
                "holdable" to "Object can be held",
                "clickable" to "Object responds to clicks",
                "hoverable" to "Object responds to hover",
                "draggable" to "Object can be dragged",
                "pointable" to "Object can be pointed at",
                "scalable" to "Object can be scaled",
                
                // Physics
                "collidable" to "Enables physics collisions",
                "physics" to "Adds physics simulation",
                "rigid" to "Rigid body physics",
                "kinematic" to "Kinematic physics body",
                "trigger" to "Trigger zone",
                "gravity" to "Affected by gravity",
                
                // Visual
                "glowing" to "Object emits glow",
                "emissive" to "Material is emissive",
                "transparent" to "Object is transparent",
                "reflective" to "Object is reflective",
                "animated" to "Supports animations",
                "billboard" to "Always faces camera",
                
                // Networking
                "networked" to "Synced across network",
                "synced" to "State is synchronized",
                "persistent" to "State persists",
                "owned" to "Has ownership",
                "host_only" to "Only modifiable by host",
                
                // Behavior
                "stackable" to "Can be stacked",
                "attachable" to "Can attach to other objects",
                "equippable" to "Can be equipped",
                "consumable" to "Can be consumed/used",
                "destructible" to "Can be destroyed",
                
                // Spatial
                "anchor" to "Spatial anchor",
                "tracked" to "Tracked by sensors",
                "world_locked" to "Locked to world space",
                "hand_tracked" to "Follows hand tracking",
                "eye_tracked" to "Follows eye tracking",
                
                // Audio
                "spatial_audio" to "3D spatial audio",
                "ambient" to "Ambient audio source",
                "voice_activated" to "Responds to voice",
                
                // State
                "state" to "Has reactive state",
                "reactive" to "Reactive to changes",
                "observable" to "Observable state",
                "computed" to "Computed property"
            )
        }
        
        override fun addCompletions(
            parameters: CompletionParameters,
            context: ProcessingContext,
            result: CompletionResultSet
        ) {
            for ((trait, description) in TRAITS) {
                result.addElement(
                    LookupElementBuilder.create(trait)
                        .withPresentableText("@$trait")
                        .withTypeText(description)
                        .withInsertHandler { ctx, _ ->
                            // Insert just the trait name (@ is already typed)
                        }
                )
            }
        }
    }
}
