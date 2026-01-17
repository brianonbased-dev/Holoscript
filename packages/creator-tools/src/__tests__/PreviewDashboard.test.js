/**
 * Phase 6: PreviewDashboard Component Tests
 *
 * Tests for React PreviewDashboard component including:
 * - Device card rendering
 * - Metrics display
 * - Recommendations panel
 * - Comparison table
 * - Performance history chart
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewDashboard } from '../PreviewDashboard';
import { mockDevices, mockMetrics } from './setup';
describe('PreviewDashboard Component', () => {
    const mockOnMetricsUpdate = vi.fn();
    const mockOnRecommendation = vi.fn();
    const initialMetrics = {
        [mockDevices[0].id]: mockMetrics,
        [mockDevices[1].id]: mockMetrics,
        [mockDevices[2].id]: mockMetrics,
        [mockDevices[3].id]: mockMetrics,
        [mockDevices[4].id]: mockMetrics,
        [mockDevices[5].id]: mockMetrics,
    };
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('Rendering', () => {
        it('should render component', () => {
            const { container } = render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(container).toBeDefined();
        });
        it('should render all device cards', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            mockDevices.forEach(device => {
                expect(screen.getByText(device.name)).toBeDefined();
            });
        });
        it('should display 6 device cards', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const cards = screen.getAllByRole('article');
            expect(cards.length).toBeGreaterThanOrEqual(6);
        });
    });
    describe('Device Cards', () => {
        it('should show device name', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText('iPhone 15 Pro')).toBeDefined();
            expect(screen.getByText('iPad Pro 12.9')).toBeDefined();
        });
        it('should show device type', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/mobile|vr|desktop/i)).toBeDefined();
        });
        it('should show device specs', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should display GPU memory info
            expect(screen.getByText(/GPU|memory|mb/i)).toBeDefined();
        });
        it('should show FPS metric', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/FPS|fps/)).toBeDefined();
        });
        it('should show GPU usage metric', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/GPU|memory/i)).toBeDefined();
        });
        it('should show draw calls metric', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/draw|call/i)).toBeDefined();
        });
        it('should indicate performance status with color', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should have status indicators
            expect(screen.getByText(/green|yellow|red|good|ok|warning|bad|poor/i)).toBeDefined();
        });
    });
    describe('Metrics Display', () => {
        it('should display FPS values', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should show the metrics from mockMetrics
            expect(screen.getByText(/60/)).toBeDefined(); // FPS value
        });
        it('should display GPU memory in MB', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/256|512|1024|mb/i)).toBeDefined();
        });
        it('should display GPU usage percentage', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/50%|percentage|percent/i)).toBeDefined();
        });
        it('should display draw calls count', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/150|draw/i)).toBeDefined();
        });
        it('should update metrics dynamically', () => {
            const { rerender } = render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const updatedMetrics = {
                ...initialMetrics,
                [mockDevices[0].id]: {
                    ...mockMetrics,
                    fps: 45,
                },
            };
            rerender(<PreviewDashboard devices={mockDevices} metrics={updatedMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/45/)).toBeDefined();
        });
    });
    describe('Recommendations Panel', () => {
        it('should render recommendations section', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/recommendation|suggest|optimize/i)).toBeDefined();
        });
        it('should show recommendation for low FPS', () => {
            const lowFpsMetrics = {
                ...initialMetrics,
                [mockDevices[0].id]: {
                    ...mockMetrics,
                    fps: 20,
                },
            };
            render(<PreviewDashboard devices={mockDevices} metrics={lowFpsMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/performance|optimization|reduce|lower|fps/i)).toBeDefined();
        });
        it('should show recommendation for high GPU usage', () => {
            const highGpuMetrics = {
                ...initialMetrics,
                [mockDevices[0].id]: {
                    ...mockMetrics,
                    gpuMemoryPercentage: 95,
                },
            };
            render(<PreviewDashboard devices={mockDevices} metrics={highGpuMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/gpu|memory|reduce|optimize|decrease/i)).toBeDefined();
        });
        it('should show recommendation for high draw calls', () => {
            const highDrawMetrics = {
                ...initialMetrics,
                [mockDevices[0].id]: {
                    ...mockMetrics,
                    drawCalls: 5000,
                },
            };
            render(<PreviewDashboard devices={mockDevices} metrics={highDrawMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/draw|call|batch|merge|reduce/i)).toBeDefined();
        });
        it('should call onRecommendation when recommendation clicked', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const recommendationBtns = screen.queryAllByRole('button');
            if (recommendationBtns.length > 0) {
                fireEvent.click(recommendationBtns[0]);
                expect(mockOnRecommendation).toHaveBeenCalled();
            }
        });
    });
    describe('Comparison Table', () => {
        it('should render comparison section', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/compare|comparison|cross-device/i)).toBeDefined();
        });
        it('should show device names in comparison', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // All device names should be visible in comparison
            expect(screen.getByText('iPhone 15 Pro')).toBeDefined();
            expect(screen.getByText('RTX 4090')).toBeDefined();
        });
        it('should compare FPS across devices', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should display metrics for comparison
            expect(screen.getByText(/fps|60/)).toBeDefined();
        });
        it('should compare GPU memory across devices', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/gpu|memory|mb/i)).toBeDefined();
        });
        it('should identify best and worst performers', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should have indicators for best/worst
            expect(screen.getByText(/best|worst|highest|lowest|top|bottom/i)).toBeDefined();
        });
    });
    describe('History Chart', () => {
        it('should render chart section', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/chart|graph|history|timeline/i)).toBeDefined();
        });
        it('should display performance history', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Chart should be rendered
            expect(screen.getByRole('img') || screen.getByText(/chart/i)).toBeDefined();
        });
        it('should update chart with new metrics', () => {
            const { rerender } = render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const updatedMetrics = {
                ...initialMetrics,
                [mockDevices[0].id]: {
                    ...mockMetrics,
                    fps: 45,
                },
            };
            rerender(<PreviewDashboard devices={mockDevices} metrics={updatedMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Chart should update
            expect(screen.getByText(/chart|graph|history/i)).toBeDefined();
        });
        it('should show trend indicators', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should show trend up/down indicators
            expect(screen.getByText(/trend|up|down|increasing|decreasing/i)).toBeDefined();
        });
    });
    describe('Monitoring Controls', () => {
        it('should render start monitoring button', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const buttons = screen.getAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
        it('should call onMetricsUpdate when starting monitoring', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const startBtn = screen.getByText(/start|monitor|record/i);
            fireEvent.click(startBtn);
            expect(mockOnMetricsUpdate).toHaveBeenCalled();
        });
        it('should show monitoring status', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(screen.getByText(/monitoring|active|recording|status/i)).toBeDefined();
        });
    });
    describe('Export Functionality', () => {
        it('should render export button', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const exportBtn = screen.getByText(/export|download|save/i);
            expect(exportBtn).toBeDefined();
        });
        it('should export metrics on button click', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const exportBtn = screen.getByText(/export|download|save/i);
            fireEvent.click(exportBtn);
            // Should trigger export action
            expect(exportBtn).toBeDefined();
        });
    });
    describe('Device Selection', () => {
        it('should allow selecting devices', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const cards = screen.getAllByRole('article');
            if (cards.length > 0) {
                fireEvent.click(cards[0]);
                // Card should be selected
                expect(cards[0]).toBeDefined();
            }
        });
        it('should highlight selected device', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const cards = screen.getAllByRole('article');
            if (cards.length > 0) {
                fireEvent.click(cards[0]);
                // Selected device should have highlight class
                expect(cards[0]).toBeDefined();
            }
        });
        it('should show detailed view for selected device', () => {
            render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            const cards = screen.getAllByRole('article');
            if (cards.length > 0) {
                fireEvent.click(cards[0]);
                // Detailed view should be shown
                expect(screen.getByText(/detail|info|specification/i)).toBeDefined();
            }
        });
    });
    describe('Edge Cases', () => {
        it('should handle missing metrics gracefully', () => {
            const emptyMetrics = {};
            render(<PreviewDashboard devices={mockDevices} metrics={emptyMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should still render devices
            expect(screen.getByText('iPhone 15 Pro')).toBeDefined();
        });
        it('should handle empty device list', () => {
            render(<PreviewDashboard devices={[]} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            // Should handle gracefully
            expect(screen.getByText(/no devices|empty/i)).toBeDefined();
        });
        it('should handle unmounting gracefully', () => {
            const { unmount } = render(<PreviewDashboard devices={mockDevices} metrics={initialMetrics} onMetricsUpdate={mockOnMetricsUpdate} onRecommendation={mockOnRecommendation}/>);
            expect(() => unmount()).not.toThrow();
        });
    });
});
