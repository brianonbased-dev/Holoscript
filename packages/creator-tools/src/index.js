/**
 * Phase 6: HoloScript+ Creator Tools
 *
 * Complete visual creator tools suite including:
 * - TraitAnnotationEditor: Backend class for trait editing
 * - RealtimePreviewEngine: Backend class for multi-device preview
 * - TraitEditor React Component: Visual interface for editing
 * - PreviewDashboard React Component: Real-time metrics dashboard
 * - Phase6CompleteDemo React App: Full integrated demonstration
 */
// Backend Classes
export { TraitAnnotationEditor } from './TraitAnnotationEditor';
export { RealtimePreviewEngine } from './RealtimePreviewEngine';
// React Components
export { default as TraitEditor } from './components/TraitEditor';
export { default as PreviewDashboard } from './components/PreviewDashboard';
export { default as Phase6CompleteDemo } from './Phase6CompleteDemo';
// Version
export const VERSION = '1.0.0';
export const PHASE = 'Phase 6';
export const NAME = '@holoscript/creator-tools';
