/**
 * Phase 6: Complete Integrated Demo Application
 *
 * Full React application demonstrating TraitEditor and PreviewDashboard
 * working together with real-time trait editing and cross-platform preview.
 */
import React, { useState } from 'react';
import TraitEditor from './components/TraitEditor';
import PreviewDashboard from './components/PreviewDashboard';
/**
 * Complete integrated demo application
 */
const Phase6CompleteDemo = () => {
    const [activeView, setActiveView] = useState('split');
    const [currentTraitCode, setCurrentTraitCode] = useState('@material { type: pbr, metallic: 0.8 }');
    const [selectedPreset, setSelectedPreset] = useState('');
    // Initial material configuration
    const initialMaterialConfig = {
        type: 'material',
        properties: {
            type: {
                name: 'type',
                value: 'pbr',
                type: 'enum',
                options: ['pbr', 'standard', 'unlit', 'transparent'],
                description: 'Material type determines shading model',
                category: 'core',
            },
            metallic: {
                name: 'metallic',
                value: 0.8,
                type: 'number',
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Metallic surface intensity (0 = matte, 1 = mirror)',
                category: 'pbr',
            },
            roughness: {
                name: 'roughness',
                value: 0.2,
                type: 'number',
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Surface roughness (0 = glossy, 1 = matte)',
                category: 'pbr',
            },
            baseColor: {
                name: 'baseColor',
                value: '#ffffff',
                type: 'color',
                description: 'Primary surface color',
                category: 'appearance',
            },
            emissive: {
                name: 'emissive',
                value: '#000000',
                type: 'color',
                description: 'Self-emitted light color',
                category: 'appearance',
            },
            aoIntensity: {
                name: 'aoIntensity',
                value: 1.0,
                type: 'number',
                min: 0,
                max: 1,
                step: 0.01,
                description: 'Ambient occlusion strength',
                category: 'pbr',
            },
        },
        isDirty: false,
    };
    return (<div style={styles.appContainer}>
      {/* Top Navigation */}
      <nav style={styles.topNav}>
        <div style={styles.navLeft}>
          <h1 style={styles.appTitle}>🎨 Phase 6: Creator Tools - Complete Demo</h1>
          <span style={styles.tagline}>Visual trait editor with real-time multi-device preview</span>
        </div>

        <div style={styles.navRight}>
          <button onClick={() => setActiveView('editor')} style={{
            ...styles.navButton,
            ...(activeView === 'editor' ? styles.navButtonActive : {}),
        }}>
            ✏️ Editor
          </button>
          <button onClick={() => setActiveView('preview')} style={{
            ...styles.navButton,
            ...(activeView === 'preview' ? styles.navButtonActive : {}),
        }}>
            👁️ Preview
          </button>
          <button onClick={() => setActiveView('split')} style={{
            ...styles.navButton,
            ...(activeView === 'split' ? styles.navButtonActive : {}),
        }}>
            ⚔️ Split
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div style={styles.mainContent}>
        {activeView === 'editor' && (<div style={styles.panelFull}>
            <TraitEditor initialConfig={initialMaterialConfig} onCodeChange={setCurrentTraitCode} theme="light" previewDevices={['mobile', 'vr', 'desktop']}/>
          </div>)}

        {activeView === 'preview' && (<div style={styles.panelFull}>
            <PreviewDashboard traitCode={currentTraitCode} autoRefresh={true} refreshInterval={1000}/>
          </div>)}

        {activeView === 'split' && (<div style={styles.splitLayout}>
            <div style={styles.splitPanel}>
              <div style={styles.panelLabel}>Trait Editor</div>
              <TraitEditor initialConfig={initialMaterialConfig} onCodeChange={setCurrentTraitCode} theme="light" previewDevices={['mobile', 'vr', 'desktop']}/>
            </div>

            <div style={styles.divider}/>

            <div style={styles.splitPanel}>
              <div style={styles.panelLabel}>Live Preview</div>
              <PreviewDashboard traitCode={currentTraitCode} autoRefresh={true} refreshInterval={1000}/>
            </div>
          </div>)}
      </div>

      {/* Bottom Status Bar */}
      <div style={styles.statusBar}>
        <div style={styles.statusLeft}>
          <span style={styles.statusLabel}>Current Trait Code:</span>
          <code style={styles.statusCode}>{currentTraitCode}</code>
        </div>

        <div style={styles.statusRight}>
          <span style={styles.statusInfo}>
            📱 Mobile | 🥽 VR | 🖥️ Desktop | ✓ All Platforms Supported
          </span>
        </div>
      </div>
    </div>);
};
/**
 * Styles
 */
const styles = {
    appContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f5f5f5',
    },
    topNav: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        backgroundColor: '#ffffff',
        borderBottom: '2px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    navLeft: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    appTitle: {
        margin: 0,
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#333',
    },
    tagline: {
        fontSize: '0.85rem',
        color: '#999',
    },
    navRight: {
        display: 'flex',
        gap: '0.5rem',
    },
    navButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f0f0f0',
        border: '2px solid #ddd',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '0.9rem',
        transition: 'all 0.2s',
    },
    navButtonActive: {
        backgroundColor: '#2196f3',
        color: 'white',
        borderColor: '#2196f3',
        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
    },
    mainContent: {
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    panelFull: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },
    splitLayout: {
        display: 'grid',
        gridTemplateColumns: '1fr 1px 1fr',
        width: '100%',
        height: '100%',
    },
    splitPanel: {
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
    },
    panelLabel: {
        padding: '0.75rem 1rem',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        color: '#999',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0',
    },
    divider: {
        width: '1px',
        backgroundColor: '#e0e0e0',
    },
    statusBar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f9f9f9',
        borderTop: '1px solid #e0e0e0',
        fontSize: '0.85rem',
    },
    statusLeft: {
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
    },
    statusLabel: {
        fontWeight: 'bold',
        color: '#666',
    },
    statusCode: {
        backgroundColor: '#f0f0f0',
        padding: '0.25rem 0.5rem',
        borderRadius: '3px',
        fontFamily: 'monospace',
        color: '#333',
        fontSize: '0.8rem',
    },
    statusRight: {
        display: 'flex',
        gap: '1rem',
    },
    statusInfo: {
        color: '#999',
    },
};
export default Phase6CompleteDemo;
