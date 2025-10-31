import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';
import { getBindingLabels } from '../utils/controlBindingPrompts.js';
import { buildDistrictTravelViewModel } from './helpers/districtTravelViewModel.js';

const PANEL_PADDING = 24;
const LIST_ITEM_HEIGHT = 32;
const HISTORY_LIMIT = 10;

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function wrapText(ctx, text, maxWidth) {
  if (!text || !ctx) {
    return [];
  }

  const words = text.split(/\s+/);
  const lines = [];
  let current = words.shift() || '';

  for (const word of words) {
    const test = `${current} ${word}`;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current.length) {
    lines.push(current);
  }

  return lines;
}

export class DistrictTravelOverlay {
  constructor(canvas, eventBus, options = {}) {
    if (!canvas) {
      throw new Error('DistrictTravelOverlay requires a canvas reference');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.store = options.store ?? null;
    this.playerEntityId = Number.isFinite(options.playerEntityId)
      ? options.playerEntityId
      : null;
    this.traversalNoticeDurationMs = options.traversalNoticeDurationMs ?? 6000;
    this.traversalCooldownMs = options.traversalCooldownMs ?? 750;

    this.visible = false;
    this.fadeSpeed = options.fadeSpeed ?? 6;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;

    this.entries = [];
    this.selectedIndex = 0;
    this._lastSnapshotSignature = null;
    this._lastTraversalNotice = null;
    this.lastTraversalNotice = null;
    this._lastTraversalDeniedAt = 0;

    this.layout = {
      width: options.width ?? 720,
      height: options.height ?? 420,
      listWidth: options.listWidth ?? 240,
    };

    const { palette, typography, metrics } = overlayTheme;

    this.style = {
      panel: withOverlayTheme(
        {
          background: palette.backgroundSurface,
          borderColor: palette.outlineStrong,
          borderWidth: 2,
          cornerRadius: metrics.overlayCornerRadius,
          shadowColor: 'rgba(0, 0, 0, 0.45)',
          shadowBlur: 28,
        },
        options.style?.panel
      ),
      header: withOverlayTheme(
        {
          font: typography.title,
          color: palette.textPrimary,
          subtitleFont: typography.small,
          subtitleColor: palette.textMuted,
        },
        options.style?.header
      ),
      list: withOverlayTheme(
        {
          font: typography.body,
          color: palette.textSecondary,
          activeColor: palette.textPrimary,
          highlightColor: palette.highlight,
          statusAccessible: palette.accent,
          statusRestricted: palette.warning,
          baseline: palette.textMuted,
        },
        options.style?.list
      ),
      detail: withOverlayTheme(
        {
          headingFont: typography.hud,
          bodyFont: typography.body,
          labelFont: typography.small,
          headingColor: palette.textPrimary,
          bodyColor: palette.textSecondary,
          labelColor: palette.textMuted,
          statusAccessible: palette.accent,
          statusRestricted: palette.warning,
        },
        options.style?.detail
      ),
      bindings: withOverlayTheme(
        {
          font: typography.small,
          color: palette.textMuted,
        },
        options.style?.bindings
      ),
    };

    this._unsubscribeStore = null;
    this._offMoveUp = null;
    this._offMoveDown = null;
    this._offToggle = null;
    this._offShow = null;
    this._offHide = null;
    this._offTraversalDenied = null;
  }

  init() {
    this.refresh();

    if (this.store && typeof this.store.onUpdate === 'function') {
      this._unsubscribeStore = this.store.onUpdate((state) => {
        this.refresh(state);
      });
    }

    if (this.eventBus) {
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
      this._offToggle = this.eventBus.on('ui:travel:toggle', (payload = {}) => {
        this.toggle(payload.source ?? 'event:toggle');
      });
      this._offShow = this.eventBus.on('ui:travel:show', (payload = {}) => {
        this.show(payload.source ?? 'event:show');
      });
      this._offHide = this.eventBus.on('ui:travel:hide', (payload = {}) => {
        this.hide(payload.source ?? 'event:hide');
      });
      this._offTraversalDenied = this.eventBus.on(
        'navigation:movement_blocked',
        (payload = {}) => {
          this._handleTraversalDenied(payload);
        }
      );
    }
  }

  setPlayerEntityId(entityId) {
    if (Number.isFinite(entityId)) {
      this.playerEntityId = entityId;
    } else {
      this.playerEntityId = null;
    }
  }

  refresh(forcedState = null) {
    const source = forcedState ?? this.store ?? null;
    if (!source) {
      this.entries = [];
      this.selectedIndex = 0;
      return;
    }

    const viewModel = buildDistrictTravelViewModel(source);
    const signature = JSON.stringify(
      viewModel.map((entry) => ({
        id: entry.districtId,
        status: entry.status,
        blockers: entry.blockers,
        unlockedRoutes: entry.unlockedRoutes.map((route) => route.id),
      }))
    );

    if (signature === this._lastSnapshotSignature) {
      return;
    }

    this.entries = viewModel;
    this._lastSnapshotSignature = signature;

    if (!this.entries.length) {
      this.selectedIndex = 0;
      return;
    }

    this.selectedIndex = clamp(this.selectedIndex, 0, this.entries.length - 1);
  }

  toggle(source = 'toggle') {
    if (this.visible) {
      this.hide(source);
    } else {
      this.show(source);
    }
  }

  show(source = 'show') {
    this.refresh();
    if (this.visible && this.targetAlpha === 1) {
      return;
    }
    this.visible = true;
    this.targetAlpha = 1;
    emitOverlayVisibility(this.eventBus, 'districtTravel', true, { source });
  }

  hide(source = 'hide') {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }
    this.visible = false;
    this.targetAlpha = 0;
    emitOverlayVisibility(this.eventBus, 'districtTravel', false, { source });
  }

