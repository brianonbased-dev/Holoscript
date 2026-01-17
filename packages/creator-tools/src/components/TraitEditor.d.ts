/**
 * Phase 6: React UI Component - Trait Annotation Editor
 *
 * Visual interface for editing trait annotations with live code generation
 * and real-time preview across multiple devices.
 */
import React from 'react';
import { EditableTraitConfig } from '../TraitAnnotationEditor';
import { PreviewMetrics } from '../RealtimePreviewEngine';
interface TraitEditorProps {
    initialConfig: EditableTraitConfig;
    onCodeChange?: (code: string) => void;
    onMetricsUpdate?: (metrics: Map<string, PreviewMetrics>) => void;
    theme?: 'light' | 'dark';
    previewDevices?: ('mobile' | 'vr' | 'desktop')[];
}
/**
 * React wrapper for TraitAnnotationEditor with visual controls
 */
export declare const TraitEditor: React.FC<TraitEditorProps>;
export default TraitEditor;
