import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import {
  getBindingsSnapshot,
  getKeyToActionsSnapshot,
  setActionBindings,
  subscribe as subscribeControlBindings,
} from '../state/controlBindingsStore.js';
import { formatKeyLabel, formatKeyLabels } from '../utils/controlLabels.js';

const DEFAULT_LAYOUT = {
  width: 640,
  height: 420,
};

const ACTION_SECTIONS = [
  {
    id: 'movement',
    title: 'Movement',
    actions: ['moveUp', 'moveLeft', 'moveDown', 'moveRight'],
  },
  {
    id: 'interaction',
    title: 'Investigation & Abilities',
    actions: ['interact', 'detectiveVision', 'forensicAnalysis', 'attack', 'dodge'],
  },
  {
    id: 'ui',
    title: 'Casework & HUD',
    actions: [
      'caseFile',
      'deductionBoard',
      'inventory',
      'quest',
      'faction',
      'disguise',
      'saveInspector',
      'controlsMenu',
    ],
  },
  {
    id: 'system',
    title: 'System & Meta',
    actions: ['pause', 'confirm', 'cancel', 'debugToggle'],
  },
];

const ACTION_METADATA = {
  moveUp: { label: 'Move Up', description: 'Traverse north / forward.' },
  moveDown: { label: 'Move Down', description: 'Traverse south / back.' },
  moveLeft: { label: 'Move Left', description: 'Strafe west.' },
  moveRight: { label: 'Move Right', description: 'Strafe east.' },
  interact: { label: 'Interact / Collect', description: 'Engage prompts, gather evidence, speak to NPCs.' },
  detectiveVision: { label: 'Detective Vision', description: 'Reveal hidden evidence and tutorial clues.' },
  forensicAnalysis: { label: 'Forensic Analysis', description: 'Run on-site forensic scans on collected evidence.' },
  attack: { label: 'Primary Attack', description: 'Placeholder combat input for future encounters.' },
  dodge: { label: 'Dodge / Evade', description: 'Placeholder defensive action for future encounters.' },
  caseFile: { label: 'Case File', description: 'Open the Hollow Case dossier and objective log.' },
  deductionBoard: { label: 'Deduction Board', description: 'Enter the deduction workspace to connect evidence.' },
  inventory: { label: 'Inventory', description: 'Review collected gear and tutorial evidence.' },
  quest: { label: 'Quest Log', description: 'Check current objectives and branching quest state.' },
  faction: { label: 'Reputation', description: 'Inspect faction standing shifts and cascade pressure.' },
  disguise: { label: 'Disguise Interface', description: 'Swap disguises for infiltration beats.' },
  saveInspector: { label: 'Save Inspector', description: 'Debug overlay for snapshot auditing.' },
  controlsMenu: { label: 'Controls Menu', description: 'Remap action bindings during runtime.' },
  pause: { label: 'Pause', description: 'Toggle the pause state (also halts time-sensitive tutorials).' },
  confirm: { label: 'Confirm / Advance', description: 'Accept prompts and advance dialogues.' },
  cancel: { label: 'Cancel / Back', description: 'Cancel selections or close overlays.' },
  debugToggle: { label: 'Debug Overlay', description: 'Toggle developer HUD visibility for QA.' },
};

