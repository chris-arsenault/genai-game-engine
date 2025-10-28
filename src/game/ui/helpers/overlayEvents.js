/**
 * Emit standardized UI overlay visibility events.
 *
 * @param {EventBus|undefined|null} eventBus - Event bus instance
 * @param {string} overlayId - Overlay identifier (e.g., 'reputation', 'questLog')
 * @param {boolean} visible - Whether the overlay is visible
 * @param {Object} [context={}] - Optional context metadata
 */
export function emitOverlayVisibility(eventBus, overlayId, visible, context = {}) {
  if (!eventBus || typeof eventBus.emit !== 'function' || !overlayId) {
    return;
  }

  const payload = {
    overlayId,
    visible,
    timestamp: Date.now(),
    ...context,
  };

  eventBus.emit('ui:overlay_visibility_changed', payload);
  eventBus.emit(visible ? 'ui:overlay_opened' : 'ui:overlay_closed', payload);
}
