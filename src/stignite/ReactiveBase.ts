import { logger } from "../utils/logger.js";
import type { ComponentBase } from "./ComponentBase.js";
import type {
    ComponentId,
    ComponentUpdateInfo,
    ReactiveComponentConfig,
    SettingKey,
} from "./types.js";

/**
 * Reactive Component Decorator
 *
 * Automatically configures a component with:
 * - Component ID for identification
 * - Dependencies for smart updates
 * - Update priority for processing order
 * - Registration with UpdateOrchestrator
 */
export function ReactiveComponent(config: ReactiveComponentConfig) {
    // biome-ignore lint/suspicious/noExplicitAny: allow the decorator to work with any component
    return <T extends { new (...args: any[]): ComponentBase }>(target: T) =>
        class extends target {
            // biome-ignore lint/suspicious/noExplicitAny: allow the constructor to work with any arguments
            constructor(...args: any[]) {
                super(...args);

                // Set component properties from config
                this.componentId =
                    config.id || `component-${Date.now()}-${Math.random()}`;
                this.dependencies = config.dependencies;
                this.updatePriority = config.priority || 0;

                // Register with orchestrator after construction
                this.registerWithOrchestrator();
            }
        };
}

/**
 * Update Orchestrator - Singleton for managing component updates
 *
 * Handles the dependency graph and processes component updates
 * based on setting changes and component priorities.
 */
export class UpdateOrchestrator {
    private static instance: UpdateOrchestrator;
    private componentRegistry = new Map<ComponentId, ComponentBase>();
    private dependencyGraph = new Map<SettingKey, Set<ComponentId>>();
    private updateQueue: ComponentUpdateInfo[] = [];
    private isProcessing = false;

    static getInstance(): UpdateOrchestrator {
        if (!UpdateOrchestrator.instance) {
            UpdateOrchestrator.instance = new UpdateOrchestrator();
        }
        return UpdateOrchestrator.instance;
    }

    registerComponent(component: ComponentBase): void {
        if (!component.componentId) {
            component.componentId = `component-${Date.now()}-${Math.random()}`;
        }

        this.componentRegistry.set(component.componentId, component);

        // Register dependencies
        Object.keys(component.dependencies).forEach((settingKey) => {
            if (!this.dependencyGraph.has(settingKey)) {
                this.dependencyGraph.set(settingKey, new Set());
            }
            this.dependencyGraph.get(settingKey)?.add(component.componentId);
        });
    }

    unregisterComponent(componentId: ComponentId): void {
        this.componentRegistry.delete(componentId);

        // Remove from dependency graph
        this.dependencyGraph.forEach((componentSet) => {
            componentSet.delete(componentId);
        });
    }

    notifySettingChanged(settingKey: SettingKey, newValue: unknown): void {
        const affectedComponents = this.dependencyGraph.get(settingKey);

        if (!affectedComponents || affectedComponents.size === 0) {
            return;
        }

        // Create update info for each affected component
        affectedComponents.forEach((componentId) => {
            const component = this.componentRegistry.get(componentId);
            if (component) {
                const affectedParts = component.getAffectedParts(settingKey);
                const updateInfo: ComponentUpdateInfo = {
                    componentId,
                    affectedParts,
                    changes: { [settingKey]: newValue },
                    priority: component.updatePriority,
                };
                this.updateQueue.push(updateInfo);
            }
        });

        // Process updates
        this.processUpdateQueue();
    }

    private async processUpdateQueue(): Promise<void> {
        if (this.isProcessing || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        // Sort by priority (higher priority first)
        this.updateQueue.sort((a, b) => b.priority - a.priority);

        const currentBatch = [...this.updateQueue];
        this.updateQueue = [];

        // Process batch
        for (const updateInfo of currentBatch) {
            const component = this.componentRegistry.get(
                updateInfo.componentId,
            );
            if (component) {
                try {
                    component.render({
                        changes: updateInfo.changes,
                        affectedParts: updateInfo.affectedParts,
                        priority: updateInfo.priority,
                    });
                } catch (error) {
                    logger(
                        `Error updating component ${updateInfo.componentId}: ${error}`,
                    );
                }
            }
        }

        this.isProcessing = false;
    }
}