function defaultLabelFromAction(action) {
  if (typeof action !== 'string' || action.length === 0) {
    return 'Action';
  }
  const spaced = action
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function cloneBindings(bindings = {}) {
  const clone = {};
  for (const [action, codes] of Object.entries(bindings)) {
    clone[action] = Array.isArray(codes) ? [...codes] : [];
  }
  return clone;
}

function cloneKeyMap(keyMap = new Map()) {
  const clone = new Map();
  if (!(keyMap instanceof Map)) {
    return clone;
  }
  for (const [key, actions] of keyMap.entries()) {
    const actionSet = new Set();
    if (actions instanceof Set) {
      for (const action of actions) {
        actionSet.add(action);
      }
    } else if (Array.isArray(actions)) {
      for (const action of actions) {
        actionSet.add(action);
      }
    }
    clone.set(key, actionSet);
  }
  return clone;
}

export class ControlBindingsOverlay {
  constructor(canvas, eventBus, options = {}) {
    if (!canvas) {
      throw new Error('ControlBindingsOverlay requires a canvas reference');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.events = eventBus;

    this.layout = {
      width: options.width ?? DEFAULT_LAYOUT.width,
      height: options.height ?? DEFAULT_LAYOUT.height,
    };

    this.visible = false;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = options.fadeSpeed ?? 6;

    this.bindings = cloneBindings(getBindingsSnapshot());
    this.keyToActions = cloneKeyMap(getKeyToActionsSnapshot());

    this.sections = [];
    this.actionEntries = [];
    this.selectedIndex = 0;

    this.capturing = false;
    this.captureAction = null;
    this.captureMessage = null;
    this.captureStatus = null;

    const styleOverrides = options.styleOverrides ?? {};
    const { palette, typography, metrics } = overlayTheme;

    this.style = {
      panel: withOverlayTheme({
        background: palette.backgroundSurface,
        borderColor: palette.outlineStrong,
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
        accent: palette.outlineSoft,
      }, styleOverrides.header),
      list: withOverlayTheme({
        sectionFont: typography.smallCaps ?? typography.small,
        sectionColor: palette.textSecondary,
        itemFont: typography.body,
        itemColor: palette.textPrimary,
        itemMuted: palette.textMuted,
        selectionColor: palette.accent,
        selectionBackground: 'rgba(73, 217, 255, 0.18)',
        captureBackground: 'rgba(255, 201, 71, 0.24)',
        lineHeight: 22,
      }, styleOverrides.list),
      detail: withOverlayTheme({
        titleFont: typography.hud,
        descriptionFont: typography.small,
        infoFont: typography.small,
        infoColor: palette.textMuted,
        conflictFont: typography.small,
        conflictColor: palette.warning,
        successColor: palette.success ?? '#37ff90',
        warningColor: palette.warning,
        dividerColor: palette.outlineSoft,
      }, styleOverrides.detail),
      footer: withOverlayTheme({
        font: typography.small,
        color: palette.textMuted,
        accent: palette.textSecondary,
      }, styleOverrides.footer),
    };

    this._unsubscribeBindings = null;
    this._offMoveUp = null;
    this._offMoveDown = null;
    this._offConfirm = null;
    this._offCancel = null;
    this._handleGlobalKeyDown = (event) => this.handleGlobalKeyDown(event);

    this.rebuildSections();
  }

  init() {
    this._unsubscribeBindings = subscribeControlBindings(({ bindings, keyToActions }) => {
      this.updateBindingSnapshots(bindings, keyToActions);
    });

    if (this.eventBus) {
      this._offMoveUp = this.eventBus.on('input:moveUp:pressed', () => {
        if (this.visible && !this.capturing) {
          this.moveSelection(-1);
        }
      });
      this._offMoveDown = this.eventBus.on('input:moveDown:pressed', () => {
        if (this.visible && !this.capturing) {
          this.moveSelection(1);
        }
      });
      this._offConfirm = this.eventBus.on('input:confirm:pressed', () => {
        if (this.visible) {
          this.beginCapture();
        }
      });
      this._offCancel = this.eventBus.on('input:cancel:pressed', () => {
        if (!this.visible) {
          return;
        }
        if (this.capturing) {
          this.cancelCapture('input:cancel');
        } else {
          this.hide('input:cancel');
        }
      });
    }

    window.addEventListener('keydown', this._handleGlobalKeyDown, true);
  }

  cleanup() {
    if (this._unsubscribeBindings) {
      this._unsubscribeBindings();
      this._unsubscribeBindings = null;
    }

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
    if (this._offCancel) {
      this._offCancel();
      this._offCancel = null;
    }

    window.removeEventListener('keydown', this._handleGlobalKeyDown, true);
  }

  updateBindingSnapshots(bindings, keyToActions) {
    if (bindings && typeof bindings === 'object') {
      this.bindings = cloneBindings(bindings);
    }
    if (keyToActions instanceof Map) {
      this.keyToActions = cloneKeyMap(keyToActions);
    }
    this.rebuildSections();
  }

  rebuildSections() {
    const sectionList = [];
    const actionEntries = [];
    const knownActions = new Set();

    for (const section of ACTION_SECTIONS) {
      const rows = [];
      for (const action of section.actions) {
        if (!this.bindings[action]) {
          continue;
        }
        rows.push(this.buildActionEntry(action, section.id));
        knownActions.add(action);
      }
      if (rows.length) {
        sectionList.push({
          id: section.id,
          title: section.title,
          actions: rows,
        });
        actionEntries.push(...rows);
      }
    }

    const extraActions = Object.keys(this.bindings)
      .filter((action) => !knownActions.has(action))
      .sort();

    if (extraActions.length) {
      const rows = extraActions.map((action) => this.buildActionEntry(action, 'other'));
      sectionList.push({
        id: 'other',
        title: 'Additional Actions',
        actions: rows,
      });
      actionEntries.push(...rows);
    }

    this.sections = sectionList;
    this.actionEntries = actionEntries;

    if (!this.actionEntries.length) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex >= this.actionEntries.length) {
      this.selectedIndex = this.actionEntries.length - 1;
    }
  }

  buildActionEntry(action, sectionId) {
    const codes = Array.isArray(this.bindings[action]) ? [...this.bindings[action]] : [];
    const labels = formatKeyLabels(codes);
    const metadata = ACTION_METADATA[action] || {};
    return {
      action,
      sectionId,
      label: metadata.label || defaultLabelFromAction(action),
      description: metadata.description || null,
      codes,
      labels,
    };
  }

  isVisible() {
    return this.visible;
  }

  toggle(source = 'toggle') {
    if (this.visible) {
      this.hide(source);
    } else {
      this.show(source);
    }
  }

  show(source = 'show') {
    if (this.visible) {
      this.targetAlpha = 1;
      return;
    }
    this.visible = true;
    this.targetAlpha = 1;
    this.captureMessage = null;
    this.captureStatus = null;
    emitOverlayVisibility(this.eventBus, 'controlBindings', true, { source });
  }

  hide(source = 'hide') {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }
    this.visible = false;
    this.targetAlpha = 0;
    this.cancelCapture(source);
    emitOverlayVisibility(this.eventBus, 'controlBindings', false, { source });
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
  }

  render(ctx) {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    const { width, height } = this.layout;
    const x = (this.canvas.width - width) / 2;
    const y = (this.canvas.height - height) / 2;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.shadowColor = this.style.panel.shadowColor;
    ctx.shadowBlur = this.style.panel.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    this.roundRect(ctx, x, y, width, height, this.style.panel.cornerRadius);
    ctx.fillStyle = this.style.panel.background;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.lineWidth = this.style.panel.borderWidth;
    ctx.strokeStyle = this.style.panel.borderColor;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = this.style.header.titleFont;
    ctx.fillStyle = this.style.header.titleColor;
    ctx.fillText('Control Bindings', x + 28, y + 20);

    ctx.font = this.style.header.subtitleFont;
    ctx.fillStyle = this.style.header.subtitleColor;
    ctx.fillText('Select an action and press Enter to remap. Backspace resets to defaults.', x + 28, y + 54);

    ctx.fillStyle = this.style.header.accent;
    ctx.fillRect(x + 28, y + 78, width - 56, 2);

    const listX = x + 28;
    const listY = y + 98;
    const listWidth = Math.floor(width * 0.56);
    const listHeight = height - (listY - y) - 72;
    this.renderActionList(ctx, listX, listY, listWidth, listHeight);

    const detailX = x + listWidth + 48;
    const detailY = listY;
    const detailWidth = width - (detailX - x) - 28;
    const detailHeight = listHeight;
    this.renderDetailPanel(ctx, detailX, detailY, detailWidth, detailHeight);

    ctx.font = this.style.footer.font;
    ctx.fillStyle = this.style.footer.color;
    const footerText = this.capturing
      ? 'Press a new key to bind. Backspace resets to defaults. Esc cancels.'
      : 'Enter: Remap · Backspace: Reset action · Esc: Close menu';
    ctx.fillText(footerText, x + 28, y + height - 32);

    ctx.restore();
  }

  renderActionList(ctx, x, y, width, height) {
    const lineHeight = this.style.list.lineHeight;
    let cursorY = y;
    const selected = this.actionEntries[this.selectedIndex] ?? null;

    ctx.font = this.style.list.sectionFont;
    ctx.fillStyle = this.style.list.sectionColor;

    for (const section of this.sections) {
      const neededHeight = lineHeight * (section.actions.length + 1) + 12;
      if (cursorY + neededHeight > y + height) {
        break;
      }

      ctx.fillText(section.title, x, cursorY);
      cursorY += lineHeight;

      ctx.font = this.style.list.itemFont;
      for (const entry of section.actions) {
        const isSelected = selected && selected.action === entry.action;
        const isCapturing = this.capturing && this.captureAction === entry.action;
        if (isSelected) {
          ctx.fillStyle = isCapturing
            ? this.style.list.captureBackground
            : this.style.list.selectionBackground;
          ctx.globalAlpha = this.fadeAlpha;
          this.roundRect(ctx, x - 10, cursorY - 4, width + 14, lineHeight + 6, 6);
          ctx.fill();
        }

        ctx.globalAlpha = this.fadeAlpha;
        ctx.fillStyle = isSelected ? this.style.list.selectionColor : this.style.list.itemColor;
        ctx.fillText(entry.label, x, cursorY);

        const keys = entry.labels.length ? entry.labels.join(' / ') : 'Unassigned';
        ctx.fillStyle = entry.labels.length ? this.style.list.itemMuted : this.style.detail.warningColor;
        ctx.textAlign = 'right';
        ctx.fillText(keys, x + width - 8, cursorY);

        ctx.textAlign = 'left';
        cursorY += lineHeight;
      }

      ctx.font = this.style.list.sectionFont;
      ctx.fillStyle = this.style.list.sectionColor;
      cursorY += 12;
    }
  }

  renderDetailPanel(ctx, x, y, width, height) {
    const entry = this.actionEntries[this.selectedIndex] ?? null;
    ctx.save();
    ctx.font = this.style.detail.titleFont;
    ctx.fillStyle = this.style.detail.titleFont ? ctx.fillStyle : overlayTheme.palette.textPrimary;

    if (!entry) {
      ctx.fillText('No actions available', x, y);
      ctx.restore();
      return;
    }

    ctx.fillStyle = overlayTheme.palette.textPrimary;
    ctx.fillText(entry.label, x, y);

    ctx.font = this.style.detail.descriptionFont;
    ctx.fillStyle = overlayTheme.palette.textSecondary;
    const desc = entry.description || 'No additional description yet.';
    this.wrapText(ctx, desc, x, y + 26, width, 18);

    const currentKeys = entry.labels.length ? entry.labels.join(' / ') : 'Unassigned';
    ctx.font = this.style.detail.infoFont;
    ctx.fillStyle = overlayTheme.palette.textPrimary;
    ctx.fillText(`Current binding: ${currentKeys}`, x, y + 90);

    const conflictMessages = this.getConflicts(entry);
    let detailY = y + 118;
    if (conflictMessages.length) {
      ctx.fillStyle = this.style.detail.conflictColor;
      for (const message of conflictMessages) {
        this.wrapText(ctx, `Conflict: ${message}`, x, detailY, width, 18);
        detailY += 24;
      }
    }

    if (this.captureStatus) {
      ctx.fillStyle = this.captureStatus === 'success'
        ? this.style.detail.successColor
        : this.style.detail.warningColor;
      this.wrapText(ctx, this.captureMessage ?? '', x, detailY, width, 18);
      detailY += 24;
    } else if (this.captureMessage) {
      ctx.fillStyle = this.style.detail.infoColor;
      this.wrapText(ctx, this.captureMessage, x, detailY, width, 18);
      detailY += 24;
    }

    ctx.strokeStyle = this.style.detail.dividerColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + height - 60);
    ctx.lineTo(x + width, y + height - 60);
    ctx.stroke();

    ctx.font = this.style.detail.infoFont;
    ctx.fillStyle = this.style.detail.infoColor;
    this.wrapText(
      ctx,
      'Tips: Use Enter to begin remapping. Backspace resets this action to its defaults. Duplicate bindings are allowed but highlighted above.',
      x,
      y + height - 52,
      width,
      18,
    );

    ctx.restore();
  }

  getConflicts(entry) {
    if (!entry || !entry.codes.length) {
      return [];
    }
    const messages = [];
    for (const code of entry.codes) {
      const actions = this.keyToActions.get(code);
      if (!actions || actions.size <= 1) {
        continue;
      }
      const conflictTargets = Array.from(actions).filter((action) => action !== entry.action);
      if (!conflictTargets.length) {
        continue;
      }
      const label = formatKeyLabel(code) || code;
      const names = conflictTargets.map((action) => {
        const metadata = ACTION_METADATA[action];
        return metadata?.label || defaultLabelFromAction(action);
      });
      messages.push(`${label} also bound to ${names.join(', ')}`);
    }
    return messages;
  }

  moveSelection(direction) {
    const count = this.actionEntries.length;
    if (!count) {
      return;
    }
    const nextIndex = (this.selectedIndex + direction + count) % count;
    if (nextIndex === this.selectedIndex) {
      return;
    }
    this.selectedIndex = nextIndex;
    this.captureMessage = null;
    this.captureStatus = null;
  }

  beginCapture() {
    const entry = this.actionEntries[this.selectedIndex] ?? null;
    if (!entry) {
      return;
    }
    this.capturing = true;
    this.captureAction = entry.action;
    this.captureMessage = `Press a new key for ${entry.label}. Backspace resets defaults.`;
    this.captureStatus = null;
  }

  cancelCapture(source = 'cancel') {
    if (!this.capturing) {
      return;
    }
    this.capturing = false;
    this.captureAction = null;
    if (source === 'input:cancel' || source === 'escape') {
      this.captureMessage = 'Remap cancelled.';
      this.captureStatus = 'warning';
    } else {
      this.captureMessage = null;
      this.captureStatus = null;
    }
  }

  applyBinding(action, codes, metadata = {}) {
    const normalizedCodes = Array.isArray(codes) ? codes : [];
    setActionBindings(action, normalizedCodes, {
      metadata: { ...metadata, source: 'control-bindings-overlay' },
    });
  }

  resetBinding(action) {
    setActionBindings(action, [], {
      metadata: { source: 'control-bindings-overlay', command: 'reset-action' },
    });
  }

  handleGlobalKeyDown(event) {
    if (!this.visible) {
      return;
    }

    if (this.capturing) {
      event.preventDefault();
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      if (!this.captureAction) {
        this.cancelCapture();
        return;
      }

      const code = event.code;
      if (!code) {
        return;
      }

      if (code === 'Escape') {
        this.cancelCapture('escape');
        return;
      }

      if (code === 'Backspace' || code === 'Delete') {
        this.resetBinding(this.captureAction);
        const label = ACTION_METADATA[this.captureAction]?.label || defaultLabelFromAction(this.captureAction);
        this.captureMessage = `${label} reset to defaults.`;
        this.captureStatus = 'success';
        this.capturing = false;
        this.captureAction = null;
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) {
        this.captureMessage = 'Modifier combos are not supported yet. Press a single key or Backspace for defaults.';
        this.captureStatus = 'warning';
        return;
      }

      this.applyBinding(this.captureAction, [code], { code });
      const label = formatKeyLabel(code) || code;
      const actionLabel =
        ACTION_METADATA[this.captureAction]?.label || defaultLabelFromAction(this.captureAction);

      this.captureMessage = `${actionLabel} bound to ${label}.`;
      this.captureStatus = 'success';
      this.capturing = false;
      this.captureAction = null;
      return;
    }

    if (event.code === 'Backspace' && this.actionEntries.length) {
      event.preventDefault();
      const entry = this.actionEntries[this.selectedIndex];
      if (entry) {
        this.resetBinding(entry.action);
        this.captureMessage = `${entry.label} reset to defaults.`;
        this.captureStatus = 'success';
      }
    }
  }

  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    if (typeof text !== 'string' || text.length === 0) {
      return;
    }
    const words = text.split(/\s+/);
    let line = '';
    let cursorY = y;
    for (const word of words) {
      const testLine = line.length ? `${line} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line.length) {
        ctx.fillText(line, x, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (line.length) {
      ctx.fillText(line, x, cursorY);
    }
  }
}
