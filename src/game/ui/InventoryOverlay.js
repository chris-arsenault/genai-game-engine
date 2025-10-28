import { emitOverlayVisibility } from './helpers/overlayEvents.js';
import { overlayTheme, withOverlayTheme } from './theme/overlayTheme.js';

const DEFAULT_LAYOUT = {
  width: 480,
  height: 360,
};

const rarityOrder = {
  legendary: 0,
  epic: 1,
  evidence: 1.5,
  rare: 2,
  uncommon: 3,
  common: 5,
};

function getRarityOrder(value) {
  if (!value) return rarityOrder.common;
  const normalized = String(value).toLowerCase();
  return rarityOrder[normalized] ?? rarityOrder.common;
}

export class InventoryOverlay {
  constructor(canvas, eventBus, options = {}) {
    if (!canvas) {
      throw new Error('InventoryOverlay requires a canvas reference');
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.events = eventBus;
    this.store = options.store ?? null;

    this.visible = false;
    this.fadeAlpha = 0;
    this.targetAlpha = 0;
    this.fadeSpeed = options.fadeSpeed ?? 6;

    this.items = [];
    this.equipped = {};
    this.selectedIndex = 0;
    this.title = options.title ?? 'Evidence Locker';

    const { palette, typography, metrics } = overlayTheme;
    const styleOverrides = options.styleOverrides ?? {};

    this.layout = {
      width: options.width ?? DEFAULT_LAYOUT.width,
      height: options.height ?? DEFAULT_LAYOUT.height,
    };

    this.style = {
      panel: withOverlayTheme({
        background: palette.backgroundSurface,
        borderColor: palette.outlineStrong,
        borderWidth: 2,
        cornerRadius: metrics.overlayCornerRadius,
        shadowColor: 'rgba(0, 0, 0, 0.5)',
        shadowBlur: 24,
      }, styleOverrides.panel),
      header: withOverlayTheme({
        font: typography.title,
        color: palette.textPrimary,
        accent: palette.outlineSoft,
        subtitleFont: typography.small,
        subtitleColor: palette.textMuted,
      }, styleOverrides.header),
      list: withOverlayTheme({
        font: typography.body,
        color: palette.textSecondary,
        activeColor: palette.textPrimary,
        accent: palette.accent,
        rarityColors: {
          common: palette.textSecondary,
          uncommon: '#7dd0ff',
          rare: palette.accent,
          epic: '#b691ff',
          legendary: '#ffd76a',
          evidence: overlayTheme.palette.warning,
        },
        lineHeight: 22,
      }, styleOverrides.list),
      detail: withOverlayTheme({
        font: typography.body,
        headingFont: typography.hud,
        color: palette.textPrimary,
        muted: palette.textMuted,
        lineHeight: 20,
        tagFont: typography.small,
      }, styleOverrides.detail),
    };

    this._unsubscribeStore = null;
    this._offMoveUp = null;
    this._offMoveDown = null;
  }

  init() {
    if (this.store && typeof this.store.onUpdate === 'function') {
      this._unsubscribeStore = this.store.onUpdate((state) => {
        this.applyInventoryState(state?.inventory);
      });
      const initialState = this.store.getState();
      this.applyInventoryState(initialState?.inventory);
    }

    if (this.events) {
      this._offMoveUp = this.events.on('input:moveUp:pressed', () => {
        if (this.visible) {
          this.changeSelection(-1);
        }
      });
      this._offMoveDown = this.events.on('input:moveDown:pressed', () => {
        if (this.visible) {
          this.changeSelection(1);
        }
      });
    }
  }

  applyInventoryState(rawState) {
    const state = rawState ?? {};
    const items = Array.isArray(state.items) ? state.items : [];
    const mapped = [];

    for (const item of items) {
      if (!item || !item.id) continue;
      mapped.push({
        id: item.id,
        name: item.name ?? item.id,
        description: item.description ?? '',
        type: item.type ?? 'generic',
        rarity: item.rarity ?? 'common',
        quantity: Number.isFinite(item.quantity) ? Math.max(1, Math.floor(item.quantity)) : 1,
        tags: Array.isArray(item.tags) ? [...item.tags] : [],
        metadata: item.metadata ? { ...item.metadata } : {},
        lastSeenAt: item.lastSeenAt ?? Date.now(),
      });
    }

    mapped.sort((a, b) => {
      const priorityA = a.metadata?.priority ?? 0;
      const priorityB = b.metadata?.priority ?? 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      const rarityDelta = getRarityOrder(a.rarity) - getRarityOrder(b.rarity);
      if (rarityDelta !== 0) {
        return rarityDelta;
      }

      return (b.lastSeenAt ?? 0) - (a.lastSeenAt ?? 0);
    });

    this.items = mapped;
    this.equipped = state.equipped ? { ...state.equipped } : {};

    if (this.items.length === 0) {
      this.selectedIndex = 0;
    } else if (this.selectedIndex >= this.items.length) {
      this.selectedIndex = this.items.length - 1;
    } else if (this.selectedIndex < 0) {
      this.selectedIndex = 0;
    }
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
    emitOverlayVisibility(this.events, 'inventory', true, {
      source,
      count: this.items.length,
    });
  }

  hide(source = 'hide') {
    if (!this.visible && this.targetAlpha === 0) {
      return;
    }
    const wasVisible = this.visible;
    this.visible = false;
    this.targetAlpha = 0;

    if (wasVisible) {
      emitOverlayVisibility(this.events, 'inventory', false, {
        source,
      });
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
  }

  changeSelection(direction) {
    if (!this.items.length) return;
    const count = this.items.length;
    const nextIndex = (this.selectedIndex + direction + count) % count;
    if (nextIndex === this.selectedIndex) {
      return;
    }
    this.selectedIndex = nextIndex;
    if (this.events) {
      this.events.emit('inventory:selection_changed', {
        itemId: this.items[this.selectedIndex].id,
        index: this.selectedIndex,
      });
    }
  }

  getSelectedItem() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items[Math.max(0, Math.min(this.selectedIndex, this.items.length - 1))];
  }

  getSummary() {
    const total = this.items.length;
    const evidence = this.items.filter((item) => item.tags.includes('evidence')).length;
    const equippedCount = Object.values(this.equipped || {}).filter(Boolean).length;
    const segments = [`${total} item${total === 1 ? '' : 's'}`];
    if (evidence) {
      segments.push(`${evidence} evidence`);
    }
    if (equippedCount) {
      segments.push(`${equippedCount} equipped`);
    }
    return segments.join(' · ');
  }

  render(ctx) {
    if (!this.visible && this.fadeAlpha === 0) {
      return;
    }

    const { width, height } = this.layout;
    const margin = overlayTheme.metrics.overlayMargin;
    const panelX = margin;
    const panelY = this.canvas.height - height - margin;

    ctx.save();
    ctx.globalAlpha = this.fadeAlpha;

    // Panel background with shadow
    ctx.shadowColor = this.style.panel.shadowColor;
    ctx.shadowBlur = this.style.panel.shadowBlur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    this.roundRect(ctx, panelX, panelY, width, height, this.style.panel.cornerRadius);
    ctx.fillStyle = this.style.panel.background;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = this.style.panel.borderWidth;
    ctx.strokeStyle = this.style.panel.borderColor;
    ctx.stroke();

    // Header
    ctx.font = this.style.header.font;
    ctx.fillStyle = this.style.header.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(this.title, panelX + 24, panelY + 18);

    ctx.fillStyle = this.style.header.accent;
    ctx.fillRect(panelX + 24, panelY + 48, width - 48, 2);

    ctx.font = this.style.header.subtitleFont;
    ctx.fillStyle = this.style.header.subtitleColor;
    ctx.fillText(this.getSummary(), panelX + 24, panelY + 56);

    const listWidth = Math.floor(width * 0.45);
    const listX = panelX + 24;
    const listY = panelY + 84;
    const listHeight = height - (listY - panelY) - 24;
    const detailX = panelX + listWidth + 48;
    const detailY = panelY + 84;
    const detailWidth = width - (detailX - panelX) - 24;

    this.renderItemList(ctx, listX, listY, listWidth, listHeight);
    this.renderItemDetail(ctx, detailX, detailY, detailWidth, height - (detailY - panelY) - 24);

    ctx.restore();
  }

  renderItemList(ctx, x, y, width, height) {
    const lineHeight = this.style.list.lineHeight;
    const totalSlotHeight = lineHeight + 4;
    const maxVisible = Math.max(1, Math.floor(height / totalSlotHeight));
    const startIndex = Math.max(0, this.selectedIndex - Math.floor(maxVisible / 2));
    const slice = this.items.slice(startIndex, startIndex + maxVisible);
    const { palette } = overlayTheme;

    if (!slice.length) {
      ctx.font = this.style.detail.font;
      ctx.fillStyle = this.style.detail.muted;
      ctx.fillText('Inventory empty. Explore The Hollow to recover evidence.', x, y);
      return;
    }

    ctx.font = this.style.list.font;
    let cursorY = y;

    for (let i = 0; i < slice.length; i += 1) {
      const item = slice[i];
      const globalIndex = startIndex + i;
      const isSelected = globalIndex === this.selectedIndex;
      const isEquipped = Object.values(this.equipped || {}).includes(item.id);

      if (isSelected) {
        ctx.fillStyle = `${overlayTheme.palette.highlight}`;
        ctx.globalAlpha = this.fadeAlpha * 0.8;
        this.roundRect(ctx, x - 12, cursorY - 4, width + 16, lineHeight + 6, 6);
        ctx.fill();
        ctx.globalAlpha = this.fadeAlpha;
      }

      const rarityColor = this.style.list.rarityColors[String(item.rarity).toLowerCase()] ?? this.style.list.color;
      ctx.fillStyle = isSelected ? this.style.list.activeColor : rarityColor;
      ctx.textBaseline = 'top';
      ctx.fillText(this.buildListLabel(item, isEquipped), x, cursorY);

      if (isEquipped) {
        ctx.font = this.style.detail.tagFont;
        ctx.fillStyle = palette.outlineSoft;
        ctx.fillText('equipped', x + width - 72, cursorY);
        ctx.font = this.style.list.font;
      }

      cursorY += lineHeight + 4;
    }
  }

  renderItemDetail(ctx, x, y, width, height) {
    const item = this.getSelectedItem();
    ctx.save();

    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    ctx.font = this.style.detail.headingFont;
    ctx.fillStyle = this.style.detail.color;
    ctx.textBaseline = 'top';

    if (!item) {
      ctx.fillText('No items selected', x, y);
      ctx.restore();
      return;
    }

    ctx.fillText(item.name, x, y);

    ctx.font = this.style.detail.font;
    ctx.fillStyle = this.style.detail.muted;
    ctx.fillText(`${item.type} · ${item.rarity}`, x, y + 26);

    const tags = Array.isArray(item.tags) ? item.tags : [];
    if (tags.length) {
      ctx.font = this.style.detail.tagFont;
      ctx.fillStyle = overlayTheme.palette.outlineSoft;
      ctx.fillText(tags.join(' • '), x, y + 46);
    }

    ctx.font = this.style.detail.font;
    ctx.fillStyle = this.style.detail.color;

    const textY = y + 70;
    const wrapped = this.wrapText(ctx, item.description || 'No description available.', width);
    for (let i = 0; i < wrapped.length; i += 1) {
      ctx.fillText(wrapped[i], x, textY + i * this.style.detail.lineHeight);
    }

    ctx.restore();
  }

  buildListLabel(item, isEquipped) {
    const quantity = item.quantity > 1 ? ` x${item.quantity}` : '';
    const evidenceMarker = item.tags.includes('evidence') ? '[EV] ' : '';
    const equippedMarker = isEquipped ? '[EQ] ' : '';
    return `${equippedMarker}${evidenceMarker}${item.name}${quantity}`;
  }

  wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
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
    if (typeof this._offMoveUp === 'function') {
      this._offMoveUp();
      this._offMoveUp = null;
    }
    if (typeof this._offMoveDown === 'function') {
      this._offMoveDown();
      this._offMoveDown = null;
    }
  }
}

export default InventoryOverlay;
