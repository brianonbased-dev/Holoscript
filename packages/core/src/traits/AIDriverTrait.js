/**
 * @holoscript/core AI-Driven NPC Trait
 *
 * Enables intelligent NPC behaviors using behavior trees and goal planning
 * Integrates with uaa2-service for agent-based decision making
 */
/**
 * Behavior tree runner
 */
export class BehaviorTreeRunner {
    constructor(rootNode) {
        this.rootNode = rootNode;
    }
    async tick(context) {
        return this.executeNode(this.rootNode, context);
    }
    async executeNode(node, context) {
        if (node.type === 'action') {
            if (node.action) {
                try {
                    return await node.action(context);
                }
                catch (error) {
                    console.error(`Action failed: ${node.id}`, error);
                    return false;
                }
            }
            return true;
        }
        if (node.type === 'condition') {
            return node.condition ? node.condition(context) : true;
        }
        if (node.type === 'sequence') {
            for (const child of node.children || []) {
                const result = await this.executeNode(child, context);
                if (!result)
                    return false;
            }
            return true;
        }
        if (node.type === 'selector') {
            for (const child of node.children || []) {
                const result = await this.executeNode(child, context);
                if (result)
                    return true;
            }
            return false;
        }
        if (node.type === 'parallel') {
            const results = await Promise.all((node.children || []).map((child) => this.executeNode(child, context)));
            return results.every((r) => r);
        }
        return true;
    }
}
/**
 * Goal-Oriented Action Planning (GOAP)
 */
export class GOAPPlanner {
    constructor(goals) {
        this.goals = goals.sort((a, b) => b.priority - a.priority);
    }
    /**
     * Plan a sequence of actions to reach goal
     */
    planGoal(currentState, _goal) {
        // Simple greedy planner: select highest-priority achievable goal
        for (const g of this.goals) {
            if (this.canAchieve(currentState, g)) {
                return [g];
            }
        }
        return [];
    }
    canAchieve(currentState, goal) {
        for (const [key, value] of goal.preconditions) {
            if (currentState.get(key) !== value) {
                return false;
            }
        }
        return true;
    }
}
/**
 * AIDriverTrait - Enables intelligent NPC behaviors
 */