  changeSelection(delta) {
    if (!Number.isFinite(delta) || !this.entries.length) {
      return;
    }
    const nextIndex = clamp(
      this.selectedIndex + delta,
      0,
      this.entries.length - 1
    );
    if (nextIndex === this.selectedIndex) {
      return;
    }
    this.selectedIndex = nextIndex;
    emitOverlayVisibility(this.eventBus, 'districtTravel:selection', true, {
      districtId: this.getSelectedEntry()?.districtId ?? null,
    });
  }

  getSelectedEntry() {
    if (!this.entries.length) {
      return null;
    }
    return this.entries[this.selectedIndex] ?? null;
  }

  update(deltaTime) {
    if (this.fadeAlpha < this.targetAlpha) {
      this.fadeAlpha = Math.min(
        this.targetAlpha,
        this.fadeAlpha + this.fadeSpeed * deltaTime
      );
    } else if (this.fadeAlpha > this.targetAlpha) {
      this.fadeAlpha = Math.max(
        this.targetAlpha,
        this.fadeAlpha - this.fadeSpeed * deltaTime
      );
    }
  }

  render(ctx) {
    if ((!this.visible && this.fadeAlpha === 0) || !ctx) {
      return;
    }

    const alpha = this.fadeAlpha;
    if (alpha <= 0) {
      return;
    }

    const panelWidth = this.layout.width;
    const panelHeight = this.layout.height;
    const x = (this.canvas.width - panelWidth) / 2;
    const y = (this.canvas.height - panelHeight) / 2;

    ctx.save();
    ctx.globalAlpha = alpha;

    this._renderPanel(ctx, x, y, panelWidth, panelHeight);
    this._renderHeader(ctx, x, y, panelWidth);
    this._renderList(ctx, x, y, panelHeight);
    this._renderDetail(ctx, x, y, panelWidth, panelHeight);
    this._renderBindingHints(ctx, x, y, panelWidth, panelHeight);

    ctx.restore();
  }

  _renderPanel(ctx, x, y, width, height) {
    const { panel } = this.style;
    ctx.fillStyle = panel.background;
    this._drawRoundedRect(ctx, x, y, width, height, panel.cornerRadius ?? 8);
    ctx.fill();

    ctx.strokeStyle = panel.borderColor;
    ctx.lineWidth = panel.borderWidth ?? 2;
    this._drawRoundedRect(ctx, x, y, width, height, panel.cornerRadius ?? 8);
    ctx.stroke();

    if (panel.shadowColor && (panel.shadowBlur ?? 0) > 0) {
      ctx.save();
      ctx.shadowColor = panel.shadowColor;
      ctx.shadowBlur = panel.shadowBlur;
      ctx.globalAlpha *= 0.6;
      ctx.fill();
      ctx.restore();
    }
  }

