/**
 * @holoscript/navigation - FlowFieldGenerator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FlowFieldGenerator } from '../FlowFieldGenerator';

describe('FlowFieldGenerator', () => {
  let flowField: FlowFieldGenerator;

  beforeEach(() => {
    flowField = new FlowFieldGenerator({
      width: 16,
      height: 16,
      cellSize: 1.0,
    });
  });

  describe('initialization', () => {
    it('should create with default config', () => {
      const ff = new FlowFieldGenerator();
      expect(ff).toBeDefined();
    });

    it('should accept custom config', () => {
      const ff = new FlowFieldGenerator({ width: 32, height: 32 });
      expect(ff).toBeDefined();
    });
  });

  describe('setGoal', () => {
    it('should set goal and mark dirty', () => {
      flowField.setGoal(5, 5);
      // After setting goal, getCost should work
      flowField.update();
      const cost = flowField.getCost(5, 5);
      expect(cost).toBe(0);
    });

    it('should calculate costs from goal', () => {
      flowField.setGoal(8, 8);
      flowField.update();
      
      // Cells near goal should have lower cost
      const nearCost = flowField.getCost(7, 8);
      const farCost = flowField.getCost(0, 0);
      expect(nearCost).toBeLessThan(farCost);
    });
  });

  describe('obstacles', () => {
    it('should add obstacle', () => {
      flowField.addObstacle(5, 5);
      expect(flowField.isBlocked(5, 5)).toBe(true);
    });

    it('should remove obstacle', () => {
      flowField.addObstacle(5, 5);
      flowField.removeObstacle(5, 5);
      expect(flowField.isBlocked(5, 5)).toBe(false);
    });

    it('should clear all obstacles', () => {
      flowField.addObstacle(5, 5);
      flowField.addObstacle(6, 6);
      flowField.clearObstacles();
      expect(flowField.isBlocked(5, 5)).toBe(false);
      expect(flowField.isBlocked(6, 6)).toBe(false);
    });
  });

  describe('getVector', () => {
    it('should return direction towards goal', () => {
      flowField.setGoal(8, 8);
      flowField.update();
      
      const vec = flowField.getVector(4, 8);
      // Should point right (towards goal at 8,8)
      expect(vec.x).toBeGreaterThan(0);
    });

    it('should return zero for blocked cells', () => {
      flowField.setGoal(8, 8);
      flowField.addObstacle(4, 4);
      flowField.update();
      
      const vec = flowField.getVector(4, 4);
      expect(vec.x).toBe(0);
      expect(vec.y).toBe(0);
    });

    it('should handle out of bounds', () => {
      const vec = flowField.getVector(-1, -1);
      expect(vec).toBeDefined();
    });
  });
});