export class AIDriverTrait {
    constructor(config) {
        this.behaviorRunner = null;
        this.goapPlanner = null;
        this.updateInterval = null;
        this.learningModel = new Map();
        this.config = {
            decisionMode: 'hybrid',
            personality: {
                sociability: 0.5,
                aggression: 0.3,
                curiosity: 0.6,
                loyalty: 0.7,
            },
            stimuliThresholds: {
                hearing: 50,
                sight: 100,
                touch: 5,
            },
            enableLearning: true,
            learningRate: 0.1,
            ...config,
        };
        this.context = {
            npcId: config.npcId,
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            memory: new Map(),
            state: 'idle',
            energy: 1.0,
            mood: 0,
            perception: {
                nearbyEntities: [],
                visibleEntities: [],
            },
        };
        if (config.behaviorTree) {
            this.behaviorRunner = new BehaviorTreeRunner(config.behaviorTree);
        }
        if (config.goals && config.goals.length > 0) {
            this.goapPlanner = new GOAPPlanner(config.goals);
        }
    }
    /**
     * Start NPC AI loop
     */
    startAI() {
        if (this.updateInterval)
            return;
        this.updateInterval = setInterval(() => {
            this.tick();
        }, 100); // 10 Hz update rate
    }
    /**
     * Stop NPC AI loop
     */
    stopAI() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    /**
     * Main AI tick
     */
    async tick() {
        // Update energy (decreases over time)
        this.context.energy = Math.max(0, this.context.energy - 0.001);
        // Stress/mood changes
        if (this.context.perception.visibleEntities.length > 0) {
            this.context.mood += 0.1 * (Math.random() - 0.5);
        }
        // Execute appropriate decision mode
        switch (this.config.decisionMode) {
            case 'reactive':
                await this.reactiveDecision();
                break;
            case 'goal-driven':
                await this.goalDrivenDecision();
                break;
            case 'learning':
                await this.learningDecision();
                break;
            case 'hybrid':
                await this.hybridDecision();
                break;
        }
    }
    /**
     * Reactive decision: immediate response to stimuli
     */
    async reactiveDecision() {
        if (this.behaviorRunner) {
            await this.behaviorRunner.tick(this.context);
        }
    }
    /**
     * Goal-driven decision: plan towards objectives
     */
    async goalDrivenDecision() {
        if (!this.goapPlanner)
            return;
        const worldState = this.buildWorldState();
        // Select highest priority goal
        const plan = this.goapPlanner.planGoal(worldState, this.config.goals?.[0] || { id: 'idle', name: 'Idle', priority: 0, preconditions: new Map(), effects: new Map(), cost: 0 });
        if (plan.length > 0) {
            // Execute plan
            this.context.state = 'moving';
        }
    }
    /**
     * Learning decision: adapt behavior from experience
     */
    async learningDecision() {
        // Composite reactive + learning
        await this.reactiveDecision();
        // Learn from interactions
        if (this.config.enableLearning) {
            this.updateLearningModel();
        }
    }
    /**
     * Hybrid decision: combination of reactive and goal-driven
     */
    async hybridDecision() {
        // Execute behavior tree (reactive)
        if (this.behaviorRunner) {
            const treeResult = await this.behaviorRunner.tick(this.context);
            // If no immediate action, pursue goals
            if (!treeResult && this.goapPlanner) {
                await this.goalDrivenDecision();
            }
        }
    }
    /**
     * Build world state for planning
     */
    buildWorldState() {
        const state = new Map();
        state.set('position', this.context.position);
        state.set('energy', this.context.energy);
        state.set('mood', this.context.mood);
        state.set('nearbyEntities', this.context.perception.nearbyEntities.length);
        return state;
    }
    /**
     * Update learning model from interactions
     */
    updateLearningModel() {
        // Simple Q-learning-like update
        const currentReward = this.calculateReward();
        const learningRate = this.config.learningRate || 0.1;
        // Update learned value estimates
        const stateKey = `state_${this.context.state}`;
        const currentValue = this.learningModel.get(stateKey) || 0;
        const newValue = currentValue + learningRate * (currentReward - currentValue);
        this.learningModel.set(stateKey, newValue);
    }
    /**
     * Calculate immediate reward
     */
    calculateReward() {
        let reward = 0;
        // Reward based on energy maintenance
        if (this.context.energy > 0.5)
            reward += 1;
        // Reward based on social interaction (if sociable)
        if (this.config.personality?.sociability || 0 > 0.5 &&
            this.context.perception.nearbyEntities.length > 0) {
            reward += 1;
        }
        // Reward based on goal progress
        if (this.context.state !== 'idle')
            reward += 0.5;
        return reward;
    }
    /**
     * Set NPC position
     */
    setPosition(position) {
        this.context.position = position;
    }
    /**
     * Update perception (nearby entities, visible targets)
     */
    updatePerception(nearbyEntities, visibleEntities) {
        this.context.perception.nearbyEntities = nearbyEntities;
        this.context.perception.visibleEntities = visibleEntities;
    }
    /**
     * Add dialogue to conversation history
     */
    speak(text) {
        if (!this.context.dialogue) {
            this.context.dialogue = { conversationHistory: [] };
        }
        this.context.dialogue.lastSaid = text;
        this.context.dialogue.conversationHistory.push({
            speaker: this.config.npcId,
            text,
        });
    }
    /**
     * Receive dialogue from another entity
     */
    hear(speaker, text) {
        if (!this.context.dialogue) {
            this.context.dialogue = { conversationHistory: [] };
        }
        this.context.dialogue.lastHeard = text;
        this.context.dialogue.conversationHistory.push({
            speaker,
            text,
        });
    }
    /**
     * Get current NPC context
     */
    getContext() {
        return { ...this.context };
    }
    /**
     * Dispose and cleanup
     */
    dispose() {
        this.stopAI();
        this.context.memory.clear();
        this.learningModel.clear();
    }
}
/**
 * HoloScript+ @ai_driven trait factory
 */
export function createAIDriverTrait(config) {
    return new AIDriverTrait(config);
}
