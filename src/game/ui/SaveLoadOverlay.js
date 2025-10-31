import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { getBindingLabels } from '../utils/controlBindingPrompts.js';

const DEFAULT_LAYOUT = {
  width: 520,
  height: 360,
};

const STATUS_DISPLAY_MS = 4000;

function formatTimestamp(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString?.() ?? date.toISOString();
}

function formatPlaytime(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '—';
  }
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function buildDisplayLabel(slot, label) {
  if (typeof label === 'string' && label.trim().length) {
    return label.trim();
  }
  if (typeof slot === 'string' && /^slot(\d+)$/i.test(slot)) {
    const [, index] = slot.match(/^slot(\d+)$/i);
    return `Slot ${Number(index)}`;
  }
  if (slot === 'autosave') {
    return 'Autosave';
  }
  if (typeof slot === 'string' && slot.length) {
    return slot;
  }
  return 'Manual Slot';
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const corner = Math.max(0, radius ?? 0);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + width - corner, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
  ctx.lineTo(x + width, y + height - corner);
  ctx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  ctx.lineTo(x + corner, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.closePath();
}

export class SaveLoadOverlay {
  constructor(canvas, eventBus, options = {}) {
    if (!canvas) {
      throw new Error('SaveLoadOverlay requires a canvas reference');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.events = eventBus;
    this.saveManager = options.saveManager ?? null;

    this.visible = false;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = options.fadeSpeed ?? 6;

    this.layout = {
      width: options.width ?? DEFAULT_LAYOUT.width,
      height: options.height ?? DEFAULT_LAYOUT.height,
    };

    this.slots = [];
    this.selectedIndex = 0;

    this.statusMessage = null;
    this.statusLevel = 'info';
    this.statusMessageUntil = 0;

    const { palette, typography, metrics } = overlayTheme;
    const styleOverrides = options.styleOverrides ?? {};

    this.style = {
      panel: withOverlayTheme({
        background: palette.backgroundSurface,
        borderColor: palette.outlineSoft,
        borderWidth: 2,
        cornerRadius: metrics.overlayCornerRadius,
        shadowColor: 'rgba(0, 0, 0, 0.55)',
        shadowBlur: 28,
      }, styleOverrides.panel),
      header: withOverlayTheme({
        titleFont: typography.title,
        subtitleFont: typography.small,
        titleColor: palette.textPrimary,
        subtitleColor: palette.textMuted,
        accent: palette.accent,
      }, styleOverrides.header),
      list: withOverlayTheme({
        font: typography.body,
        muted: palette.textMuted,
        active: palette.textPrimary,
        autoColor: palette.textMuted,
        manualColor: palette.textSecondary,
        actionColor: palette.accent,
        selectionBackground: 'rgba(73, 217, 255, 0.18)',
        selectionBorder: 'rgba(73, 217, 255, 0.65)',
        lineHeight: 20,
      }, styleOverrides.list),
      detail: withOverlayTheme({
        headingFont: typography.body,
        font: typography.small,
        color: palette.textPrimary,
        muted: palette.textMuted,
        accent: palette.accent,
        lineHeight: 20,
      }, styleOverrides.detail),
      status: withOverlayTheme({
        font: typography.small,
        success: '#69f7b0',
        error: '#ff7b92',
        info: palette.textPrimary,
      }, styleOverrides.status),
    };

    this._offMoveUp = null;
    this._offMoveDown = null;
    this._offConfirm = null;
    this._offInteract = null;
    this._offCancel = null;
    this._offSaved = null;
    this._offLoaded = null;
  }

  init() {
    this.refreshSlots();

    if (!this.eventBus) {
      return;
    }

    this._offMoveUp = this.eventBus.on('input:moveUp:pressed', () => {
      if (this.visible) {
        this.changeSelection(-1);
      }
    });

    this._offMoveDown = this.eventBus.on('input:moveDown:pressed', () => {
      if (this.visible) {
        this.changeSelection(1);
      }
    });

    this._offConfirm = this.eventBus.on('input:confirm:pressed', () => {
      if (this.visible) {
        this._performLoad();
      }
    });

    this._offInteract = this.eventBus.on('input:interact:pressed', () => {
      if (this.visible) {
        this._performSave();
      }
    });

    this._offCancel = this.eventBus.on('input:cancel:pressed', () => {
      if (this.visible) {
        this.hide('input:cancel');
      }
    });

    this._offSaved = this.eventBus.on('game:saved', () => {
      this.refreshSlots();
    });

    this._offLoaded = this.eventBus.on('game:loaded', () => {
      this.refreshSlots();
    });
  }

  cleanup() {
    if (this._offMoveUp) {
      this._offMoveUp();
      this._offMoveUp = null;
    }
    if (this._offMoveDown) {
      this._offMoveDown();
      this._offMoveDown = null;
    }
    if (this._offConfirm) {
      this._offConfirm();
      this._offConfirm = null;
    }
    if (this._offInteract) {
      this._offInteract();
      this._offInteract = null;
    }
    if (this._offCancel) {
      this._offCancel();
      this._offCancel = null;
    }
    if (this._offSaved) {
      this._offSaved();
      this._offSaved = null;
    }
    if (this._offLoaded) {
      this._offLoaded();
      this._offLoaded = null;
    }

    this.hide('cleanup');
    this.slots = [];
  }

  toggle(source = 'toggle') {
    if (this.visible) {
      this.hide(source);
    } else {
      this.show(source);
    }
  }

  show(source = 'show') {
    this.refreshSlots();
    this.visible = true;
    this.targetAlpha = 1;
    this._clearStatus();

    emitOverlayVisibility(this.eventBus, 'saveLoad', true, { source });
    this._emitFxCue('saveLoadOverlayReveal', { source });
  }

  hide(source = 'hide') {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    const wasVisible = this.visible;
    this.visible = false;
    this.targetAlpha = 0;

    if (wasVisible) {
      emitOverlayVisibility(this.eventBus, 'saveLoad', false, { source });
      this._emitFxCue('saveLoadOverlayDismiss', { source });
    }
  }

  update(deltaTime) {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(this.targetAlpha, this.fadeAlpha + this.fadeSpeed * deltaTime);
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(this.targetAlpha, this.fadeAlpha - this.fadeSpeed * deltaTime);
    }

    if (this.statusMessage && Date.now() > this.statusMessageUntil) {
      this._clearStatus();
    }
  }

  render() {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha * 0.75;
    ctx.fillStyle = 'rgba(4, 12, 18, 0.7)';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    const panelWidth = this.layout.width;
    const panelHeight = this.layout.height;
    const panelX = Math.round((width - panelWidth) / 2);
    const panelY = Math.round((height - panelHeight) / 2);

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;
    this._renderPanel(ctx, panelX, panelY, panelWidth, panelHeight);
    ctx.restore();
  }

  refreshSlots() {
    if (!this.saveManager) {
      this.slots = [];
      this.selectedIndex = 0;
      return;
    }

    const metadataList = this.saveManager.getSaveSlots();
    const entries = [];

    const autosaveMeta = this.saveManager.getSaveSlotMetadata('autosave');
    entries.push(this._buildAutosaveEntry(autosaveMeta));

    const manualLookup = new Map();
    for (const entry of metadataList) {
      if (!entry || entry.slot === 'autosave') {
        continue;
      }
      if (entry.slotType !== 'manual') {
        continue;
      }
      manualLookup.set(entry.slot, entry);
    }

    const manualEntries = Array.from(manualLookup.values()).sort((a, b) => {
      const timeA = a.timestamp ?? 0;
      const timeB = b.timestamp ?? 0;
      return timeB - timeA;
    });

    for (const entry of manualEntries) {
      entries.push({
        id: entry.slot,
        slot: entry.slot,
        label: buildDisplayLabel(entry.slot, entry.label),
        rawLabel: entry.label ?? entry.slot ?? 'Manual Slot',
        exists: true,
        slotType: 'manual',
        timestamp: entry.timestamp ?? null,
        playtime: entry.playtime ?? null,
        snapshotSource: entry.snapshotSource ?? null,
      });
    }

    const capacity = Math.max(0, this.saveManager?.config?.maxSaveSlots ?? 0);
    if (manualEntries.length < capacity) {
      entries.push({
        id: 'create',
        slot: null,
        label: 'Create New Manual Slot',
        exists: false,
        slotType: 'action',
        timestamp: null,
        playtime: null,
        snapshotSource: null,
      });
    }

    this.slots = entries;

    if (this.selectedIndex >= this.slots.length) {
      this.selectedIndex = Math.max(0, this.slots.length - 1);
    }
  }

  changeSelection(direction) {
    if (!this.slots.length) {
      return;
    }

    const count = this.slots.length;
    this.selectedIndex = (this.selectedIndex + direction + count) % count;
    this._emitFxCue('saveLoadOverlayFocus', {
      index: this.selectedIndex,
      slot: this.slots[this.selectedIndex]?.slot ?? null,
    });
  }

  _performLoad() {
    if (!this.saveManager || !this.slots.length) {
      return;
    }

    const entry = this.slots[this.selectedIndex];
    if (!entry || !entry.slot || !entry.exists) {
      this._setStatus('No save data in this slot.', 'error');
      return;
    }

    const success = this.saveManager.loadGame(entry.slot);
    if (success) {
      this._setStatus(`Loaded ${entry.label}.`, 'info');
      this.hide('load');
    } else {
      this._setStatus('Failed to load save slot.', 'error');
    }
  }

  _performSave() {
    if (!this.saveManager || !this.slots.length) {
      return;
    }

    const entry = this.slots[this.selectedIndex];
    if (!entry) {
      return;
    }

    if (entry.slotType === 'action') {
      this._createManualSlotAndSave();
      return;
    }

    const slotName = entry.slot ?? 'autosave';
    const success = this.saveManager.saveGame(slotName);
    if (success) {
      this._setStatus(`Saved to ${entry.label}.`, 'success');
      this.refreshSlots();
    } else {
      this._setStatus('Save failed. Check storage capacity.', 'error');
    }
  }

  _createManualSlotAndSave() {
    if (!this.saveManager) {
      return;
    }

    const manualSlots = this.slots.filter((entry) => entry.slotType === 'manual' && entry.slot);
    const used = new Set(manualSlots.map((entry) => entry.slot));
    const capacity = Math.max(1, this.saveManager?.config?.maxSaveSlots ?? 1);

    let slotName = null;
    let displayLabel = null;

    for (let i = 1; i <= capacity; i += 1) {
      const candidate = `slot${i}`;
      if (!used.has(candidate)) {
        slotName = candidate;
        displayLabel = `Slot ${i}`;
        break;
      }
    }

    if (!slotName) {
      slotName = `slot${Date.now()}`;
      displayLabel = 'Manual Slot';
    }

    const success = this.saveManager.saveGame(slotName);
    if (success) {
      this._setStatus(`Saved to ${displayLabel}.`, 'success');
      this.refreshSlots();
      this._focusSlot(slotName);
    } else {
      this._setStatus('Failed to create save slot.', 'error');
    }
  }

  _focusSlot(slotName) {
    const index = this.slots.findIndex((entry) => entry.slot === slotName);
    if (index >= 0) {
      this.selectedIndex = index;
    }
  }

  _clearStatus() {
    this.statusMessage = null;
    this.statusLevel = 'info';
    this.statusMessageUntil = 0;
  }

  _setStatus(message, level) {
    this.statusMessage = message;
    this.statusLevel = level ?? 'info';
    this.statusMessageUntil = Date.now() + STATUS_DISPLAY_MS;
  }

  _buildAutosaveEntry(metadata) {
    if (metadata && typeof metadata === 'object') {
      return {
        id: 'autosave',
        slot: 'autosave',
        label: 'Autosave',
        exists: true,
        slotType: 'auto',
        timestamp: metadata.timestamp ?? null,
        playtime: metadata.playtime ?? null,
        snapshotSource: metadata.snapshotSource ?? null,
      };
    }

    return {
      id: 'autosave',
      slot: 'autosave',
      label: 'Autosave',
      exists: false,
      slotType: 'auto',
      timestamp: null,
      playtime: null,
      snapshotSource: null,
    };
  }

  _renderPanel(ctx, x, y, width, height) {
    const padding = 24;
    const panel = this.style.panel;

    ctx.save();
    ctx.shadowColor = panel.shadowColor;
    ctx.shadowBlur = panel.shadowBlur;
    drawRoundedRect(ctx, x, y, width, height, panel.cornerRadius);
    ctx.fillStyle = panel.background;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = panel.borderWidth;
    ctx.strokeStyle = panel.borderColor;
    ctx.stroke();
    ctx.restore();

    const headerY = y + padding;

    ctx.save();
    ctx.fillStyle = this.style.header.titleColor;
    ctx.font = this.style.header.titleFont;
    ctx.textBaseline = 'top';
    ctx.fillText('Save / Load', x + padding, headerY);

    ctx.font = this.style.header.subtitleFont;
    ctx.fillStyle = this.style.header.subtitleColor;
    ctx.fillText(this._buildBindingHintText(), x + padding, headerY + 32);
    ctx.restore();

    const listX = x + padding;
    const listY = headerY + 64;
    const listWidth = Math.floor(width * 0.5) - padding;
    const listHeight = height - (listY - y) - padding - 28;

    const detailX = x + Math.floor(width * 0.5);
    const detailY = listY;
    const detailWidth = width - (detailX - x) - padding;
    const detailHeight = listHeight;

    this._renderSlotList(ctx, listX, listY, listWidth, listHeight);
    this._renderSlotDetails(ctx, detailX, detailY, detailWidth, detailHeight);
    this._renderStatus(ctx, x + padding, y + height - padding + 4, width - padding * 2);
  }

  _renderSlotList(ctx, x, y, width, height) {
    const rowHeight = this.style.list.lineHeight + 10;
    const visibleRows = Math.floor(height / rowHeight);
    const totalRows = this.slots.length;
    const startIndex = Math.max(0, Math.min(this.selectedIndex - Math.floor(visibleRows / 2), Math.max(0, totalRows - visibleRows)));

    ctx.save();
    ctx.font = this.style.list.font;
    ctx.textBaseline = 'middle';

    for (let i = 0; i < visibleRows; i += 1) {
      const slotIndex = startIndex + i;
      if (slotIndex >= totalRows) {
        break;
      }

      const entry = this.slots[slotIndex];
      const rowY = y + i * rowHeight;
      const isSelected = slotIndex === this.selectedIndex;

      if (isSelected) {
        ctx.save();
        ctx.fillStyle = this.style.list.selectionBackground;
        ctx.strokeStyle = this.style.list.selectionBorder;
        ctx.lineWidth = 1.5;
        drawRoundedRect(ctx, x - 6, rowY + 2, width + 12, rowHeight - 4, 6);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = this._getSlotColor(entry);
      ctx.fillText(entry.label, x, rowY + rowHeight / 2);

      ctx.font = this.style.list.font;
      ctx.fillStyle = this.style.list.muted;
      const subline = entry.exists
        ? `${formatTimestamp(entry.timestamp)} • ${formatPlaytime(entry.playtime)}`
        : 'Empty slot';
      ctx.fillText(subline, x, rowY + rowHeight / 2 + this.style.list.lineHeight * 0.55);
    }

    ctx.restore();
  }

  _renderSlotDetails(ctx, x, y, width, height) {
    const entry = this.slots[this.selectedIndex];
    ctx.save();
    ctx.font = this.style.detail.headingFont;
    ctx.fillStyle = this.style.detail.color;
    ctx.textBaseline = 'top';

    if (!entry) {
      ctx.fillText('Select a slot to view details.', x, y);
      ctx.restore();
      return;
    }

    ctx.fillText(entry.label, x, y);
    ctx.font = this.style.detail.font;
    ctx.fillStyle = this.style.detail.muted;

    const lines = [];
    lines.push(`Type: ${entry.slotType === 'auto' ? 'Autosave' : entry.slotType === 'manual' ? 'Manual' : 'Action'}`);
    lines.push(`Last Saved: ${entry.exists ? formatTimestamp(entry.timestamp) : '—'}`);
    lines.push(`Playtime: ${entry.exists ? formatPlaytime(entry.playtime) : '—'}`);
    if (entry.slot) {
      lines.push(`Slot ID: ${entry.slot}`);
    }
    if (entry.snapshotSource) {
      lines.push(`Snapshot Source: ${entry.snapshotSource}`);
    }

    let offsetY = y + 28;
    for (const line of lines) {
      ctx.fillText(line, x, offsetY);
      offsetY += this.style.detail.lineHeight ?? 18;
    }

    if (entry.slotType === 'action') {
      ctx.fillStyle = this.style.detail.accent;
      ctx.fillText('Press Interact to create a new manual save slot.', x, offsetY + 8);
    }

    ctx.restore();
  }

  _renderStatus(ctx, x, y, width) {
    if (!this.statusMessage) {
      return;
    }

    ctx.save();
    ctx.font = this.style.status.font;
    const color = this.style.status[this.statusLevel] ?? this.style.status.info;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(this.statusMessage, x, y);
    ctx.restore();
  }

  _buildBindingHintText() {
    const hints = [];
    const close = this._getBindingLabel('saveLoad', 'L');
    const load = this._getBindingLabel('confirm', 'Enter');
    const save = this._getBindingLabel('interact', 'E');
    hints.push(`Close: ${close}`);
    hints.push(`Load: ${load}`);
    hints.push(`Save: ${save}`);
    return hints.join('  ·  ');
  }

  _getSlotColor(entry) {
    if (!entry) {
      return this.style.list.muted;
    }
    if (entry.slotType === 'auto') {
      return this.style.list.autoColor;
    }
    if (entry.slotType === 'manual') {
      return this.style.list.manualColor;
    }
    if (entry.slotType === 'action') {
      return this.style.list.actionColor;
    }
    return this.style.list.muted;
  }

  _getBindingLabel(action, fallback) {
    const labels = getBindingLabels(action, { fallbackLabel: fallback });
    if (Array.isArray(labels) && labels.length > 0) {
      return labels.join(' / ');
    }
    return typeof fallback === 'string' && fallback.length ? fallback : '—';
  }

  _emitFxCue(effectId, payload = {}) {
    if (!this.eventBus) {
      return;
    }

    this.eventBus.emit('fx:overlay_cue', {
      effectId,
      overlay: 'saveLoad',
      timestamp: Date.now(),
      ...payload,
    });
  }
}
