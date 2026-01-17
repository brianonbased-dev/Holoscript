/**
 * VR Trait System
 *
 * Implements VR interaction traits for HoloScript+ objects:
 * - @grabbable - Hand grab interactions
 * - @throwable - Physics-based throwing
 * - @pointable - Laser pointer interactions
 * - @hoverable - Hover state and highlights
 * - @scalable - Two-handed scaling
 * - @rotatable - Rotation interactions
 * - @stackable - Stacking behavior
 * - @snappable - Snap-to-point behavior
 * - @breakable - Destruction on impact
 *
 * @version 1.0.0
 */
// =============================================================================
// GRABBABLE TRAIT
// =============================================================================
const grabbableHandler = {
    name: 'grabbable',
    defaultConfig: {
        snap_to_hand: true,
        two_handed: false,
        haptic_on_grab: 0.5,
        grab_points: [],
        preserve_rotation: false,
        distance_grab: false,
        max_grab_distance: 3,
    },
    onAttach(node, config, context) {
        // Initialize grab state
        const state = {
            isGrabbed: false,
            grabbingHand: null,
            grabOffset: [0, 0, 0],
            grabRotationOffset: [0, 0, 0],
            previousHandPositions: [],
            previousHandTimes: [],
        };
        node.__grabState = state;
    },
    onDetach(node) {
        delete node.__grabState;
    },
    onUpdate(node, config, context, delta) {
        const state = node.__grabState;
        if (!state?.isGrabbed || !state.grabbingHand)
            return;
        // Follow hand position
        const hand = state.grabbingHand;
        const newPosition = config.snap_to_hand
            ? hand.position
            : [
                hand.position[0] + state.grabOffset[0],
                hand.position[1] + state.grabOffset[1],
                hand.position[2] + state.grabOffset[2],
            ];
        // Update position
        node.properties.position = newPosition;
        // Track velocity for throw
        state.previousHandPositions.push([...hand.position]);
        state.previousHandTimes.push(Date.now());
        // Keep last 10 frames
        if (state.previousHandPositions.length > 10) {
            state.previousHandPositions.shift();
            state.previousHandTimes.shift();
        }
        // Update rotation if not preserving
        if (!config.preserve_rotation) {
            node.properties.rotation = hand.rotation;
        }
    },
    onEvent(node, config, context, event) {
        const state = node.__grabState;
        if (event.type === 'grab_start') {
            // Check distance for distance grab
            if (!config.distance_grab) {
                const handPos = event.hand.position;
                const nodePos = node.properties.position || [0, 0, 0];
                const distance = Math.sqrt(Math.pow(handPos[0] - nodePos[0], 2) +
                    Math.pow(handPos[1] - nodePos[1], 2) +
                    Math.pow(handPos[2] - nodePos[2], 2));
                if (distance > (config.max_grab_distance || 3))
                    return;
            }
            state.isGrabbed = true;
            state.grabbingHand = event.hand;
            // Calculate grab offset
            const nodePos = node.properties.position || [0, 0, 0];
            state.grabOffset = [
                nodePos[0] - event.hand.position[0],
                nodePos[1] - event.hand.position[1],
                nodePos[2] - event.hand.position[2],
            ];
            // Haptic feedback
            if (config.haptic_on_grab) {
                context.haptics.pulse(event.hand.id, config.haptic_on_grab);
            }
            // Make kinematic while grabbed
            context.physics.setKinematic(node, true);
            // Emit grab event
            context.emit('grab', { node, hand: event.hand });
        }
        if (event.type === 'grab_end') {
            state.isGrabbed = false;
            state.grabbingHand = null;
            // Re-enable physics
            context.physics.setKinematic(node, false);
            // Calculate throw velocity from tracked positions
            if (state.previousHandPositions.length >= 2) {
                const len = state.previousHandPositions.length;
                const dt = (state.previousHandTimes[len - 1] - state.previousHandTimes[0]) / 1000;
                if (dt > 0) {
                    const velocity = [
                        (state.previousHandPositions[len - 1][0] - state.previousHandPositions[0][0]) / dt,
                        (state.previousHandPositions[len - 1][1] - state.previousHandPositions[0][1]) / dt,
                        (state.previousHandPositions[len - 1][2] - state.previousHandPositions[0][2]) / dt,
                    ];
                    // Apply velocity if throwable trait exists
                    if (node.traits.has('throwable')) {
                        const throwConfig = node.traits.get('throwable');
                        const multiplier = throwConfig.velocity_multiplier || 1;
                        context.physics.applyVelocity(node, [
                            velocity[0] * multiplier,
                            velocity[1] * multiplier,
                            velocity[2] * multiplier,
                        ]);
                    }
                }
            }
            // Clear tracking
            state.previousHandPositions = [];
            state.previousHandTimes = [];
            // Emit release event
            context.emit('release', { node, velocity: event.velocity });
        }
    },
};
// =============================================================================
// THROWABLE TRAIT
// =============================================================================
const throwableHandler = {
    name: 'throwable',
    defaultConfig: {
        velocity_multiplier: 1,
        gravity: true,
        max_velocity: 50,
        spin: true,
        bounce: false,
        bounce_factor: 0.5,
    },
    onAttach(node, config, context) {
        // Throwable works with grabbable - just configures throw behavior
    },
    onEvent(node, config, context, event) {
        if (event.type === 'collision' && config.bounce) {
            const collision = event.data;
            const bounceFactor = config.bounce_factor || 0.5;
            // Reflect velocity
            const velocity = collision.relativeVelocity;
            const normal = collision.normal;
            const dot = velocity[0] * normal[0] + velocity[1] * normal[1] + velocity[2] * normal[2];
            const reflected = [
                (velocity[0] - 2 * dot * normal[0]) * bounceFactor,
                (velocity[1] - 2 * dot * normal[1]) * bounceFactor,
                (velocity[2] - 2 * dot * normal[2]) * bounceFactor,
            ];
            context.physics.applyVelocity(node, reflected);
        }
    },
};
// =============================================================================
// POINTABLE TRAIT
// =============================================================================
const pointableHandler = {
    name: 'pointable',
    defaultConfig: {
        highlight_on_point: true,
        highlight_color: '#00ff00',
        cursor_style: 'pointer',
    },
    onAttach(node, config, context) {
        const state = {
            isPointed: false,
            pointingHand: null,
        };
        node.__pointState = state;
    },
    onDetach(node) {
        delete node.__pointState;
    },
    onEvent(node, config, context, event) {
        const state = node.__pointState;
        if (event.type === 'point_enter') {
            state.isPointed = true;
            state.pointingHand = event.hand;
            if (config.highlight_on_point) {
                node.properties.__originalEmissive = node.properties.emissive;
                node.properties.emissive = config.highlight_color;
            }
            context.emit('point_enter', { node, hand: event.hand });
        }
        if (event.type === 'point_exit') {
            state.isPointed = false;
            state.pointingHand = null;
            if (config.highlight_on_point) {
                node.properties.emissive = node.properties.__originalEmissive || null;
                delete node.properties.__originalEmissive;
            }
            context.emit('point_exit', { node });
        }
        if (event.type === 'click') {
            context.emit('click', { node, hand: event.hand });
        }
    },
};
// =============================================================================
// HOVERABLE TRAIT
// =============================================================================
const hoverableHandler = {
    name: 'hoverable',
    defaultConfig: {
        highlight_color: '#ffffff',
        scale_on_hover: 1.1,
        show_tooltip: false,
        tooltip_offset: [0, 0.2, 0],
        glow: false,
        glow_intensity: 0.5,
    },
    onAttach(node, config, context) {
        const state = {
            isHovered: false,
            hoveringHand: null,
            originalScale: typeof node.properties.scale === 'number' ? node.properties.scale : 1,
            originalColor: null,
        };
        node.__hoverState = state;
    },
    onDetach(node) {
        delete node.__hoverState;
    },
    onEvent(node, config, context, event) {
        const state = node.__hoverState;
        if (event.type === 'hover_enter') {
            state.isHovered = true;
            state.hoveringHand = event.hand;
            // Scale up
            if (config.scale_on_hover && config.scale_on_hover !== 1) {
                state.originalScale = typeof node.properties.scale === 'number' ? node.properties.scale : 1;
                node.properties.scale = state.originalScale * config.scale_on_hover;
            }
            // Glow effect
            if (config.glow) {
                state.originalColor = node.properties.emissive || null;
                node.properties.emissive = config.highlight_color;
                node.properties.emissiveIntensity = config.glow_intensity;
            }
            // Tooltip
            if (config.show_tooltip) {
                const tooltipText = typeof config.show_tooltip === 'string'
                    ? config.show_tooltip
                    : node.properties.tooltip || node.id || node.type;
                context.emit('show_tooltip', {
                    node,
                    text: tooltipText,
                    offset: config.tooltip_offset,
                });
            }
            context.emit('hover_enter', { node, hand: event.hand });
        }
        if (event.type === 'hover_exit') {
            state.isHovered = false;
            state.hoveringHand = null;
            // Restore scale
            if (config.scale_on_hover && config.scale_on_hover !== 1) {
                node.properties.scale = state.originalScale;
            }
            // Remove glow
            if (config.glow) {
                node.properties.emissive = state.originalColor;
                delete node.properties.emissiveIntensity;
            }
            // Hide tooltip
            if (config.show_tooltip) {
                context.emit('hide_tooltip', { node });
            }
            context.emit('hover_exit', { node });
        }
    },
};
// =============================================================================
// SCALABLE TRAIT
// =============================================================================
const scalableHandler = {
    name: 'scalable',
    defaultConfig: {
        min_scale: 0.1,
        max_scale: 10,
        uniform: true,
        pivot: [0, 0, 0],
    },
    onAttach(node, config, context) {
        const state = {
            isScaling: false,
            initialDistance: 0,
            initialScale: 1,
        };
        node.__scaleState = state;
    },
    onDetach(node) {
        delete node.__scaleState;
    },
    onUpdate(node, config, context, delta) {
        const state = node.__scaleState;
        if (!state?.isScaling)
            return;
        const { hands } = context.vr;
        if (!hands.left || !hands.right)
            return;
        // Calculate current distance between hands
        const currentDistance = Math.sqrt(Math.pow(hands.right.position[0] - hands.left.position[0], 2) +
            Math.pow(hands.right.position[1] - hands.left.position[1], 2) +
            Math.pow(hands.right.position[2] - hands.left.position[2], 2));
        // Calculate scale factor
        const scaleFactor = currentDistance / state.initialDistance;
        let newScale = state.initialScale * scaleFactor;
        // Clamp scale
        newScale = Math.max(config.min_scale || 0.1, Math.min(config.max_scale || 10, newScale));
        node.properties.scale = newScale;
        context.emit('scale_update', { node, scale: newScale });
    },
    onEvent(node, config, context, event) {
        const state = node.__scaleState;
        if (event.type === 'scale_start') {
            state.isScaling = true;
            state.initialScale = typeof node.properties.scale === 'number' ? node.properties.scale : 1;
            // Calculate initial distance between hands
            const { left, right } = event.hands;
            state.initialDistance = Math.sqrt(Math.pow(right.position[0] - left.position[0], 2) +
                Math.pow(right.position[1] - left.position[1], 2) +
                Math.pow(right.position[2] - left.position[2], 2));
            context.emit('scale_start', { node });
        }
        if (event.type === 'scale_end') {
            state.isScaling = false;
            context.emit('scale_end', { node, finalScale: node.properties.scale });
        }
    },
};
// =============================================================================
// ROTATABLE TRAIT
// =============================================================================
const rotatableHandler = {
    name: 'rotatable',
    defaultConfig: {
        axis: 'all',
        snap_angles: [],
        speed: 1,
    },
    onAttach(node, config, context) {
        const state = {
            isRotating: false,
            initialHandRotation: [0, 0, 0],
            initialObjectRotation: [0, 0, 0],
        };
        node.__rotateState = state;
    },
    onDetach(node) {
        delete node.__rotateState;
    },
    onUpdate(node, config, context, delta) {
        const state = node.__rotateState;
        if (!state?.isRotating)
            return;
        const hand = context.vr.getDominantHand();
        if (!hand)
            return;
        // Calculate rotation delta
        const deltaRotation = [
            (hand.rotation[0] - state.initialHandRotation[0]) * (config.speed || 1),
            (hand.rotation[1] - state.initialHandRotation[1]) * (config.speed || 1),
            (hand.rotation[2] - state.initialHandRotation[2]) * (config.speed || 1),
        ];
        // Apply axis constraint
        let newRotation;
        switch (config.axis) {
            case 'x':
                newRotation = [
                    state.initialObjectRotation[0] + deltaRotation[0],
                    state.initialObjectRotation[1],
                    state.initialObjectRotation[2],
                ];
                break;
            case 'y':
                newRotation = [
                    state.initialObjectRotation[0],
                    state.initialObjectRotation[1] + deltaRotation[1],
                    state.initialObjectRotation[2],
                ];
                break;
            case 'z':
                newRotation = [
                    state.initialObjectRotation[0],
                    state.initialObjectRotation[1],
                    state.initialObjectRotation[2] + deltaRotation[2],
                ];
                break;
            default:
                newRotation = [
                    state.initialObjectRotation[0] + deltaRotation[0],
                    state.initialObjectRotation[1] + deltaRotation[1],
                    state.initialObjectRotation[2] + deltaRotation[2],
                ];
        }
        // Snap to angles if configured
        if (config.snap_angles && config.snap_angles.length > 0) {
            newRotation = newRotation.map((angle) => {
                let closest = config.snap_angles[0];
                let minDiff = Math.abs(angle - closest);
                for (const snapAngle of config.snap_angles) {
                    const diff = Math.abs(angle - snapAngle);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closest = snapAngle;
                    }
                }
                // Only snap if close enough
                return minDiff < 10 ? closest : angle;
            });
        }
        node.properties.rotation = newRotation;
        context.emit('rotate_update', { node, rotation: newRotation });
    },
    onEvent(node, config, context, event) {
        const state = node.__rotateState;
        if (event.type === 'rotate_start') {
            state.isRotating = true;
            state.initialHandRotation = [...event.hand.rotation];
            state.initialObjectRotation = node.properties.rotation || [0, 0, 0];
            context.emit('rotate_start', { node });
        }
        if (event.type === 'rotate_end') {
            state.isRotating = false;
            context.emit('rotate_end', { node, finalRotation: node.properties.rotation });
        }
    },
};
// =============================================================================
// STACKABLE TRAIT
// =============================================================================
const stackableHandler = {
    name: 'stackable',
    defaultConfig: {
        stack_axis: 'y',
        stack_offset: 0,
        max_stack: 10,
        snap_distance: 0.5,
    },
    onAttach(node, config, context) {
        const state = {
            stackedItems: [],
            stackParent: null,
        };
        node.__stackState = state;
    },
    onDetach(node) {
        const state = node.__stackState;
        // Remove from parent stack
        if (state.stackParent) {
            const parentState = state.stackParent.__stackState;
            const index = parentState.stackedItems.indexOf(node);
            if (index > -1) {
                parentState.stackedItems.splice(index, 1);
            }
        }
        // Clear children
        state.stackedItems = [];
        delete node.__stackState;
    },
    onEvent(node, config, context, event) {
        const state = node.__stackState;
        if (event.type === 'collision' || event.type === 'trigger_enter') {
            const other = event.type === 'collision' ? event.data.target : event.other;
            // Check if other is stackable
            if (!other.traits.has('stackable'))
                return;
            const otherState = other.__stackState;
            if (!otherState)
                return;
            // Check stack limit
            if (state.stackedItems.length >= (config.max_stack || 10))
                return;
            // Check if close enough
            const nodePos = node.properties.position || [0, 0, 0];
            const otherPos = other.properties.position || [0, 0, 0];
            const axisIndex = config.stack_axis === 'x' ? 0 : config.stack_axis === 'z' ? 2 : 1;
            const otherAxes = [0, 1, 2].filter((i) => i !== axisIndex);
            // Check alignment on other axes
            let aligned = true;
            for (const axis of otherAxes) {
                if (Math.abs(nodePos[axis] - otherPos[axis]) > (config.snap_distance || 0.5)) {
                    aligned = false;
                    break;
                }
            }
            if (aligned && otherPos[axisIndex] > nodePos[axisIndex]) {
                // Other is above - add to stack
                state.stackedItems.push(other);
                otherState.stackParent = node;
                // Snap position
                const stackOffset = config.stack_offset || 0;
                const newPos = [...nodePos];
                newPos[axisIndex] = nodePos[axisIndex] + stackOffset;
                other.properties.position = newPos;
                context.emit('stack', { parent: node, child: other });
            }
        }
    },
};
// =============================================================================
// SNAPPABLE TRAIT
// =============================================================================
const snappableHandler = {
    name: 'snappable',
    defaultConfig: {
        snap_points: [],
        snap_distance: 0.3,
        snap_rotation: false,
        magnetic: false,
    },
    onUpdate(node, config, context, delta) {
        if (!config.snap_points || config.snap_points.length === 0)
            return;
        if (!config.magnetic)
            return;
        const nodePos = node.properties.position || [0, 0, 0];
        // Find closest snap point
        let closestPoint = null;
        let closestDistance = config.snap_distance || 0.3;
        for (const snapPoint of config.snap_points) {
            const distance = Math.sqrt(Math.pow(nodePos[0] - snapPoint[0], 2) +
                Math.pow(nodePos[1] - snapPoint[1], 2) +
                Math.pow(nodePos[2] - snapPoint[2], 2));
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = snapPoint;
            }
        }
        // Apply magnetic pull
        if (closestPoint) {
            const pullStrength = 0.1;
            node.properties.position = [
                nodePos[0] + (closestPoint[0] - nodePos[0]) * pullStrength,
                nodePos[1] + (closestPoint[1] - nodePos[1]) * pullStrength,
                nodePos[2] + (closestPoint[2] - nodePos[2]) * pullStrength,
            ];
        }
    },
    onEvent(node, config, context, event) {
        if (event.type !== 'grab_end')
            return;
        if (!config.snap_points || config.snap_points.length === 0)
            return;
        const nodePos = node.properties.position || [0, 0, 0];
        // Find closest snap point
        let closestPoint = null;
        let closestDistance = config.snap_distance || 0.3;
        for (const snapPoint of config.snap_points) {
            const distance = Math.sqrt(Math.pow(nodePos[0] - snapPoint[0], 2) +
                Math.pow(nodePos[1] - snapPoint[1], 2) +
                Math.pow(nodePos[2] - snapPoint[2], 2));
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = snapPoint;
            }
        }
        // Snap to closest point
        if (closestPoint) {
            node.properties.position = closestPoint;
            context.emit('snap', { node, point: closestPoint });
            // Haptic feedback
            context.haptics.pulse(event.hand.id, 0.3);
        }
    },
};
// =============================================================================
// BREAKABLE TRAIT
// =============================================================================
const breakableHandler = {
    name: 'breakable',
    defaultConfig: {
        break_velocity: 5,
        fragments: 8,
        fragment_mesh: undefined,
        sound_on_break: undefined,
        respawn: false,
        respawn_delay: '5s',
    },
    onEvent(node, config, context, event) {
        if (event.type !== 'collision')
            return;
        const collision = event.data;
        const impactVelocity = Math.sqrt(Math.pow(collision.relativeVelocity[0], 2) +
            Math.pow(collision.relativeVelocity[1], 2) +
            Math.pow(collision.relativeVelocity[2], 2));
        if (impactVelocity < (config.break_velocity || 5))
            return;
        // Play break sound
        if (config.sound_on_break) {
            context.audio.playSound(config.sound_on_break, {
                position: collision.point,
                spatial: true,
            });
        }
        // Spawn fragments
        const fragmentCount = config.fragments || 8;
        for (let i = 0; i < fragmentCount; i++) {
            const angle = (i / fragmentCount) * Math.PI * 2;
            const velocity = [
                Math.cos(angle) * 2,
                Math.random() * 3,
                Math.sin(angle) * 2,
            ];
            context.emit('spawn_fragment', {
                position: collision.point,
                velocity,
                mesh: config.fragment_mesh,
            });
        }
        // Emit break event
        context.emit('break', { node, impactVelocity, collision });
        // Handle respawn
        if (config.respawn) {
            const delay = parseDuration(config.respawn_delay || '5s');
            setTimeout(() => {
                context.emit('respawn', { node });
            }, delay);
        }
        // Mark for destruction
        node.properties.__destroyed = true;
    },
};
// =============================================================================
// UTILITIES
// =============================================================================
function parseDuration(duration) {
    const match = duration.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/);
    if (!match)
        return 0;
    const value = parseFloat(match[1]);
    const unit = match[2];
    switch (unit) {
        case 'ms':
            return value;
        case 's':
            return value * 1000;
        case 'm':
            return value * 60 * 1000;
        default:
            return value;
    }
}
// =============================================================================
// TRAIT REGISTRY
// =============================================================================
export class VRTraitRegistry {
    constructor() {
        this.handlers = new Map();
        // Register all built-in handlers
        this.register(grabbableHandler);
        this.register(throwableHandler);
        this.register(pointableHandler);
        this.register(hoverableHandler);
        this.register(scalableHandler);
        this.register(rotatableHandler);
        this.register(stackableHandler);
        this.register(snappableHandler);
        this.register(breakableHandler);
    }
    register(handler) {
        this.handlers.set(handler.name, handler);
    }
    getHandler(name) {
        return this.handlers.get(name);
    }
    attachTrait(node, traitName, config, context) {
        const handler = this.handlers.get(traitName);
        if (!handler)
            return;
        const mergedConfig = { ...handler.defaultConfig, ...config };
        node.traits.set(traitName, mergedConfig);
        if (handler.onAttach) {
            handler.onAttach(node, mergedConfig, context);
        }
    }
    detachTrait(node, traitName, context) {
        const handler = this.handlers.get(traitName);
        if (!handler)
            return;
        const config = node.traits.get(traitName);
        if (config && handler.onDetach) {
            handler.onDetach(node, config, context);
        }
        node.traits.delete(traitName);
    }
    updateTrait(node, traitName, context, delta) {
        const handler = this.handlers.get(traitName);
        if (!handler || !handler.onUpdate)
            return;
        const config = node.traits.get(traitName);
        if (config) {
            handler.onUpdate(node, config, context, delta);
        }
    }
    handleEvent(node, traitName, context, event) {
        const handler = this.handlers.get(traitName);
        if (!handler || !handler.onEvent)
            return;
        const config = node.traits.get(traitName);
        if (config) {
            handler.onEvent(node, config, context, event);
        }
    }
    updateAllTraits(node, context, delta) {
        for (const traitName of node.traits.keys()) {
            this.updateTrait(node, traitName, context, delta);
        }
    }
    handleEventForAllTraits(node, context, event) {
        for (const traitName of node.traits.keys()) {
            this.handleEvent(node, traitName, context, event);
        }
    }
}
// =============================================================================
// EXPORTS
// =============================================================================
export const vrTraitRegistry = new VRTraitRegistry();
export { grabbableHandler, throwableHandler, pointableHandler, hoverableHandler, scalableHandler, rotatableHandler, stackableHandler, snappableHandler, breakableHandler, };
