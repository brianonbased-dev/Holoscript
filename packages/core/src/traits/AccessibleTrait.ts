/**
 * Accessible Trait
 *
 * Master accessibility trait for spatial content
 *
 * @version 1.0.0
 */

import type { TraitHandler } from './VRTraitSystem';

// =============================================================================
// TYPES
// =============================================================================

// =============================================================================
// HANDLER
// =============================================================================

export const accessibleHandler: TraitHandler<any> = {
  name: 'accessible' as any,

  defaultConfig: { role: 'button', label: '', description: '', live_region: 'off', keyboard_shortcut: '', tab_index: 0, focus_visible: true },

  onAttach(node, config, context) {
    const state = { isFocused: false, announceQueue: [] };
    (node as any).__accessibleState = state;
    if (config.label && context.accessibility) {
      context.accessibility.setAltText(node.id || '', config.label);
    }
  },

  onDetach(node) {
    delete (node as any).__accessibleState;
  },

  onUpdate(node, config, context, delta) {
    const state = (node as any).__accessibleState;
    if (!state) return;
  },

  onEvent(node, config, context, event) {
    const state = (node as any).__accessibleState;
    if (!state) return;

    if (event.type === 'hover_enter' && context.accessibility) {
      context.accessibility.announce(config.label || node.id || 'Object');
    }
  },
};

export default accessibleHandler;
