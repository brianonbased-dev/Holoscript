/**
 * Phase 6: React UI Component - Real-Time Preview Dashboard
 *
 * Visual interface for monitoring trait preview performance across devices
 * with live metrics, recommendations, and optimization insights.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { RealtimePreviewEngine } from '../RealtimePreviewEngine';
/**
 * Real-time preview dashboard React component
 */
export const PreviewDashboard = ({ traitCode, onMetricsUpdate, onRecommendation, autoRefresh = true, refreshInterval = 1000, }) => {
    const engineRef = useRef(null);
    const [previews, setPreviews] = useState(new Map());
    const [metricsHistory, setMetricsHistory] = useState(new Map());
    const [recommendations, setRecommendations] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const refreshIntervalRef = useRef(null);
    // Initialize engine
    useEffect(() => {
        const engine = new RealtimePreviewEngine();
        engineRef.current = engine;
        // Register default devices
        const devices = [
            { name: 'iPhone 15 Pro', platform: 'mobile', width: 1179, height: 2556, dpi: 460, gpuMemory: 256 },
            { name: 'iPad Pro 12.9', platform: 'mobile', width: 2732, height: 2048, dpi: 264, gpuMemory: 512 },
            { name: 'Meta Quest 3', platform: 'vr', width: 1728, height: 1824, dpi: 659, gpuMemory: 384 },
            { name: 'Apple Vision Pro', platform: 'vr', width: 4120, height: 2620, dpi: 1090, gpuMemory: 512 },
            { name: 'HoloLens 2', platform: 'vr', width: 1280, height: 720, dpi: 290, gpuMemory: 256 },
            { name: 'RTX 4090', platform: 'desktop', width: 3840, height: 2160, dpi: 92, gpuMemory: 8192 },
        ];
        devices.forEach((device) => engine.registerDevice(device));
        setSelectedDevice(devices[0].name);
        // Subscribe to updates
        engine.on('update', (data) => {
            const newPreviews = new Map();
            const newHistory = new Map();
            data.previews.forEach((state) => {
                newPreviews.set(state.device.name, state);
                // Store history
                const currentHistory = metricsHistory.get(state.device.name) || [];
                const updatedHistory = [...currentHistory, state.metrics].slice(-300); // Keep last 300 samples
                newHistory.set(state.device.name, updatedHistory);
            });
            setPreviews(newPreviews);
            setMetricsHistory(newHistory);
            // Calculate recommendations
            const newRecommendations = engine.getRecommendations();
            setRecommendations(newRecommendations);
            onRecommendation?.(newRecommendations[0]);
            // Emit metrics
            const metricsMap = new Map();
            newPreviews.forEach((state) => {
                metricsMap.set(state.device.name, state.metrics);
            });
            onMetricsUpdate?.(metricsMap);
        });
        return () => {
            engine.stopMonitoring();
        };
    }, []);
    // Update preview when trait code changes
    useEffect(() => {
        if (engineRef.current && traitCode) {
            engineRef.current.updatePreview(traitCode);
        }
    }, [traitCode]);
    // Start/stop monitoring
    const handleStartMonitoring = useCallback(() => {
        if (!engineRef.current)
            return;
        engineRef.current.startMonitoring(refreshInterval);
        setIsMonitoring(true);
    }, [refreshInterval]);
    const handleStopMonitoring = useCallback(() => {
        if (!engineRef.current)
            return;
        engineRef.current.stopMonitoring();
        setIsMonitoring(false);
    }, []);
    // Export metrics
    const handleExportMetrics = useCallback(() => {
        const exportData = {
            timestamp: new Date().toISOString(),
            traitCode,
            metrics: Array.from(previews.entries()).map(([deviceName, state]) => ({
                device: deviceName,
                metrics: state.metrics,
                warnings: state.warnings,
                errors: state.errors,
            })),
        };
        const element = document.createElement('a');
        element.setAttribute('href', `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`);
        element.setAttribute('download', `preview-metrics-${Date.now()}.json`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }, [previews, traitCode]);
    const selectedPreview = selectedDevice ? previews.get(selectedDevice) : null;
    return (<div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Real-Time Preview Dashboard</h2>
        <div style={styles.headerControls}>
          {autoRefresh && (<>
              <button onClick={isMonitoring ? handleStopMonitoring : handleStartMonitoring} style={{
                ...styles.button,
                backgroundColor: isMonitoring ? '#f44336' : '#4caf50',
            }}>
                {isMonitoring ? '⏹ Stop Monitoring' : '▶ Start Monitoring'}
              </button>
              <span style={styles.statusIndicator}>
                {isMonitoring ? '🟢 Live' : '⚫ Offline'}
              </span>
            </>)}
          <button onClick={handleExportMetrics} style={styles.button}>
            📊 Export Metrics
          </button>
        </div>
      </div>

      <div style={styles.content}>
        {/* Device Overview Grid */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Device Overview</h3>
          <div style={styles.deviceGrid}>
            {Array.from(previews.values()).map((state) => (<DeviceOverviewCard key={state.device.name} state={state} isSelected={selectedDevice === state.device.name} onSelect={() => setSelectedDevice(state.device.name)}/>))}
          </div>
        </div>

        <div style={styles.divider}/>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Detailed Metrics */}
          {selectedPreview && (<div style={styles.section}>
              <h3 style={styles.sectionTitle}>Detailed Metrics - {selectedPreview.device.name}</h3>
              <DetailedMetricsPanel state={selectedPreview}/>
            </div>)}

          {/* Recommendations */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Optimization Recommendations</h3>
            <RecommendationsPanel recommendations={recommendations}/>
          </div>
        </div>

        <div style={styles.divider}/>

        {/* Performance Comparison */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Cross-Device Performance Comparison</h3>
          <PerformanceComparisonTable previews={previews}/>
        </div>

        {/* Metrics History Chart */}
        {selectedDevice && (<div style={styles.section}>
            <h3 style={styles.sectionTitle}>Performance History - {selectedDevice}</h3>
            <MetricsHistoryChart deviceName={selectedDevice} history={metricsHistory.get(selectedDevice) || []}/>
          </div>)}

        {/* Warnings and Errors */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Warnings & Errors</h3>
          <WarningsErrorsPanel previews={previews}/>
        </div>
      </div>
    </div>);
};
const DeviceOverviewCard = ({ state, isSelected, onSelect }) => {
    const getStatusColor = (fps) => {
        if (fps >= 60)
            return '#4caf50';
        if (fps >= 30)
            return '#ff9800';
        return '#f44336';
    };
    const getStatusText = (fps) => {
        if (fps >= 60)
            return '✓ Optimal';
        if (fps >= 30)
            return '⚠ Acceptable';
        return '✗ Poor';
    };
    return (<div onClick={onSelect} style={{
            ...styles.overviewCard,
            ...(isSelected ? styles.overviewCardSelected : {}),
        }}>
      <div style={styles.overviewCardHeader}>
        <h4 style={styles.overviewCardTitle}>{state.device.name}</h4>
        <span style={{
            ...styles.statusBadge,
            backgroundColor: getStatusColor(state.metrics.fps),
        }}>
          {getStatusText(state.metrics.fps)}
        </span>
      </div>

      <div style={styles.overviewCardMetrics}>
        <div style={styles.overviewMetricRow}>
          <span>FPS</span>
          <span style={{ fontWeight: 'bold', color: getStatusColor(state.metrics.fps) }}>
            {state.metrics.fps.toFixed(1)}
          </span>
        </div>
        <div style={styles.overviewMetricRow}>
          <span>GPU Memory</span>
          <span style={{ fontWeight: 'bold' }}>
            {state.metrics.gpuMemoryPercent.toFixed(0)}%
          </span>
        </div>
        <div style={styles.overviewMetricRow}>
          <span>Draw Calls</span>
          <span>{state.metrics.drawCalls}</span>
        </div>
      </div>

      {state.warnings.length > 0 && (<div style={styles.warningBadge}>
          ⚠ {state.warnings.length} warning{state.warnings.length > 1 ? 's' : ''}
        </div>)}

      {state.errors.length > 0 && (<div style={styles.errorBadge}>
          ✗ {state.errors.length} error{state.errors.length > 1 ? 's' : ''}
        </div>)}
    </div>);
};
const DetailedMetricsPanel = ({ state }) => {
    const metrics = state.metrics;
    return (<div style={styles.detailedMetricsPanel}>
      <MetricDetail label="Frames Per Second" value={metrics.fps.toFixed(1)} unit="FPS" optimal={60} current={metrics.fps}/>
      <MetricDetail label="GPU Memory Usage" value={metrics.gpuMemoryPercent.toFixed(1)} unit="%" optimal={70} current={metrics.gpuMemoryPercent} inverse/>
      <MetricDetail label="GPU Memory (Absolute)" value={(metrics.gpuMemory / 1024).toFixed(2)} unit="MB" optimal={0} current={0}/>
      <MetricDetail label="Draw Calls" value={metrics.drawCalls.toString()} unit="calls" optimal={100} current={metrics.drawCalls} inverse/>
      <MetricDetail label="Vertices Rendered" value={(metrics.verticesRendered / 1000000).toFixed(2)} unit="M" optimal={0} current={0}/>
      <MetricDetail label="Shader Compile Time" value={metrics.shaderCompileTime.toFixed(2)} unit="ms" optimal={50} current={metrics.shaderCompileTime} inverse/>
    </div>);
};
const MetricDetail = ({ label, value, unit, optimal, current, inverse }) => {
    let statusColor = '#999';
    if (optimal > 0) {
        if (inverse) {
            statusColor = current <= optimal ? '#4caf50' : current <= optimal * 1.5 ? '#ff9800' : '#f44336';
        }
        else {
            statusColor = current >= optimal ? '#4caf50' : current >= optimal * 0.7 ? '#ff9800' : '#f44336';
        }
    }
    return (<div style={styles.metricDetail}>
      <span style={styles.metricLabel}>{label}</span>
      <div style={styles.metricValue}>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: statusColor }}>
          {value}
        </span>
        <span style={styles.metricUnit}>{unit}</span>
      </div>
    </div>);
};
const RecommendationsPanel = ({ recommendations }) => {
    if (recommendations.length === 0) {
        return (<div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
        ✓ All metrics are optimal. No recommendations at this time.
      </div>);
    }
    return (<div style={styles.recommendationsList}>
      {recommendations.map((recommendation, index) => (<div key={index} style={styles.recommendationItem}>
          <span style={styles.recommendationIcon}>💡</span>
          <span>{recommendation}</span>
        </div>))}
    </div>);
};
const PerformanceComparisonTable = ({ previews }) => {
    const rows = Array.from(previews.values());
    return (<div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeader}>
            <th style={styles.tableCell}>Device</th>
            <th style={styles.tableCell}>FPS</th>
            <th style={styles.tableCell}>GPU %</th>
            <th style={styles.tableCell}>Draw Calls</th>
            <th style={styles.tableCell}>Vertices</th>
            <th style={styles.tableCell}>Shader (ms)</th>
            <th style={styles.tableCell}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((state) => (<tr key={state.device.name} style={styles.tableRow}>
              <td style={styles.tableCell}>{state.device.name}</td>
              <td style={styles.tableCell}>
                <span style={{ color: state.metrics.fps >= 60 ? '#4caf50' : '#ff9800' }}>
                  {state.metrics.fps.toFixed(1)}
                </span>
              </td>
              <td style={styles.tableCell}>{state.metrics.gpuMemoryPercent.toFixed(0)}%</td>
              <td style={styles.tableCell}>{state.metrics.drawCalls}</td>
              <td style={styles.tableCell}>{(state.metrics.verticesRendered / 1000000).toFixed(2)}M</td>
              <td style={styles.tableCell}>{state.metrics.shaderCompileTime.toFixed(2)}</td>
              <td style={styles.tableCell}>
                {state.errors.length > 0 ? (<span style={{ color: '#f44336' }}>✗ Error</span>) : state.warnings.length > 0 ? (<span style={{ color: '#ff9800' }}>⚠ Warning</span>) : (<span style={{ color: '#4caf50' }}>✓ OK</span>)}
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
};
const MetricsHistoryChart = ({ deviceName, history }) => {
    if (history.length === 0) {
        return <div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No history data</div>;
    }
    const avgFps = history.reduce((sum, m) => sum + m.fps, 0) / history.length;
    const minFps = Math.min(...history.map((m) => m.fps));
    const maxFps = Math.max(...history.map((m) => m.fps));
    const avgMemory = history.reduce((sum, m) => sum + m.gpuMemoryPercent, 0) / history.length;
    const maxMemory = Math.max(...history.map((m) => m.gpuMemoryPercent));
    return (<div style={styles.historyChart}>
      <div style={styles.chartSummary}>
        <div style={styles.chartStat}>
          <span>Avg FPS</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{avgFps.toFixed(1)}</span>
        </div>
        <div style={styles.chartStat}>
          <span>Min FPS</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ff9800' }}>{minFps.toFixed(1)}</span>
        </div>
        <div style={styles.chartStat}>
          <span>Max FPS</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4caf50' }}>{maxFps.toFixed(1)}</span>
        </div>
        <div style={styles.chartStat}>
          <span>Avg GPU %</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{avgMemory.toFixed(0)}%</span>
        </div>
        <div style={styles.chartStat}>
          <span>Peak GPU %</span>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f44336' }}>{maxMemory.toFixed(0)}%</span>
        </div>
      </div>

      <div style={styles.miniChart}>
        <svg width="100%" height="100" style={{ backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          {/* FPS Line Chart */}
          {history.map((metric, i) => {
            const x = (i / Math.max(1, history.length - 1)) * 100;
            const y = 100 - (metric.fps / 120) * 100;
            return (<circle key={`fps-${i}`} cx={`${x}%`} cy={`${y}%`} r="2" fill="#2196f3" opacity="0.5"/>);
        })}
        </svg>
      </div>
    </div>);
};
const WarningsErrorsPanel = ({ previews }) => {
    const hasIssues = Array.from(previews.values()).some((state) => state.warnings.length > 0 || state.errors.length > 0);
    if (!hasIssues) {
        return (<div style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>
        ✓ No warnings or errors detected across all devices.
      </div>);
    }
    return (<div style={styles.issuesList}>
      {Array.from(previews.values()).map((state) => (<div key={state.device.name}>
          {state.errors.length > 0 && (<div>
              <h4 style={styles.issueDeviceTitle}>{state.device.name} - Errors</h4>
              {state.errors.map((error, i) => (<div key={i} style={styles.errorItem}>
                  ✗ {error}
                </div>))}
            </div>)}
          {state.warnings.length > 0 && (<div>
              <h4 style={styles.issueDeviceTitle}>{state.device.name} - Warnings</h4>
              {state.warnings.map((warning, i) => (<div key={i} style={styles.warningItem}>
                  ⚠ {warning}
                </div>))}
            </div>)}
        </div>))}
    </div>);
};
/**
 * Styles
 */
const styles = {
    container: {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#ffffff',
        color: '#333',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#f9f9f9',
    },
    title: {
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: 'bold',
    },
    headerControls: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
    },
    button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#2196f3',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    },
    statusIndicator: {
        fontSize: '0.9rem',
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        overflow: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    section: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#333',
    },
    divider: {
        height: '1px',
        backgroundColor: '#e0e0e0',
    },
    deviceGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
    },
    overviewCard: {
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '2px solid #e0e0e0',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    overviewCardSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196f3',
        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.2)',
    },
    overviewCardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
    },
    overviewCardTitle: {
        margin: 0,
        fontSize: '0.95rem',
        fontWeight: 'bold',
    },
    statusBadge: {
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        color: 'white',
        fontSize: '0.75rem',
        fontWeight: 'bold',
    },
    overviewCardMetrics: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '0.75rem',
    },
    overviewMetricRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.85rem',
    },
    warningBadge: {
        padding: '0.5rem',
        backgroundColor: '#fff3e0',
        borderRadius: '4px',
        color: '#f57c00',
        fontSize: '0.8rem',
        marginBottom: '0.5rem',
        textAlign: 'center',
    },
    errorBadge: {
        padding: '0.5rem',
        backgroundColor: '#ffebee',
        borderRadius: '4px',
        color: '#c62828',
        fontSize: '0.8rem',
        textAlign: 'center',
    },
    detailedMetricsPanel: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
    },
    metricDetail: {
        padding: '1rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    metricLabel: {
        fontSize: '0.85rem',
        color: '#999',
        fontWeight: 'bold',
    },
    metricValue: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '0.5rem',
    },
    metricUnit: {
        fontSize: '0.85rem',
        color: '#999',
    },
    recommendationsList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    recommendationItem: {
        padding: '0.75rem',
        backgroundColor: '#f0f8ff',
        borderLeft: '4px solid #2196f3',
        borderRadius: '4px',
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'flex-start',
        fontSize: '0.9rem',
    },
    recommendationIcon: {
        fontSize: '1.1rem',
    },
    tableContainer: {
        overflow: 'auto',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'white',
    },
    tableHeader: {
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #e0e0e0',
    },
    tableRow: {
        borderBottom: '1px solid #e0e0e0',
    },
    tableCell: {
        padding: '0.75rem 1rem',
        textAlign: 'left',
        fontSize: '0.9rem',
    },
    historyChart: {
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
    },
    chartSummary: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '1rem',
        marginBottom: '1rem',
    },
    chartStat: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        padding: '0.75rem',
        backgroundColor: 'white',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
        textAlign: 'center',
    },
    miniChart: {
        marginTop: '1rem',
    },
    issuesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    issueDeviceTitle: {
        margin: '0.75rem 0 0.5rem 0',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        color: '#333',
    },
    errorItem: {
        padding: '0.5rem 0.75rem',
        backgroundColor: '#ffebee',
        borderLeft: '3px solid #f44336',
        borderRadius: '2px',
        color: '#c62828',
        fontSize: '0.85rem',
        marginBottom: '0.5rem',
    },
    warningItem: {
        padding: '0.5rem 0.75rem',
        backgroundColor: '#fff3e0',
        borderLeft: '3px solid #ff9800',
        borderRadius: '2px',
        color: '#e65100',
        fontSize: '0.85rem',
        marginBottom: '0.5rem',
    },
};
export default PreviewDashboard;