  _renderHeader(ctx, x, y, width) {
    const { header } = this.style;
    ctx.save();
    ctx.font = header.font;
    ctx.fillStyle = header.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('District Access Overview', x + PANEL_PADDING, y + PANEL_PADDING);

    ctx.font = header.subtitleFont;
    ctx.fillStyle = header.subtitleColor;
    ctx.textAlign = 'right';
    const summary = `${this.entries.length} districts tracked`;
    ctx.fillText(
      summary,
      x + width - PANEL_PADDING,
      y + PANEL_PADDING + 2
    );

    const notice = this._getActiveTraversalNotice();
    if (notice) {
      ctx.font = header.subtitleFont;
      ctx.fillStyle = header.subtitleColor;
      ctx.textAlign = 'left';
      ctx.fillText(
        this._formatTraversalNotice(notice),
        x + PANEL_PADDING,
        y + PANEL_PADDING + 20
      );
    }
    ctx.restore();
  }

  _renderList(ctx, x, y, height) {
    const listX = x + PANEL_PADDING;
    const listY = y + PANEL_PADDING + 36;
    const listWidth = this.layout.listWidth;

    ctx.save();
    ctx.font = this.style.list.font;
    ctx.textBaseline = 'middle';

    for (let index = 0; index < this.entries.length; index += 1) {
      const entry = this.entries[index];
      const rowY = listY + index * LIST_ITEM_HEIGHT;
      const isSelected = index === this.selectedIndex;

      if (rowY + LIST_ITEM_HEIGHT > y + height - PANEL_PADDING * 2) {
        break;
      }

      if (isSelected) {
        ctx.fillStyle = this.style.list.highlightColor;
        ctx.fillRect(listX, rowY - LIST_ITEM_HEIGHT / 2, listWidth, LIST_ITEM_HEIGHT);
      }

      ctx.fillStyle = isSelected
        ? this.style.list.activeColor
        : this.style.list.color;
      ctx.textAlign = 'left';
      ctx.fillText(entry.name, listX + 10, rowY);

      ctx.textAlign = 'right';
      ctx.fillStyle = this._resolveStatusColor(entry.status);
      ctx.fillText(
        this._formatStatus(entry.status),
        listX + listWidth - 10,
        rowY
      );
    }

    ctx.restore();
  }

  _renderDetail(ctx, x, y, width, height) {
    const entry = this.getSelectedEntry();
    if (!entry) {
      return;
    }

    const detailX = x + PANEL_PADDING + this.layout.listWidth + PANEL_PADDING;
    const detailWidth = width - (detailX - x) - PANEL_PADDING;
    const contentY = y + PANEL_PADDING + 36;
    const maxContentHeight = height - PANEL_PADDING * 2 - 48;

    ctx.save();
    ctx.font = this.style.detail.headingFont;
    ctx.fillStyle = this.style.detail.headingColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillText(entry.name, detailX, contentY);

    ctx.font = this.style.detail.labelFont;
    ctx.fillStyle = this.style.detail.labelColor;
    ctx.fillText(
      `${entry.tier} tier • ${
        entry.controllingFaction ? `Controlled by ${entry.controllingFaction}` : 'Unassigned control'
      }`,
      detailX,
      contentY + 24
    );

    ctx.font = this.style.detail.headingFont;
    ctx.fillStyle = this._resolveStatusColor(entry.status);
    ctx.fillText(
      this._formatStatus(entry.status),
      detailX,
      contentY + 48
    );

    const detailStartY = contentY + 78;
    let cursorY = detailStartY;

    cursorY = this._renderSection(
      ctx,
      detailX,
      cursorY,
      detailWidth,
      'Blockers',
      entry.blockers.length
        ? entry.blockers.slice(0, HISTORY_LIMIT)
        : ['No blockers detected.']
    );

    cursorY += 8;

    const restrictionLines = entry.restrictions.length
      ? entry.restrictions.map((restriction) =>
          restriction.description
            ? `${restriction.type}: ${restriction.description}`
            : restriction.type
        )
      : ['No active restrictions.'];

    cursorY = this._renderSection(
      ctx,
      detailX,
      cursorY,
      detailWidth,
      'Active Restrictions',
      restrictionLines.slice(0, HISTORY_LIMIT)
    );

    cursorY += 8;

    const routeLines = entry.routes.length
      ? entry.routes.map((route) =>
          route.unlocked
            ? `✓ ${route.description || route.id}`
            : `• ${route.description || route.id}`
        )
      : ['No infiltration routes defined.'];

    this._renderSection(
      ctx,
      detailX,
      cursorY,
      detailWidth,
      'Infiltration Routes',
      routeLines.slice(0, HISTORY_LIMIT)
    );

    ctx.restore();
  }

