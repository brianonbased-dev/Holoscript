/**
 * Phase 6: React UI Component - Real-Time Preview Dashboard
 *
 * Visual interface for monitoring trait preview performance across devices
 * with live metrics, recommendations, and optimization insights.
 */
import React from 'react';
import { PreviewMetrics } from '../RealtimePreviewEngine';
interface PreviewDashboardProps {
    traitCode: string;
    onMetricsUpdate?: (metrics: Map<string, PreviewMetrics>) => void;
    onRecommendation?: (recommendation: string) => void;
    autoRefresh?: boolean;
    refreshInterval?: number;
}
/**
 * Real-time preview dashboard React component
 */
export declare const PreviewDashboard: React.FC<PreviewDashboardProps>;
export default PreviewDashboard;
