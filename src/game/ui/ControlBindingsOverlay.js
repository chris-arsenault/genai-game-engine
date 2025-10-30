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

const LIST_MODES = [
  {
    id: 'sections',
    label: 'By Category',
    description: 'Group actions into movement, interaction, UI, and system sections.',
  },
  {
    id: 'alphabetical',
    label: 'Alphabetical',
    description: 'List every action A→Z to help locate specific bindings quickly.',
  },
  {
    id: 'conflicts',
    label: 'Conflicts First',
    description: 'Surface bindings that currently share keys with other actions.',
  },
];

export const CONTROL_BINDINGS_NAV_EVENT = 'ux:control_bindings:navigation';

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
    this.listModeIndex = 0;
    this.listRowsCache = null;
    this.pageIndex = 0;
    this.pageCount = 1;
    this.manualPageOverride = false;
    this._pendingEnsureSelectionVisible = false;

    this.capturing = false;
    this.captureAction = null;
    this.captureMessage = null;
    this.captureStatus = null;
    this._lastFxSelectionIndex = -1;

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

  emitNavigationTelemetry(event, detail = {}) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }

    const mode = this.getListMode();
    const selected = this.actionEntries[this.selectedIndex] ?? null;

    this.eventBus.emit(CONTROL_BINDINGS_NAV_EVENT, {
      overlayId: 'controlBindings',
      event,
      timestamp: Date.now(),
      visible: Boolean(this.visible),
      capturing: Boolean(this.capturing),
      manualOverride: Boolean(this.manualPageOverride),
      listMode: mode?.id ?? null,
      listModeLabel: mode?.label ?? null,
      pageIndex: this.pageIndex,
      pageCount: this.pageCount,
      selectedIndex: this.selectedIndex,
      selectedAction: selected?.action ?? null,
      selectedActionLabel: selected?.label ?? null,
      ...detail,
    });
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
    this.invalidateListLayout();
    this.ensureSelectionValid();

    if (!this.actionEntries.length) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex >= this.actionEntries.length) {
      this.selectedIndex = this.actionEntries.length - 1;
    }
  }

  invalidateListLayout() {
    this.listRowsCache = null;
    this._pendingEnsureSelectionVisible = true;
    if (!this.manualPageOverride) {
      this.pageIndex = 0;
    }
  }

  ensureSelectionValid() {
    if (!this.actionEntries.length) {
      this.selectedIndex = 0;
      return;
    }
    if (this.selectedIndex < 0) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex >= this.actionEntries.length) {
      this.selectedIndex = this.actionEntries.length - 1;
    }
  }

  getListMode() {
    return LIST_MODES[this.listModeIndex] ?? LIST_MODES[0];
  }

  setListModeByIndex(index) {
    const clamped = ((index % LIST_MODES.length) + LIST_MODES.length) % LIST_MODES.length;
    const previousMode = this.getListMode();
    if (clamped === this.listModeIndex) {
      this.emitNavigationTelemetry('list_mode_change', {
        requestedIndex: index,
        changed: false,
        previousModeId: previousMode?.id ?? null,
        previousModeLabel: previousMode?.label ?? null,
      });
      return;
    }

    this.listModeIndex = clamped;
    this.manualPageOverride = false;
    this.captureStatus = null;
    const nextMode = this.getListMode();
    this.captureMessage = `${nextMode?.label ?? 'List'} view enabled.`;
    this.invalidateListLayout();
    this._emitFxCue('controlBindingsListModeChange', {
      requestedIndex: index,
      modeId: nextMode?.id ?? null,
      modeLabel: nextMode?.label ?? null,
      previousModeId: previousMode?.id ?? null,
      previousModeLabel: previousMode?.label ?? null,
    });
    this._lastFxSelectionIndex = -1;
    this._emitSelectionCue('list-mode');
    this.emitNavigationTelemetry('list_mode_change', {
      requestedIndex: index,
      changed: true,
      previousModeId: previousMode?.id ?? null,
      previousModeLabel: previousMode?.label ?? null,
      modeId: nextMode?.id ?? null,
      modeLabel: nextMode?.label ?? null,
    });
  }

  cycleListMode(direction = 1) {
    this.setListModeByIndex(this.listModeIndex + (direction >= 0 ? 1 : -1));
  }

  changePage(delta = 1) {
    const previousIndex = this.pageIndex;
    if (this.pageCount <= 1) {
      this.emitNavigationTelemetry('page_navigate', {
        direction: delta,
        previousIndex,
        nextIndex: previousIndex,
        pageLimit: this.pageCount,
        changed: false,
        reason: 'single_page',
      });
      return;
    }

    this.manualPageOverride = true;
    this._pendingEnsureSelectionVisible = false;
    const next = this.pageIndex + delta;
    if (next < 0) {
      this.pageIndex = 0;
    } else if (next >= this.pageCount) {
      this.pageIndex = this.pageCount - 1;
    } else {
      this.pageIndex = next;
    }

    const changed = this.pageIndex !== previousIndex;
    if (changed) {
      this._emitFxCue('controlBindingsPageChange', {
        direction: delta,
        pageIndex: this.pageIndex,
        pageCount: this.pageCount,
      });
      this._lastFxSelectionIndex = -1;
      this._emitSelectionCue('page-change');
    }

    this.emitNavigationTelemetry('page_navigate', {
      direction: delta,
      previousIndex,
      nextIndex: this.pageIndex,
      pageLimit: this.pageCount,
      changed,
    });
  }

  setPage(index) {
    const previousIndex = this.pageIndex;
    if (this.pageCount <= 1) {
      this.pageIndex = 0;
      this.emitNavigationTelemetry('page_set', {
        requestedIndex: index,
        previousIndex,
        nextIndex: this.pageIndex,
        pageLimit: this.pageCount,
        changed: this.pageIndex !== previousIndex,
        reason: 'single_page',
      });
      return;
    }
    const clamped = Math.max(0, Math.min(this.pageCount - 1, index));
    if (clamped === this.pageIndex) {
      this.emitNavigationTelemetry('page_set', {
        requestedIndex: index,
        previousIndex,
        nextIndex: this.pageIndex,
        pageLimit: this.pageCount,
        changed: false,
      });
      return;
    }
    this.pageIndex = clamped;
    this._pendingEnsureSelectionVisible = false;
    this._emitFxCue('controlBindingsPageChange', {
      direction: clamped > previousIndex ? 1 : -1,
      pageIndex: this.pageIndex,
      pageCount: this.pageCount,
      reason: 'direct-set',
    });
    this._lastFxSelectionIndex = -1;
    this._emitSelectionCue('page-set');
    this.emitNavigationTelemetry('page_set', {
      requestedIndex: index,
      previousIndex,
      nextIndex: this.pageIndex,
      pageLimit: this.pageCount,
      changed: true,
    });
  }

  getListModeLabel() {
    return this.getListMode().label;
  }

  getListModeDescription() {
    return this.getListMode().description;
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

  getListRows() {
    const mode = this.getListMode();
    const cacheId = mode.id;
    if (this.listRowsCache && this.listRowsCache.modeId === cacheId) {
      return this.listRowsCache.rows;
    }

    let rows;
    switch (cacheId) {
      case 'alphabetical':
        rows = this.buildAlphabeticalRows();
        break;
      case 'conflicts':
        rows = this.buildConflictRows();
        break;
      case 'sections':
      default:
        rows = this.buildSectionRows();
    }

    if (!rows.length) {
      rows = [
        {
          type: 'message',
          text: 'No actions available.',
        },
      ];
    }

    this.listRowsCache = {
      modeId: cacheId,
      rows,
    };
    return rows;
  }

  buildSectionRows() {
    const rows = [];
    for (const section of this.sections) {
      rows.push({
        type: 'section',
        title: section.title,
      });
      for (const entry of section.actions) {
        const actionIndex = this.actionEntries.findIndex((item) => item.action === entry.action);
        rows.push({
          type: 'action',
          entry,
          actionIndex,
        });
      }
      rows.push({ type: 'spacer' });
    }
    return rows;
  }

  buildAlphabeticalRows() {
    const rows = [];
    const sorted = [...this.actionEntries].sort((a, b) => a.label.localeCompare(b.label));
    let currentGroup = null;
    for (const entry of sorted) {
      const initial = entry.label?.charAt(0)?.toUpperCase() || '#';
      if (initial !== currentGroup) {
        currentGroup = initial;
        rows.push({
          type: 'group',
          title: `${initial} actions`,
        });
      }
      const actionIndex = this.actionEntries.findIndex((item) => item.action === entry.action);
      rows.push({
        type: 'action',
        entry,
        actionIndex,
      });
    }
    rows.push({ type: 'spacer' });
    return rows;
  }

  buildConflictRows() {
    const rows = [];
    const entriesWithConflicts = this.actionEntries
      .map((entry) => ({
        entry,
        conflicts: this.getConflicts(entry),
      }))
      .filter((item) => item.conflicts.length > 0)
      .sort((a, b) => {
        if (b.conflicts.length !== a.conflicts.length) {
          return b.conflicts.length - a.conflicts.length;
        }
        return a.entry.label.localeCompare(b.entry.label);
      });

    if (!entriesWithConflicts.length) {
      return [
        {
          type: 'message',
          text: 'No conflicting bindings detected. Switch views with [ and ] keys.',
        },
      ];
    }

    rows.push({
      type: 'group',
      title: 'Conflicting bindings',
    });

    for (const { entry } of entriesWithConflicts) {
      const actionIndex = this.actionEntries.findIndex((item) => item.action === entry.action);
      rows.push({
        type: 'action',
        entry,
        actionIndex,
      });
    }
    rows.push({ type: 'spacer' });
    return rows;
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
    this.manualPageOverride = false;
    this._pendingEnsureSelectionVisible = true;
    emitOverlayVisibility(this.eventBus, 'controlBindings', true, { source });
    this._lastFxSelectionIndex = -1;
    this._emitFxCue('controlBindingsOverlayReveal', {
      source,
      listMode: this.getListMode()?.id ?? 'sections',
      totalActions: this.actionEntries.length,
    });
    this._emitSelectionCue('show');
  }

  hide(source = 'hide') {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }
    this.visible = false;
    this.targetAlpha = 0;
    this.cancelCapture(source);
    emitOverlayVisibility(this.eventBus, 'controlBindings', false, { source });
    this._emitFxCue('controlBindingsOverlayDismiss', { source });
    this._lastFxSelectionIndex = -1;
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
    const viewLabelY = y + 92;
    const listY = viewLabelY + 18;
    const listWidth = Math.floor(width * 0.56);
    const listHeight = height - (listY - y) - 72;
    this.renderActionList(ctx, listX, listY, listWidth, listHeight);
    const safePageCount = Math.max(1, this.pageCount);
    const safePageIndex = Math.min(this.pageIndex + 1, safePageCount);
    ctx.font = this.style.header.subtitleFont;
    ctx.fillStyle = this.style.header.subtitleColor;
    ctx.fillText(
      `View: ${this.getListModeLabel()} · Page ${safePageIndex}/${safePageCount}`,
      listX,
      viewLabelY,
    );

    const detailX = x + listWidth + 48;
    const detailY = listY;
    const detailWidth = width - (detailX - x) - 28;
    const detailHeight = listHeight;
    this.renderDetailPanel(ctx, detailX, detailY, detailWidth, detailHeight);

    ctx.font = this.style.footer.font;
    ctx.fillStyle = this.style.footer.color;
    const footerText = this.capturing
      ? 'Press a new key to bind. Backspace resets to defaults. Esc cancels.'
      : 'Enter: Remap · Backspace: Reset · [: Prev view · ]: Next view · PgUp/PgDn: Page · Esc: Close menu';
    ctx.fillText(footerText, x + 28, y + height - 32);

    ctx.restore();
  }

  renderActionList(ctx, x, y, width, height) {
    const lineHeight = this.style.list.lineHeight;
    const rows = this.getListRows();
    const maxHeight = Math.max(height, lineHeight);
    const pages = [];
    const actionIndexToPage = new Map();

    let currentPage = [];
    let currentHeight = 0;
    for (const row of rows) {
      const rowHeight = row.type === 'spacer' ? 12 : lineHeight;
      if (currentPage.length > 0 && currentHeight + rowHeight > maxHeight) {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
      }
      if (row.type === 'action') {
        actionIndexToPage.set(
          row.actionIndex,
          pages.length,
        );
      }
      currentPage.push({ ...row, height: rowHeight });
      currentHeight += rowHeight;
    }

    if (!currentPage.length) {
      currentPage.push({
        type: 'message',
        text: 'No actions available.',
        height: lineHeight,
      });
    }
    pages.push(currentPage);

    this.pageCount = pages.length || 1;
    if (this.pageCount < 1) {
      this.pageCount = 1;
    }

    const targetPage = actionIndexToPage.get(this.selectedIndex);
    if (this._pendingEnsureSelectionVisible && typeof targetPage === 'number') {
      this.pageIndex = targetPage;
      this.manualPageOverride = false;
      this._pendingEnsureSelectionVisible = false;
    } else if (!this.manualPageOverride && typeof targetPage === 'number') {
      this.pageIndex = targetPage;
    }

    this.pageIndex = Math.max(0, Math.min(this.pageCount - 1, this.pageIndex));

    const pageRows = pages[this.pageIndex] ?? [];
    let cursorY = y;
    const selected = this.actionEntries[this.selectedIndex] ?? null;

    for (const row of pageRows) {
      if (row.type === 'spacer') {
        cursorY += row.height;
        continue;
      }

      if (row.type === 'section' || row.type === 'group') {
        ctx.font = this.style.list.sectionFont;
        ctx.fillStyle = this.style.list.sectionColor;
        ctx.globalAlpha = this.fadeAlpha;
        ctx.fillText(row.title, x, cursorY);
        cursorY += lineHeight;
        continue;
      }

      if (row.type === 'message') {
        ctx.font = this.style.list.itemFont;
        ctx.fillStyle = this.style.detail.infoColor;
        ctx.globalAlpha = this.fadeAlpha;
        ctx.fillText(row.text, x, cursorY);
        cursorY += lineHeight;
        continue;
      }

      if (row.type !== 'action') {
        continue;
      }

      const entry = row.entry;
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
      ctx.font = this.style.list.itemFont;
      ctx.fillStyle = isSelected ? this.style.list.selectionColor : this.style.list.itemColor;
      ctx.textAlign = 'left';
      ctx.fillText(entry.label, x, cursorY);

      const keys = entry.labels.length ? entry.labels.join(' / ') : 'Unassigned';
      ctx.fillStyle = entry.labels.length ? this.style.list.itemMuted : this.style.detail.warningColor;
      ctx.textAlign = 'right';
      ctx.fillText(keys, x + width - 8, cursorY);

      ctx.textAlign = 'left';
      cursorY += lineHeight;
    }

    this._pendingEnsureSelectionVisible = false;
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

    const safePageCount = Math.max(1, this.pageCount);
    const safePageIndex = Math.min(this.pageIndex + 1, safePageCount);
    const viewInfoBaseY = y + height - 122;
    ctx.font = this.style.detail.infoFont;
    ctx.fillStyle = this.style.detail.infoColor;
    ctx.fillText(`List view: ${this.getListModeLabel()}`, x, viewInfoBaseY);
    this.wrapText(ctx, this.getListModeDescription(), x, viewInfoBaseY + 18, width, 18);
    ctx.fillText(`Page ${safePageIndex} of ${safePageCount}`, x, viewInfoBaseY + 54);

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
    const currentIndex = this.selectedIndex;
    const nextIndex = (currentIndex + direction + count) % count;
    const changed = nextIndex !== currentIndex;
    if (!changed) {
      this.emitNavigationTelemetry('selection_move', {
        direction,
        previousIndex: currentIndex,
        nextIndex,
        changed: false,
        previousAction: this.actionEntries[currentIndex]?.action ?? null,
        nextAction: this.actionEntries[nextIndex]?.action ?? null,
      });
      return;
    }
    const previousEntry = this.actionEntries[currentIndex] ?? null;
    this.selectedIndex = nextIndex;
    this.captureMessage = null;
    this.captureStatus = null;
    this.manualPageOverride = false;
    this._pendingEnsureSelectionVisible = true;
    const nextEntry = this.actionEntries[nextIndex] ?? null;
    this.emitNavigationTelemetry('selection_move', {
      direction,
      previousIndex: currentIndex,
      nextIndex,
      changed: true,
      previousAction: previousEntry?.action ?? null,
      previousActionLabel: previousEntry?.label ?? null,
      nextAction: nextEntry?.action ?? null,
      nextActionLabel: nextEntry?.label ?? null,
    });
    this._emitSelectionCue('move');
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
    this.emitNavigationTelemetry('capture_started', {
      action: entry.action,
      actionLabel: entry.label,
    });
    this._emitFxCue('controlBindingsCaptureStart', {
      action: entry.action,
      label: entry.label,
      sectionId: entry.sectionId ?? null,
    });
  }

  cancelCapture(source = 'cancel') {
    if (!this.capturing) {
      return;
    }
    const action = this.captureAction;
    this.capturing = false;
    this.captureAction = null;
    if (source === 'input:cancel' || source === 'escape') {
      this.captureMessage = 'Remap cancelled.';
      this.captureStatus = 'warning';
    } else {
      this.captureMessage = null;
      this.captureStatus = null;
    }
    this.emitNavigationTelemetry('capture_cancelled', {
      action,
      source,
    });
    this._emitFxCue('controlBindingsCaptureCancel', {
      action,
      source,
      status: this.captureStatus ?? null,
    });
  }

  applyBinding(action, codes, metadata = {}) {
    const normalizedCodes = Array.isArray(codes) ? codes : [];
    const nextCodes = setActionBindings(action, normalizedCodes, {
      metadata: { ...metadata, source: 'control-bindings-overlay' },
    });
    this.emitNavigationTelemetry('binding_applied', {
      action,
      codes: Array.isArray(nextCodes) ? [...nextCodes] : [],
      metadata: metadata ?? null,
    });
    this._emitFxCue('controlBindingsCaptureApplied', {
      action,
      codes: Array.isArray(nextCodes) ? [...nextCodes] : [],
    });
    this._emitSelectionCue('capture-success');
  }

  resetBinding(action) {
    const nextCodes = setActionBindings(action, [], {
      metadata: { source: 'control-bindings-overlay', command: 'reset-action' },
    });
    this.emitNavigationTelemetry('binding_reset', {
      action,
      codes: Array.isArray(nextCodes) ? [...nextCodes] : [],
    });
    this._emitFxCue('controlBindingsBindingReset', {
      action,
      codes: Array.isArray(nextCodes) ? [...nextCodes] : [],
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

    if (event.code === 'BracketRight') {
      event.preventDefault();
      this.cycleListMode(1);
      return;
    }

    if (event.code === 'BracketLeft') {
      event.preventDefault();
      this.cycleListMode(-1);
      return;
    }

    if (event.code === 'PageDown') {
      event.preventDefault();
      this.changePage(1);
      this.captureMessage = `Viewing page ${Math.min(this.pageIndex + 1, Math.max(1, this.pageCount))}/${Math.max(1, this.pageCount)}.`;
      this.captureStatus = null;
      return;
    }

    if (event.code === 'PageUp') {
      event.preventDefault();
      this.changePage(-1);
      this.captureMessage = `Viewing page ${Math.min(this.pageIndex + 1, Math.max(1, this.pageCount))}/${Math.max(1, this.pageCount)}.`;
      this.captureStatus = null;
      return;
    }

    if (event.code === 'Home') {
      event.preventDefault();
      this.manualPageOverride = true;
      this.setPage(0);
      this.captureMessage = 'Jumped to first page.';
      this.captureStatus = null;
      return;
    }

    if (event.code === 'End') {
      event.preventDefault();
      this.manualPageOverride = true;
      this.setPage(this.pageCount - 1);
      this.captureMessage = 'Jumped to last page.';
      this.captureStatus = null;
      return;
    }
  }

  _emitSelectionCue(reason) {
    if (!this.visible) {
      return;
    }
    const entry = this.actionEntries[this.selectedIndex] ?? null;
    if (!entry) {
      return;
    }
    if (this._lastFxSelectionIndex === this.selectedIndex && reason !== 'capture-success') {
      return;
    }
    this._lastFxSelectionIndex = this.selectedIndex;
    this._emitFxCue('controlBindingsSelectionFocus', {
      reason,
      action: entry.action,
      label: entry.label,
      sectionId: entry.sectionId ?? null,
      index: this.selectedIndex,
      codes: Array.isArray(entry.codes) ? [...entry.codes] : [],
    });
  }

  _emitFxCue(effectId, context = {}) {
    if (!this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }
    this.eventBus.emit('fx:overlay_cue', {
      effectId,
      source: 'ControlBindingsOverlay',
      context,
    });
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