  _renderSection(ctx, x, y, width, title, lines) {
    ctx.save();
    ctx.font = this.style.detail.labelFont;
    ctx.fillStyle = this.style.detail.labelColor;
    ctx.fillText(title, x, y);

    ctx.font = this.style.detail.bodyFont;
    ctx.fillStyle = this.style.detail.bodyColor;

    let cursorY = y + 18;
    for (const line of lines) {
      const wrapped = wrapText(ctx, line, width);
      for (const wrappedLine of wrapped) {
        ctx.fillText(wrappedLine, x, cursorY);
        cursorY += 20;
      }
    }

    ctx.restore();
    return cursorY;
  }

  _renderBindingHints(ctx, x, y, width, height) {
    const text = [
      `Close: ${this._getBindingLabel('travel', 'T')}`,
      `Scroll: ${this._getPrimaryBindingLabel('moveUp', 'W')}/${this._getPrimaryBindingLabel('moveDown', 'S')}`,
    ]
      .filter(Boolean)
      .join('  ·  ');

    if (!text.length) {
      return;
    }

    ctx.save();
    ctx.font = this.style.bindings.font;
    ctx.fillStyle = this.style.bindings.color;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      text,
      x + width - PANEL_PADDING,
      y + height - PANEL_PADDING
    );
    ctx.restore();
  }

  _getBindingLabel(action, fallback) {
    const labels = getBindingLabels(action, { fallbackLabel: fallback });
    if (Array.isArray(labels) && labels.length) {
      return labels.join('/');
    }
    return fallback;
  }

  _getPrimaryBindingLabel(action, fallback) {
    const labels = getBindingLabels(action, { fallbackLabel: fallback });
    if (Array.isArray(labels) && labels.length) {
      return labels[0];
    }
    return fallback;
  }

  _formatStatus(status) {
    switch (status) {
      case 'accessible':
        return 'Access granted';
      case 'restricted':
        return 'Restricted';
      case 'gated':
        return 'Requirements pending';
      case 'locked':
      default:
        return 'Access locked';
    }
  }

  _resolveStatusColor(status) {
    switch (status) {
      case 'accessible':
        return this.style.detail.statusAccessible;
      case 'restricted':
      case 'gated':
      case 'locked':
      default:
        return this.style.detail.statusRestricted;
    }
  }

  _drawRoundedRect(ctx, x, y, width, height, radius) {
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

  cleanup() {
    if (typeof this._unsubscribeStore === 'function') {
      this._unsubscribeStore();
      this._unsubscribeStore = null;
    }
    for (const off of [
      this._offMoveUp,
      this._offMoveDown,
      this._offToggle,
      this._offShow,
      this._offHide,
      this._offTraversalDenied,
    ]) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._offMoveUp = null;
    this._offMoveDown = null;
    this._offToggle = null;
    this._offShow = null;
    this._offHide = null;
    this._offTraversalDenied = null;
  }

  _handleTraversalDenied(payload = {}) {
    if (!payload || typeof payload !== 'object') {
      return;
    }

    if (this.playerEntityId != null && payload.entityId !== this.playerEntityId) {
      return;
    }

    const reason = payload.reason ?? 'unknown';
    if (reason !== 'locked_surface' && reason !== 'outside_nav_mesh') {
      return;
    }

    const timestamp = this._now();
    const withinCooldown = timestamp - this._lastTraversalDeniedAt < this.traversalCooldownMs;
    this._lastTraversalDeniedAt = timestamp;
    const shouldReveal = !withinCooldown || !this.visible;

    this.refresh();

    const targetIndex = this._resolveTraversalTargetIndex(payload);
    if (targetIndex != null && Number.isFinite(targetIndex)) {
      this.selectedIndex = clamp(targetIndex, 0, Math.max(0, this.entries.length - 1));
    }

    const surfaceTags = Array.isArray(payload.surfaceTags)
      ? payload.surfaceTags.map((tag) => String(tag))
      : [];

    const notice = {
      reason,
      surfaceId: payload.surfaceId ?? null,
      surfaceTags,
      sceneId: payload.sceneId ?? null,
      timestamp,
      expiresAt: timestamp + this.traversalNoticeDurationMs,
    };

    this._lastTraversalNotice = notice;
    this.lastTraversalNotice = {
      reason: notice.reason,
      surfaceId: notice.surfaceId,
      surfaceTags: [...notice.surfaceTags],
      sceneId: notice.sceneId,
      timestamp: notice.timestamp,
    };

    if (shouldReveal) {
      this.show('event:traversal_denied');
    }
  }

  _resolveTraversalTargetIndex(payload = {}) {
    if (!Array.isArray(this.entries) || this.entries.length === 0) {
      return null;
    }

    const districtId = payload.districtId ?? null;
    if (districtId) {
      const matchIndex = this.entries.findIndex(
        (entry) => entry.districtId === districtId
      );
      if (matchIndex !== -1) {
        return matchIndex;
      }
    }

    const surfaceId = payload.surfaceId ?? null;
    if (surfaceId) {
      const matchIndex = this.entries.findIndex((entry) => {
        const hasRoute = Array.isArray(entry.routes)
          ? entry.routes.some((route) => route.id === surfaceId)
          : false;
        const hasRestriction = Array.isArray(entry.restrictions)
          ? entry.restrictions.some((restriction) => restriction.id === surfaceId)
          : false;
        return hasRoute || hasRestriction;
      });
      if (matchIndex !== -1) {
        return matchIndex;
      }
    }

    const surfaceTags = Array.isArray(payload.surfaceTags)
      ? payload.surfaceTags.map((tag) => String(tag).toLowerCase())
      : [];

    if (surfaceTags.length) {
      const tagMatchIndex = this.entries.findIndex((entry) => {
        if (Array.isArray(entry.routes)) {
          const matchRoute = entry.routes.some((route) => {
            if (!route) {
              return false;
            }
            const type = String(route.type || '').toLowerCase();
            const routeId = route.id ? String(route.id).toLowerCase() : null;
            if (surfaceTags.includes(type)) {
              return true;
            }
            if (routeId && surfaceTags.includes(routeId)) {
              return true;
            }
            return false;
          });
          if (matchRoute) {
            return true;
          }
        }

        if (Array.isArray(entry.blockers)) {
          const blockerMatch = entry.blockers.some((blocker) => {
            if (typeof blocker !== 'string') {
              return false;
            }
            const lower = blocker.toLowerCase();
            return surfaceTags.some((tag) => lower.includes(tag));
          });
          if (blockerMatch) {
            return true;
          }
        }

        return false;
      });

      if (tagMatchIndex !== -1) {
        return tagMatchIndex;
      }
    }

    const lockedIndex = this.entries.findIndex((entry) => !entry.status?.accessible);
    if (lockedIndex !== -1) {
      return lockedIndex;
    }

    return null;
  }

  _getActiveTraversalNotice() {
    if (!this._lastTraversalNotice) {
      return null;
    }
    if (this._lastTraversalNotice.expiresAt <= this._now()) {
      this._lastTraversalNotice = null;
      return null;
    }
    return this._lastTraversalNotice;
  }

  _formatTraversalNotice(notice) {
    const parts = [];
    if (notice.reason === 'locked_surface') {
      parts.push('Traversal blocked');
    } else if (notice.reason === 'outside_nav_mesh') {
      parts.push('Outside navigation mesh');
    } else {
      parts.push('Traversal denied');
    }

    if (Array.isArray(notice.surfaceTags) && notice.surfaceTags.length) {
      parts.push(`tags: ${notice.surfaceTags.join(', ')}`);
    } else if (notice.surfaceId) {
      parts.push(`surface: ${notice.surfaceId}`);
    }

    return parts.join(' · ');
  }

  _now() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }
}

export default DistrictTravelOverlay;
