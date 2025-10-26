/**
 * TriggerSystem - handles narrative trigger zones.
 * Emits events when entities enter/exit trigger areas.
 * TODO: Add trigger state tracking (entered/exited).
 */
import { System } from '../ecs/System.js';

export class TriggerSystem extends System {
  constructor(componentRegistry, eventBus) {
    super(componentRegistry, eventBus, ['Position', 'Trigger']);
    this.priority = 25;
  }

  update(deltaTime, entities) {
    const targets = this.componentRegistry.queryEntities('Position');

    for (const triggerId of entities) {
      const triggerPos = this.getComponent(triggerId, 'Position');
      const trigger = this.getComponent(triggerId, 'Trigger');

      for (const targetId of targets) {
        if (targetId === triggerId) {
          continue;
        }

        const targetPos = this.getComponent(targetId, 'Position');
        const dist = Math.hypot(targetPos.x - triggerPos.x, targetPos.y - triggerPos.y);

        if (dist < trigger.radius) {
          this.eventBus.emit('trigger:entered', { triggerId, targetId });
        }
      }
    }
  }
}
