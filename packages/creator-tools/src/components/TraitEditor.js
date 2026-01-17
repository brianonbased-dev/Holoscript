/**
 * Phase 6: React UI Component - Trait Annotation Editor
 *
 * Visual interface for editing trait annotations with live code generation
 * and real-time preview across multiple devices.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { TraitAnnotationEditor } from '../TraitAnnotationEditor';
import { RealtimePreviewEngine } from '../RealtimePreviewEngine';
/**
 * React wrapper for TraitAnnotationEditor with visual controls
 */
export const TraitEditor = ({ initialConfig, onCodeChange, onMetricsUpdate, theme = 'light', previewDevices = ['mobile', 'vr', 'desktop'], }) => {
    const editorRef = useRef(null);
    const previewRef = useRef(null);
    const [config, setConfig] = useState(initialConfig);
    const [generatedCode, setGeneratedCode] = useState('');
    const [propertyUIState, setPropertyUIState] = useState({});
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [undoDisabled, setUndoDisabled] = useState(true);
    const [redoDisabled, setRedoDisabled] = useState(true);
    const [activeTab, setActiveTab] = useState('properties');
    const [metrics, setMetrics] = useState(new Map());
    // Initialize editor
    useEffect(() => {
        const editor = new TraitAnnotationEditor(initialConfig, {
            theme,
            previewDevices,
            showMetrics: true,
            autoSave: true,
            saveInterval: 1000,
        });
        editorRef.current = editor;
        // Subscribe to changes
        editor.on('change', (updatedConfig) => {
            setConfig(updatedConfig);
            const code = editor.generateCode();
            setGeneratedCode(code);
            onCodeChange?.(code);
        });
        // Initialize preview engine
        const preview = new RealtimePreviewEngine();
        previewRef.current = preview;
        preview.on('update', (data) => {
            const metricsMap = new Map();
            data.previews.forEach((state) => {
                metricsMap.set(state.device.name, state.metrics);
            });
            setMetrics(metricsMap);
            onMetricsUpdate?.(metricsMap);
        });
        // Initial code generation
        const initialCode = editor.generateCode();
        setGeneratedCode(initialCode);
        onCodeChange?.(initialCode);
        return () => {
            editor.off('change');
        };
    }, []);
    const handlePropertyChange = useCallback((propertyName, value) => {
        if (!editorRef.current)
            return;
        const result = editorRef.current.updateProperty(propertyName, value, true);
        if (result.success) {
            setPropertyUIState((prev) => ({
                ...prev,
                [propertyName]: value,
            }));
            const code = editorRef.current.generateCode();
            setGeneratedCode(code);
            onCodeChange?.(code);
            // Update preview
            previewRef.current?.updatePreview(code);
        }
        else {
            console.error(`Property update failed: ${result.error}`);
        }
    }, []);
    const handleApplyPreset = useCallback((presetName) => {
        if (!editorRef.current)
            return;
        editorRef.current.applyPreset(presetName);
        const code = editorRef.current.generateCode();
        setGeneratedCode(code);
        setSelectedPreset(presetName);
        onCodeChange?.(code);
        // Update preview
        previewRef.current?.updatePreview(code);
    }, []);
    const handleUndo = useCallback(() => {
        if (!editorRef.current)
            return;
        editorRef.current.undo();
        const code = editorRef.current.generateCode();
        setGeneratedCode(code);
        onCodeChange?.(code);
    }, []);
    const handleRedo = useCallback(() => {
        if (!editorRef.current)
            return;
        editorRef.current.redo();
        const code = editorRef.current.generateCode();
        setGeneratedCode(code);
        onCodeChange?.(code);
    }, []);
    const handleExport = useCallback(() => {
        if (!editorRef.current)
            return;
        const configData = editorRef.current.exportConfig();
        const element = document.createElement('a');
        element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(configData, null, 2)));
        element.setAttribute('download', `trait-${config.type}-${Date.now()}.json`);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }, [config.type]);
    const handleImport = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result);
                if (editorRef.current) {
                    editorRef.current.importConfig(data);
                    const code = editorRef.current.generateCode();
                    setGeneratedCode(code);
                    onCodeChange?.(code);
                }
            }
            catch (err) {
                console.error('Failed to import config:', err);
            }
        };
        reader.readAsText(file);
    }, []);
    return (<div className={`trait-editor ${theme}`} style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>Trait Annotation Editor</h2>
        <div style={styles.headerControls}>
          <button onClick={handleUndo} disabled={undoDisabled} style={styles.button} title="Undo">
            ↶ Undo
          </button>
          <button onClick={handleRedo} disabled={redoDisabled} style={styles.button} title="Redo">
            ↷ Redo
          </button>
          <button onClick={handleExport} style={styles.button} title="Export configuration">
            ⬇ Export
          </button>
          <label style={styles.button}>
            📁 Import
            <input type="file" accept=".json" onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} style={{ display: 'none' }}/>
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('properties')} style={{
            ...styles.tab,
            ...(activeTab === 'properties' ? styles.tabActive : {}),
        }}>
          Properties
        </button>
        <button onClick={() => setActiveTab('code')} style={{
            ...styles.tab,
            ...(activeTab === 'code' ? styles.tabActive : {}),
        }}>
          Generated Code
        </button>
        <button onClick={() => setActiveTab('preview')} style={{
            ...styles.tab,
            ...(activeTab === 'preview' ? styles.tabActive : {}),
        }}>
          Live Preview
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'properties' && (<PropertiesPanel config={config} propertyUIState={propertyUIState} selectedPreset={selectedPreset} onPropertyChange={handlePropertyChange} onPresetApply={handleApplyPreset}/>)}

        {activeTab === 'code' && (<CodePanel code={generatedCode} traitType={config.type}/>)}

        {activeTab === 'preview' && (<PreviewPanel metrics={metrics} traitCode={generatedCode}/>)}
      </div>
    </div>);
};
const PropertiesPanel = ({ config, propertyUIState, selectedPreset, onPropertyChange, onPresetApply, }) => {
    const presets = ['gold', 'steel', 'studio', 'high-performance'];
    return (<div style={styles.panel}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Presets</h3>
        <div style={styles.presetGrid}>
          {presets.map((preset) => (<button key={preset} onClick={() => onPresetApply(preset)} style={{
                ...styles.presetButton,
                ...(selectedPreset === preset ? styles.presetButtonActive : {}),
            }}>
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>))}
        </div>
      </div>

      <div style={styles.divider}/>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Properties</h3>
        <div style={styles.propertiesList}>
          {Object.entries(config.properties).map(([name, prop]) => (<PropertyControl key={name} name={name} property={prop} value={propertyUIState[name] ?? prop.value} onChange={(value) => onPropertyChange(name, value)}/>))}
        </div>
      </div>
    </div>);
};
const PropertyControl = ({ name, property, value, onChange, }) => {
    const renderControl = () => {
        switch (property.type) {
            case 'number':
                return (<input type="range" min={property.min ?? 0} max={property.max ?? 1} step={property.step ?? 0.01} value={Number(value) ?? 0} onChange={(e) => onChange(parseFloat(e.target.value))} style={styles.slider}/>);
            case 'color':
                return (<input type="color" value={String(value) ?? '#000000'} onChange={(e) => onChange(e.target.value)} style={styles.colorPicker}/>);
            case 'enum':
                return (<select value={String(value) ?? ''} onChange={(e) => onChange(e.target.value)} style={styles.select}>
            {property.options?.map((opt) => (<option key={opt} value={opt}>
                {opt}
              </option>))}
          </select>);
            case 'boolean':
                return (<input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} style={styles.checkbox}/>);
            case 'string':
            default:
                return (<input type="text" value={String(value) ?? ''} onChange={(e) => onChange(e.target.value)} style={styles.textInput}/>);
        }
    };
    return (<div style={styles.propertyControl}>
      <label style={styles.propertyLabel}>
        <div style={styles.propertyName}>{name}</div>
        <div style={styles.propertyDescription}>{property.description}</div>
      </label>
      <div style={styles.propertyInput}>{renderControl()}</div>
      {property.type === 'number' && (<div style={styles.numberValue}>{Number(value).toFixed(2)}</div>)}
    </div>);
};
const CodePanel = ({ code, traitType }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (<div style={styles.panel}>
      <div style={{ ...styles.section, display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <h3 style={styles.sectionTitle}>Generated HoloScript+ Code</h3>
        <button onClick={handleCopy} style={styles.copyButton}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>

      <div style={styles.codeBlock}>
        <code style={styles.code}>{code}</code>
      </div>

      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <h4>Type</h4>
        <p>{traitType}</p>
      </div>
    </div>);
};
const PreviewPanel = ({ metrics, traitCode }) => {
    return (<div style={styles.panel}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Multi-Device Preview</h3>

        {metrics.size === 0 ? (<div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            No preview data available
          </div>) : (<div style={styles.previewGrid}>
            {Array.from(metrics.entries()).map(([deviceName, deviceMetrics]) => (<DevicePreviewCard key={deviceName} deviceName={deviceName} metrics={deviceMetrics}/>))}
          </div>)}
      </div>

      <div style={styles.divider}/>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Trait Code Preview</h3>
        <div style={styles.codeBlock}>
          <code style={styles.code}>{traitCode}</code>
        </div>
      </div>
    </div>);
};
const DevicePreviewCard = ({ deviceName, metrics }) => {
    const getPerformanceColor = (fps) => {
        if (fps >= 60)
            return '#4caf50';
        if (fps >= 30)
            return '#ff9800';
        return '#f44336';
    };
    const getMemoryColor = (percent) => {
        if (percent <= 60)
            return '#4caf50';
        if (percent <= 80)
            return '#ff9800';
        return '#f44336';
    };
    return (<div style={styles.deviceCard}>
      <h4 style={styles.deviceName}>{deviceName}</h4>
      <div style={styles.metricRow}>
        <span>FPS</span>
        <span style={{ color: getPerformanceColor(metrics.fps), fontWeight: 'bold' }}>
          {metrics.fps.toFixed(1)}
        </span>
      </div>
      <div style={styles.metricRow}>
        <span>GPU Memory</span>
        <span style={{ color: getMemoryColor(metrics.gpuMemoryPercent), fontWeight: 'bold' }}>
          {metrics.gpuMemoryPercent.toFixed(0)}%
        </span>
      </div>
      <div style={styles.metricRow}>
        <span>Draw Calls</span>
        <span>{metrics.drawCalls}</span>
      </div>
      <div style={styles.metricRow}>
        <span>Vertices</span>
        <span>{(metrics.verticesRendered / 1000).toFixed(1)}k</span>
      </div>
      <div style={styles.metricRow}>
        <span>Shader Time</span>
        <span>{metrics.shaderCompileTime.toFixed(2)}ms</span>
      </div>
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
        gap: '0.5rem',
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
    tabs: {
        display: 'flex',
        borderBottom: '2px solid #e0e0e0',
        backgroundColor: '#f5f5f5',
    },
    tab: {
        flex: 1,
        padding: '1rem',
        textAlign: 'center',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 'bold',
        color: '#666',
        fontSize: '0.95rem',
    },
    tabActive: {
        color: '#2196f3',
        borderBottom: '3px solid #2196f3',
        marginBottom: '-2px',
    },
    content: {
        flex: 1,
        overflow: 'auto',
        padding: '1.5rem',
    },
    panel: {
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
    presetGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '0.5rem',
    },
    presetButton: {
        padding: '0.75rem',
        backgroundColor: '#f0f0f0',
        border: '2px solid #ddd',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        transition: 'all 0.2s',
    },
    presetButtonActive: {
        backgroundColor: '#2196f3',
        color: 'white',
        borderColor: '#2196f3',
    },
    propertiesList: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1rem',
    },
    propertyControl: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #e0e0e0',
    },
    propertyLabel: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    propertyName: {
        fontWeight: 'bold',
        color: '#333',
    },
    propertyDescription: {
        fontSize: '0.85rem',
        color: '#999',
    },
    propertyInput: {
        display: 'flex',
        gap: '0.5rem',
    },
    slider: {
        flex: 1,
    },
    colorPicker: {
        width: '100%',
        height: '40px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    select: {
        flex: 1,
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: 'pointer',
    },
    checkbox: {
        width: '20px',
        height: '20px',
        cursor: 'pointer',
    },
    textInput: {
        flex: 1,
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontFamily: 'monospace',
    },
    numberValue: {
        fontSize: '0.85rem',
        color: '#999',
        textAlign: 'right',
    },
    codeBlock: {
        backgroundColor: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '1rem',
        overflow: 'auto',
        maxHeight: '300px',
    },
    code: {
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        color: '#333',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
    },
    copyButton: {
        padding: '0.5rem 1rem',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 'bold',
    },
    previewGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
    },
    deviceCard: {
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    deviceName: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 'bold',
        color: '#333',
    },
    metricRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9rem',
        padding: '0.5rem 0',
        borderBottom: '1px solid #eee',
    },
};
export default TraitEditor;
