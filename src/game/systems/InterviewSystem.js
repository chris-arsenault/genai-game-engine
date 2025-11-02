/**
 * InterviewSystem
 *
 * Tracks dialogue-driven interviews, captures approach selections, and records
 * testimony statements into the active case file. Detects contradictions when
 * testimonies disagree on shared facts.
 */

import { System } from '../../engine/ecs/System.js';

const APPROACH_ALIASES = {
  aggressive: ['aggressive', 'direct', 'forceful', 'intense'],
  diplomatic: ['diplomatic', 'empathetic', 'friendly', 'conciliatory'],
  analytical: ['analytical', 'logical', 'objective', 'methodical'],
};

const APPROACH_LABELS = {
  aggressive: 'Aggressive',
  diplomatic: 'Diplomatic',
  analytical: 'Analytical',
};

function normalizeString(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeApproachId(raw) {
  const normalized = normalizeString(raw);
  if (!normalized) {
    return null;
  }

  const lower = normalized.toLowerCase();
  for (const [canonical, aliases] of Object.entries(APPROACH_ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }
  if (APPROACH_ALIASES[lower]) {
    return lower;
  }
  return null;
}

function getApproachLabel(approachId) {
  const normalized = normalizeApproachId(approachId);
  if (!normalized) {
    return null;
  }
  return APPROACH_LABELS[normalized] ?? normalized;
}

function normalizeFactEntry(rawFact = {}, fallbackText = '') {
  if (!rawFact || typeof rawFact !== 'object') {
    return null;
  }

  const factId =
    normalizeString(rawFact.factId) ??
    normalizeString(rawFact.id) ??
    normalizeString(rawFact.key) ??
    null;

  const value =
    normalizeString(rawFact.value) ??
    normalizeString(rawFact.statement) ??
    normalizeString(rawFact.text) ??
    normalizeString(fallbackText) ??
    null;

  const text =
    normalizeString(rawFact.text) ??
    normalizeString(rawFact.statement) ??
    normalizeString(fallbackText) ??
    value;

  const confidence = normalizeString(rawFact.confidence);
  const category = normalizeString(rawFact.category);

  if (!factId && !text) {
    return null;
  }

  const fact = {
    factId: factId ?? `fact_${Math.random().toString(36).slice(2, 10)}`,
    value: value ?? text,
    text: text ?? value ?? '',
    confidence: confidence ?? null,
    category: category ?? null,
  };

  if (Array.isArray(rawFact.tags)) {
    fact.tags = rawFact.tags
      .map((tag) => normalizeString(tag))
      .filter((tag) => tag !== null);
  }

  if (rawFact.importance && Number.isFinite(rawFact.importance)) {
    fact.importance = rawFact.importance;
  } else if (typeof rawFact.importance === 'string') {
    fact.importance = normalizeString(rawFact.importance);
  }

  return fact;
}

function sanitizeDialogueMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const tags = Array.isArray(metadata.tags)
    ? metadata.tags.map((tag) => normalizeString(tag)).filter((tag) => tag !== null)
    : [];
  const factionId = normalizeString(metadata.factionId);
  return {
    caseId: normalizeString(metadata.caseId),
    tags,
    factionId,
  };
}

export class InterviewSystem extends System {
  constructor(componentRegistry, eventBus, options = {}) {
    super(componentRegistry, eventBus, []);
    this.priority = 42;
    this.caseManager = options.caseManager ?? null;
    this.dialogueSystem = options.dialogueSystem ?? null;
    this.worldStateStore = options.worldStateStore ?? null;

    this.activeInterviews = new Map();
    this._handlers = null;
    this._offEvents = [];
  }

  init() {
    this._handlers = {
      onDialogueStarted: (payload) => this._handleDialogueStarted(payload),
      onDialogueChoice: (payload) => this._handleDialogueChoice(payload),
      onDialogueNodeChanged: (payload) => this._handleDialogueNodeChanged(payload),
      onDialogueEnded: (payload) => this._handleDialogueEnded(payload),
      onNpcInterviewed: (payload) => this._handleNpcInterviewed(payload),
    };

    this._subscribe('dialogue:started', this._handlers.onDialogueStarted);
    this._subscribe('dialogue:choice', this._handlers.onDialogueChoice);
    this._subscribe('dialogue:node_changed', this._handlers.onDialogueNodeChanged);
    this._subscribe('dialogue:ended', this._handlers.onDialogueEnded);
    this._subscribe('npc:interviewed', this._handlers.onNpcInterviewed);
  }

  cleanup() {
    for (const off of this._offEvents) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._offEvents = [];
    this._handlers = null;
    this.activeInterviews.clear();
  }

  update() {
    // InterviewSystem is event-driven; no per-frame logic required.
  }

  _subscribe(eventType, handler) {
    if (!this.eventBus || typeof this.eventBus.on !== 'function') {
      return;
    }
    const off = this.eventBus.on(eventType, handler);
    if (typeof off === 'function') {
      this._offEvents.push(off);
    }
  }

  _getDialogueTree(dialogueId) {
    if (!this.dialogueSystem || typeof this.dialogueSystem.getDialogueTree !== 'function') {
      return null;
    }
    return this.dialogueSystem.getDialogueTree(dialogueId) ?? null;
  }

  _shouldTrackDialogue(tree, payload = {}) {
    if (!tree) {
      return false;
    }
    const metadata = sanitizeDialogueMetadata(tree.metadata);
    if (metadata?.caseId) {
      return true;
    }

    if (metadata?.tags?.some((tag) =>
      ['interview', 'witness', 'testimony'].includes(tag.toLowerCase())
    )) {
      return true;
    }

    const requestedId = normalizeString(payload.requestedDialogueId);
    const dialogueId = normalizeString(payload.dialogueId);
    const identifier = requestedId ?? dialogueId ?? '';
    if (identifier.includes('interview') || identifier.includes('testimony')) {
      return true;
    }

    return false;
  }

  _makeKey(npcId, dialogueId) {
    const safeNpc = normalizeString(npcId) ?? 'unknown_npc';
    const safeDialogue = normalizeString(dialogueId) ?? 'unknown_dialogue';
    return `${safeNpc}::${safeDialogue}`;
  }

  _resolveCaseId(treeMetadata, payload) {
    if (treeMetadata?.caseId) {
      return treeMetadata.caseId;
    }
    const payloadCaseId =
      normalizeString(payload?.caseId) ??
      normalizeString(payload?.metadata?.caseId);
    if (payloadCaseId) {
      return payloadCaseId;
    }
    if (this.caseManager && typeof this.caseManager.getActiveCase === 'function') {
      const activeCase = this.caseManager.getActiveCase();
      if (activeCase?.id) {
        return activeCase.id;
      }
    }
    return null;
  }

  _handleDialogueStarted(payload = {}) {
    const dialogueId = payload.dialogueId ?? payload.requestedDialogueId ?? null;
    const npcId = payload.npcId ?? null;
    if (!dialogueId || !npcId) {
      return;
    }

    const tree = this._getDialogueTree(dialogueId);
    if (!this._shouldTrackDialogue(tree, payload)) {
      return;
    }

    const dialogueMetadata = sanitizeDialogueMetadata(tree?.metadata);
    const caseId = this._resolveCaseId(dialogueMetadata, payload);
    if (!caseId) {
      return;
    }

    const key = this._makeKey(npcId, dialogueId);
    const context = {
      key,
      npcId,
      npcName: normalizeString(payload.npcName) ?? normalizeString(payload.speaker) ?? null,
      caseId,
      dialogueId,
      requestedDialogueId: payload.requestedDialogueId ?? null,
      dialogueMetadata,
      approachId: null,
      approachLabel: null,
      approachHistory: [],
      statements: [],
      statementIndex: new Map(), // factId -> statement
      visitedNodes: new Set(),
      startedAt: payload.startedAt ?? Date.now(),
    };

    this.activeInterviews.set(key, context);
  }

  _handleDialogueChoice(payload = {}) {
    const key = this._makeKey(payload.npcId, payload.dialogueId ?? payload.requestedDialogueId);
    const context = this.activeInterviews.get(key);
    if (!context) {
      return;
    }

    const approachId = normalizeApproachId(payload?.metadata?.approach);
    if (!approachId) {
      return;
    }

    context.approachId = context.approachId ?? approachId;
    context.approachLabel = getApproachLabel(context.approachId) ?? context.approachLabel;
    if (!context.approachHistory.includes(approachId)) {
      context.approachHistory.push(approachId);
    }

    this.eventBus.emit('interview:approach_selected', {
      npcId: context.npcId,
      dialogueId: context.dialogueId,
      requestedDialogueId: context.requestedDialogueId ?? null,
      caseId: context.caseId,
      approachId,
      approachLabel: getApproachLabel(approachId),
      timestamp: payload.timestamp ?? Date.now(),
    });
  }

  _handleDialogueNodeChanged(payload = {}) {
    const key = this._makeKey(payload.npcId, payload.dialogueId ?? payload.requestedDialogueId);
    const context = this.activeInterviews.get(key);
    if (!context) {
      return;
    }

    const nodeId = payload.nodeId ?? null;
    if (nodeId && context.visitedNodes.has(nodeId)) {
      return;
    }
    if (nodeId) {
      context.visitedNodes.add(nodeId);
    }

    const nodeMetadata = payload.nodeMetadata ?? payload.metadata?.nodeMetadata ?? null;
    const rawFacts = Array.isArray(nodeMetadata?.testimonyFacts)
      ? nodeMetadata.testimonyFacts
      : [];

    if (rawFacts.length === 0) {
      return;
    }

    const timestamp = payload.timestamp ?? Date.now();
    const statementsToAdd = [];

    rawFacts.forEach((factCandidate) => {
      const normalizedFact = normalizeFactEntry(factCandidate, payload.text ?? '');
      if (!normalizedFact) {
        return;
      }
      const existing = context.statementIndex.get(normalizedFact.factId);
      if (existing && existing.value === normalizedFact.value) {
        return;
      }

      const statement = {
        factId: normalizedFact.factId,
        value: normalizedFact.value,
        text: normalizedFact.text,
        confidence: normalizedFact.confidence,
        category: normalizedFact.category,
        tags: normalizedFact.tags ?? [],
        importance: normalizedFact.importance ?? null,
        sourceNodeId: nodeId,
        dialogueId: context.dialogueId,
        timestamp,
      };

      context.statementIndex.set(normalizedFact.factId, statement);
      statementsToAdd.push(statement);
    });

    if (statementsToAdd.length > 0) {
      context.statements.push(...statementsToAdd);
      this.eventBus.emit('interview:statement_recorded', {
        npcId: context.npcId,
        dialogueId: context.dialogueId,
        caseId: context.caseId,
        statements: statementsToAdd.map((statement) => ({ ...statement })),
        totalStatements: context.statements.length,
      });
    }
  }

  _handleNpcInterviewed(payload = {}) {
    const key = this._makeKey(payload.npcId, payload.dialogueId ?? payload.requestedDialogueId);
    const context = this.activeInterviews.get(key);
    if (!context) {
      return;
    }

    const testimony = this._finalizeTestimony(context, payload);
    this.activeInterviews.delete(key);

    if (!testimony) {
      return;
    }

    let recordedEntry = null;
    if (this.caseManager && typeof this.caseManager.recordTestimony === 'function') {
      recordedEntry = this.caseManager.recordTestimony(testimony);
    }

    this.eventBus.emit('interview:recorded', {
      caseId: testimony.caseId,
      dialogueId: testimony.dialogueId,
      requestedDialogueId: testimony.requestedDialogueId ?? null,
      npcId: testimony.npcId,
      npcName: testimony.npcName ?? null,
      approachId: testimony.approachId ?? null,
      approachLabel: testimony.approachLabel ?? null,
      statements: testimony.statements,
      contradictions: recordedEntry?.contradictions ?? [],
      testimonyId: recordedEntry?.id ?? testimony.id ?? null,
      recordedAt: testimony.recordedAt,
    });
  }

  _handleDialogueEnded(payload = {}) {
    const key = this._makeKey(payload.npcId, payload.dialogueId ?? payload.requestedDialogueId);
    if (!this.activeInterviews.has(key)) {
      return;
    }

    // If dialogue ended without npc:interviewed firing (e.g., aborted mid-stream),
    // drop the buffered context to avoid stale data.
    this.activeInterviews.delete(key);
  }

  _finalizeTestimony(context, payload) {
    const caseId = context.caseId ?? this._resolveCaseId(context.dialogueMetadata, payload);
    if (!caseId) {
      return null;
    }

    const statements = context.statements.map((statement) => ({
      factId: statement.factId,
      value: statement.value,
      text: statement.text,
      confidence: statement.confidence ?? null,
      category: statement.category ?? null,
      tags: Array.isArray(statement.tags) ? [...statement.tags] : [],
      importance: statement.importance ?? null,
      nodeId: statement.sourceNodeId ?? null,
      recordedAt: statement.timestamp ?? Date.now(),
    }));

    const approachId = context.approachId ?? normalizeApproachId(payload?.metadata?.approach);
    const approachLabel = context.approachLabel ?? getApproachLabel(approachId);

    const npcName =
      context.npcName ??
      normalizeString(payload.npcName) ??
      normalizeString(payload.speaker) ??
      null;

    return {
      id: `testimony_${context.npcId}_${Date.now()}`,
      caseId,
      npcId: context.npcId,
      npcName,
      dialogueId: context.dialogueId,
      requestedDialogueId: context.requestedDialogueId ?? null,
      approachId,
      approachLabel,
      approachHistory: [...context.approachHistory],
      statements,
      recordedAt: Date.now(),
      metadata: {
        startedAt: context.startedAt ?? null,
        endedAt: Date.now(),
        dialogueTags: context.dialogueMetadata?.tags ?? [],
      },
    };
  }
}
