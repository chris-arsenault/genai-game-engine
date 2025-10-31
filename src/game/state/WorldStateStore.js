import { questSlice } from './slices/questSlice.js';
import { storySlice } from './slices/storySlice.js';
import { factionSlice } from './slices/factionSlice.js';
import { tutorialSlice } from './slices/tutorialSlice.js';
import { dialogueSlice } from './slices/dialogueSlice.js';
import { inventorySlice } from './slices/inventorySlice.js';
import { districtSlice } from './slices/districtSlice.js';
import { npcSlice } from './slices/npcSlice.js';

const DEFAULT_ACTION_HISTORY = 50;
const DEFAULT_DIALOGUE_HISTORY_LIMIT = 10;

const sliceRegistry = {
  quest: questSlice,
  story: storySlice,
  faction: factionSlice,
  tutorial: tutorialSlice,
  dialogue: dialogueSlice,
  inventory: inventorySlice,
  npc: npcSlice,
  district: districtSlice,
};

function isDevEnvironment() {
  if (typeof __DEV__ !== 'undefined') {
    return Boolean(__DEV__);
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'production';
  }

  return true;
}

/**
 * Hybrid event-sourced world state store. Subscribes to EventBus and keeps
 * deterministic snapshots of narrative-critical systems.
 */
export class WorldStateStore {
  /**
   * @param {EventBus} eventBus
   * @param {Object} config
   */
  constructor(eventBus, config = {}) {
    if (!eventBus) {
      throw new Error('WorldStateStore requires an EventBus instance');
    }

    this.eventBus = eventBus;
    this.config = {
      actionHistoryLimit: config.actionHistoryLimit ?? DEFAULT_ACTION_HISTORY,
      enableDebug: config.enableDebug ?? isDevEnvironment(),
      dialogueHistoryLimit: config.dialogueHistoryLimit ?? DEFAULT_DIALOGUE_HISTORY_LIMIT,
      dialogueTranscriptEnabled: config.dialogueTranscriptEnabled ?? true,
      tutorialPromptHistoryLimit: config.tutorialPromptHistoryLimit ?? 5,
      tutorialPromptSnapshotLimit: config.tutorialPromptSnapshotLimit ?? 10,
    };

    if (typeof dialogueSlice.configure === 'function') {
      dialogueSlice.configure({
        historyLimit: this.config.dialogueHistoryLimit,
        transcriptEnabled: this.config.dialogueTranscriptEnabled,
      });
    }

    if (typeof tutorialSlice.configure === 'function') {
      tutorialSlice.configure({
        promptHistoryLimit: this.config.tutorialPromptHistoryLimit,
        promptHistorySnapshotLimit: this.config.tutorialPromptSnapshotLimit,
      });
    }

    this.state = {};
    this.listeners = new Set();
    this.actionHistory = [];
    this.subscriptions = [];
    this.initialized = false;
  }

  /**
   * Initialize store and attach event listeners.
   */
  init() {
    if (this.initialized) {
      return;
    }

    for (const [key, slice] of Object.entries(sliceRegistry)) {
      this.state[key] = slice.getInitialState();
    }

    this.attachEventSubscriptions();
    this.initialized = true;
  }

  /**
   * Subscribe to relevant EventBus topics.
   */
  attachEventSubscriptions() {
    this.detachEventSubscriptions();

    const subscriptions = [
      this.eventBus.on('quest:registered', (payload) => {
        this.dispatch({
          type: 'QUEST_REGISTERED',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            title: payload.title,
            type: payload.type,
            description: payload.description,
            act: payload.act,
            objectives: payload.objectives,
            rewards: payload.rewards,
            branches: payload.branches,
            autoStart: payload.autoStart,
            metadata: payload.metadata,
          },
        });
      }),

      this.eventBus.on('quest:started', (payload) => {
        this.dispatch({
          type: 'QUEST_STARTED',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            title: payload.title,
            type: payload.type,
          },
        });
      }),

      this.eventBus.on('quest:completed', (payload) => {
        this.dispatch({
          type: 'QUEST_COMPLETED',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            title: payload.title,
            type: payload.type,
            rewards: payload.rewards,
          },
        });
      }),

      this.eventBus.on('quest:failed', (payload) => {
        this.dispatch({
          type: 'QUEST_FAILED',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            reason: payload.reason,
          },
        });
      }),

      this.eventBus.on('objective:progress', (payload) => {
        this.dispatch({
          type: 'OBJECTIVE_PROGRESS',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            objectiveId: payload.objectiveId,
            progress: payload.progress,
            target: payload.target,
          },
        });
      }),

      this.eventBus.on('objective:completed', (payload) => {
        this.dispatch({
          type: 'OBJECTIVE_COMPLETED',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            objectiveId: payload.objectiveId,
            target: payload.target,
          },
        });
      }),

      this.eventBus.on('objective:blocked', (payload = {}) => {
        this.dispatch({
          type: 'OBJECTIVE_BLOCKED',
          domain: 'quest',
          payload: {
            questId: payload.questId,
            questTitle: payload.questTitle,
            questType: payload.questType,
            objectiveId: payload.objectiveId,
            objectiveDescription: payload.objectiveDescription,
            blockedMessage: payload.blockedMessage,
            reason: payload.reason,
            requirement: payload.requirement,
            requirements: payload.requirements,
            eventType: payload.eventType,
            eventData: payload.eventData,
          },
        });
      }),

      this.eventBus.on('quest:npc_availability', (payload = {}) => {
        const objectives = Array.isArray(payload.objectives)
          ? payload.objectives.map((entry) => ({
              questId: entry?.questId ?? null,
              questTitle: entry?.questTitle ?? null,
              questType: entry?.questType ?? null,
              objectiveId: entry?.objectiveId ?? null,
              objectiveTitle: entry?.objectiveTitle ?? null,
              reason: entry?.reason ?? null,
              requirement: entry?.requirement ?? null,
              message: entry?.message ?? null,
              recordedAt: entry?.recordedAt ?? null,
            }))
          : [];

        const updatedAt = payload.updatedAt ?? Date.now();

        this.dispatch({
          type: 'QUEST_NPC_AVAILABILITY',
          domain: 'quest',
          timestamp: updatedAt,
          payload: {
            npcId: payload.npcId ?? null,
            npcName: payload.npcName ?? null,
            factionId: payload.factionId ?? null,
            tag: payload.tag ?? null,
            entityId: payload.entityId ?? null,
            available: Boolean(payload.available),
            updatedAt,
            reason: payload.reason ?? null,
            objectives,
          },
        });
      }),

      this.eventBus.on('story:flag:changed', (payload) => {
        this.dispatch({
          type: 'STORY_FLAG_SET',
          domain: 'story',
          payload: {
            flagId: payload.flagId,
            value: payload.newValue,
            metadata: payload.metadata,
            timestamp: payload.timestamp,
          },
        });
      }),

      this.eventBus.on('story:flag:removed', (payload) => {
        this.dispatch({
          type: 'STORY_FLAG_REMOVED',
          domain: 'story',
          payload: {
            flagId: payload.flagId,
          },
        });
      }),

      this.eventBus.on('inventory:item_added', (payload) => {
        this.dispatch({
          type: 'INVENTORY_ITEM_ADDED',
          domain: 'inventory',
          payload,
        });
      }),

      this.eventBus.on('inventory:item_updated', (payload) => {
        this.dispatch({
          type: 'INVENTORY_ITEM_UPDATED',
          domain: 'inventory',
          payload,
        });
      }),

      this.eventBus.on('inventory:item_removed', (payload) => {
        this.dispatch({
          type: 'INVENTORY_ITEM_REMOVED',
          domain: 'inventory',
          payload,
        });
      }),

      this.eventBus.on('inventory:equipped', (payload) => {
        this.dispatch({
          type: 'INVENTORY_EQUIPPED',
          domain: 'inventory',
          payload,
        });
      }),

      this.eventBus.on('inventory:cleared', () => {
        this.dispatch({
          type: 'INVENTORY_CLEAR',
          domain: 'inventory',
        });
      }),

      this.eventBus.on('inventory:selection_changed', (payload = {}) => {
        this.dispatch({
          type: 'INVENTORY_SELECTION_CHANGED',
          domain: 'inventory',
          payload: {
            itemId: typeof payload.itemId === 'string' ? payload.itemId : null,
            index: Number.isInteger(payload.index) ? payload.index : null,
            source: payload.source ?? 'inventoryOverlay',
          },
        });
      }),

      this.eventBus.on('reputation:changed', (payload) => {
        this.dispatch({
          type: 'FACTION_REPUTATION_CHANGED',
          domain: 'faction',
          payload: {
            factionId: payload.factionId,
            factionName: payload.factionName,
            deltaFame: payload.deltaFame,
            deltaInfamy: payload.deltaInfamy,
            newFame: payload.newFame,
            newInfamy: payload.newInfamy,
            reason: payload.reason,
          },
        });
      }),

      this.eventBus.on('faction:attitude_changed', (payload) => {
        this.dispatch({
          type: 'FACTION_ATTITUDE_CHANGED',
          domain: 'faction',
          payload: {
            factionId: payload.factionId,
            factionName: payload.factionName,
            newAttitude: payload.newAttitude,
            oldAttitude: payload.oldAttitude,
            cascade: payload.cascade,
            source: payload.source,
            sourceFactionName: payload.sourceFactionName,
          },
        });
      }),

      this.eventBus.on('faction:reputation_reset', (payload = {}) => {
        this.dispatch({
          type: 'FACTION_REPUTATION_RESET',
          domain: 'faction',
          payload: {
            reason: payload.reason,
            initiatedBy: payload.initiatedBy,
          },
        });
      }),

      this.eventBus.on('faction:member_removed', (payload = {}) => {
        this.dispatch({
          type: 'FACTION_MEMBER_REMOVED',
          domain: 'faction',
          payload: {
            factionId: payload.factionId ?? null,
            factionName: payload.factionName ?? null,
            npcId: payload.npcId ?? null,
            entityId: payload.entityId ?? null,
            tag: payload.tag ?? null,
            removedAt: payload.removedAt ?? Date.now(),
          },
        });
      }),

      this.eventBus.on('tutorial:started', (payload) => {
        this.dispatch({
          type: 'TUTORIAL_STARTED',
          domain: 'tutorial',
          payload: {
            totalSteps: payload.totalSteps,
          },
        });
      }),

      this.eventBus.on('tutorial:step_started', (payload) => {
        this.dispatch({
          type: 'TUTORIAL_STEP_STARTED',
          domain: 'tutorial',
          payload: {
            stepId: payload.stepId,
            stepIndex: payload.stepIndex,
            totalSteps: payload.totalSteps,
            title: payload.title,
            description: payload.description,
            highlight: payload.highlight,
            position: payload.position,
            canSkip: payload.canSkip,
            controlHint: payload.controlHint ?? null,
          },
        });
      }),

      this.eventBus.on('tutorial:control_hint_updated', (payload = {}) => {
        this.dispatch({
          type: 'TUTORIAL_CONTROL_HINT_UPDATED',
          domain: 'tutorial',
          payload: {
            stepId: payload.stepId ?? null,
            controlHint: payload.controlHint ?? null,
          },
          timestamp: payload.updatedAt ?? Date.now(),
        });
      }),

      this.eventBus.on('tutorial:step_completed', (payload) => {
        this.dispatch({
          type: 'TUTORIAL_STEP_COMPLETED',
          domain: 'tutorial',
          payload: {
            stepId: payload.stepId,
            stepIndex: payload.stepIndex,
          },
        });
      }),

      this.eventBus.on('tutorial:completed', (payload) => {
        this.dispatch({
          type: 'TUTORIAL_COMPLETED',
          domain: 'tutorial',
          payload: {
            totalSteps: payload.totalSteps,
            completedSteps: payload.completedSteps,
          },
        });
      }),

      this.eventBus.on('tutorial:skipped', (payload) => {
        this.dispatch({
          type: 'TUTORIAL_SKIPPED',
          domain: 'tutorial',
          payload: {
            stepId: payload.stepId,
            stepIndex: payload.stepIndex,
          },
        });
      }),

      this.eventBus.on('dialogue:started', (payload) => {
        this.dispatch({
          type: 'DIALOGUE_STARTED',
          domain: 'dialogue',
          payload: {
            npcId: payload.npcId,
            dialogueId: payload.dialogueId,
            nodeId: payload.nodeId,
            speaker: payload.speaker,
            text: payload.text,
            choices: payload.choices,
            hasChoices: payload.hasChoices,
            canAdvance: payload.canAdvance,
            metadata: payload.metadata,
            startedAt: payload.startedAt,
          },
        });
      }),

      this.eventBus.on('dialogue:node_changed', (payload) => {
        this.dispatch({
          type: 'DIALOGUE_NODE_CHANGED',
          domain: 'dialogue',
          payload: {
            npcId: payload.npcId,
            dialogueId: payload.dialogueId,
            nodeId: payload.nodeId,
            speaker: payload.speaker,
            text: payload.text,
            choices: payload.choices,
            hasChoices: payload.hasChoices,
            canAdvance: payload.canAdvance,
            metadata: payload.metadata,
          },
        });
      }),

      this.eventBus.on('dialogue:choice', (payload) => {
        this.dispatch({
          type: 'DIALOGUE_CHOICE_MADE',
          domain: 'dialogue',
          payload: {
            npcId: payload.npcId,
            dialogueId: payload.dialogueId,
            nodeId: payload.nodeId,
            choiceId: payload.choiceId ?? payload.choice?.id ?? payload.choiceIndex ?? null,
            choiceText: payload.choiceText ?? payload.choice?.text ?? null,
          },
        });
      }),

      this.eventBus.on('dialogue:ended', (payload) => {
        this.dispatch({
          type: 'DIALOGUE_ENDED',
          domain: 'dialogue',
          payload: {
            npcId: payload.npcId,
            dialogueId: payload.dialogueId,
            nodeId: payload.nodeId,
          },
        });
      }),

      this.eventBus.on('dialogue:completed', (payload) => {
        this.dispatch({
          type: 'DIALOGUE_COMPLETED',
          domain: 'dialogue',
          payload: {
            npcId: payload.npcId,
            dialogueId: payload.dialogueId,
            nodeId: payload.nodeId,
            choiceId: payload.choiceId,
          },
        });
      }),

      this.eventBus.on('npc:registered', (payload = {}) => {
        const npcId = payload.npcId ?? payload.id ?? null;
        if (!npcId) return;
        this.dispatch({
          type: 'NPC_REGISTERED',
          domain: 'npc',
          payload: {
            npcId,
            npcName: payload.npcName ?? payload.name ?? null,
            npcFaction: payload.npcFaction ?? payload.factionId ?? null,
          },
        });
      }),

      this.eventBus.on('npc:interviewed', (payload = {}) => {
        const npcId = payload.npcId ?? null;
        if (!npcId) return;
        this.dispatch({
          type: 'NPC_INTERVIEWED',
          domain: 'npc',
          payload: {
            npcId,
            npcName: payload.npcName ?? null,
            dialogueId: payload.dialogueId ?? null,
          },
        });
      }),

      this.eventBus.on('npc:recognized_player', (payload = {}) => {
        const npcId = payload.npcId ?? null;
        if (!npcId) return;
        this.dispatch({
          type: 'NPC_RECOGNIZED_PLAYER',
          domain: 'npc',
          payload: {
            npcId,
            npcName: payload.npcName ?? null,
            npcFaction: payload.npcFaction ?? null,
            playerKnown: payload.playerKnown ?? true,
          },
        });
      }),

      this.eventBus.on('npc:witnessed_crime', (payload = {}) => {
        const npcId = payload.npcId ?? null;
        if (!npcId) return;
        this.dispatch({
          type: 'NPC_WITNESSED_CRIME',
          domain: 'npc',
          payload: {
            npcId,
            npcName: payload.npcName ?? null,
            crimeType: payload.crimeType ?? null,
            severity: payload.severity ?? null,
          },
        });
      }),

      this.eventBus.on('npc:became_suspicious', (payload = {}) => {
        const npcId = payload.npcId ?? null;
        if (!npcId) return;
        this.dispatch({
          type: 'NPC_BECAME_SUSPICIOUS',
          domain: 'npc',
          payload: {
            npcId,
            npcName: payload.npcName ?? null,
            reason: payload.reason ?? null,
          },
        });
      }),

      this.eventBus.on('npc:alerted', (payload = {}) => {
        const npcId = payload.npcId ?? null;
        if (!npcId) return;
        this.dispatch({
          type: 'NPC_ALERTED',
          domain: 'npc',
          payload: {
            npcId,
            reason: payload.reason ?? null,
          },
        });
      }),

      this.eventBus.on('district:registered', (payload = {}) => {
        const districtId = payload.districtId ?? payload.id ?? null;
        if (!districtId) return;
        this.dispatch({
          type: 'DISTRICT_REGISTERED',
          domain: 'district',
          payload: {
            districtId,
            definition: payload.definition ?? null,
          },
        });
      }),

      this.eventBus.on('district:control_changed', (payload = {}) => {
        const districtId = payload.districtId ?? null;
        const controllingFaction = payload.controllingFaction ?? payload.factionId ?? null;
        if (!districtId || !controllingFaction) return;
        this.dispatch({
          type: 'DISTRICT_CONTROL_CHANGED',
          domain: 'district',
          payload: {
            districtId,
            controllingFaction,
            source: payload.source ?? null,
          },
        });
      }),

      this.eventBus.on('district:stability_set', (payload = {}) => {
        const districtId = payload.districtId ?? null;
        if (!districtId || typeof payload.stability !== 'number') return;
        this.dispatch({
          type: 'DISTRICT_STABILITY_SET',
          domain: 'district',
          payload: {
            districtId,
            stabilityValue: payload.stability,
            rating: payload.rating ?? null,
            source: payload.source ?? null,
          },
        });
      }),

      this.eventBus.on('district:stability_adjusted', (payload = {}) => {
        const districtId = payload.districtId ?? null;
        if (!districtId || typeof payload.delta !== 'number') return;
        this.dispatch({
          type: 'DISTRICT_STABILITY_ADJUSTED',
          domain: 'district',
          payload: {
            districtId,
            delta: payload.delta,
            source: payload.source ?? null,
          },
        });
      }),

      this.eventBus.on('district:restriction_set', (payload = {}) => {
        const districtId = payload.districtId ?? null;
        const restrictionId = payload.restrictionId ?? payload.id ?? null;
        if (!districtId || !restrictionId || typeof payload.active !== 'boolean') return;
        this.dispatch({
          type: 'DISTRICT_RESTRICTION_SET',
          domain: 'district',
          payload: {
            districtId,
            restrictionId,
            active: Boolean(payload.active),
            metadata: payload.metadata ?? null,
          },
        });
      }),

      this.eventBus.on('district:route_unlocked', (payload = {}) => {
        const districtId = payload.districtId ?? null;
        const routeId = payload.routeId ?? payload.id ?? null;
        if (!districtId || !routeId) return;
        this.dispatch({
          type: 'DISTRICT_ROUTE_UNLOCKED',
          domain: 'district',
          payload: {
            districtId,
            routeId,
            source: payload.source ?? null,
          },
        });
      }),

      this.eventBus.on('district:fast_travel_set', (payload = {}) => {
        const districtId = payload.districtId ?? null;
        if (!districtId || typeof payload.enabled !== 'boolean') return;
        this.dispatch({
          type: 'DISTRICT_FAST_TRAVEL_SET',
          domain: 'district',
          payload: {
            districtId,
            enabled: Boolean(payload.enabled),
          },
        });
      }),
    ];

    this.subscriptions = subscriptions.filter(Boolean);
  }

  /**
   * Detach existing event subscriptions.
   */
  detachEventSubscriptions() {
    if (!this.subscriptions) return;
    for (const unsubscribe of this.subscriptions) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this.subscriptions = [];
  }

  /**
   * Dispatch an action through the store.
   * @param {Object} action
   */
  dispatch(action) {
    if (!action || typeof action !== 'object') {
      throw new Error('WorldStateStore.dispatch requires an action object');
    }

    if (!action.type) {
      throw new Error('WorldStateStore.dispatch requires action.type');
    }

    const timestamp = action.timestamp ?? Date.now();
    const domain = action.domain;

    try {
      if (domain === 'world') {
        let didChange = false;
        for (const [key, slice] of Object.entries(sliceRegistry)) {
          const previous = this.state[key];
          const next = slice.reducer(previous, action);
          if (next !== previous) {
            this.state[key] = next;
            didChange = true;
          }
        }
        if (didChange) {
          this.recordAction(action, timestamp);
          this.emitUpdate(action);
        }
        return;
      }

      const slice = sliceRegistry[domain];
      if (!slice) {
        throw new Error(`Unknown world state domain: ${domain}`);
      }

      const previous = this.state[domain];
      const next = slice.reducer(previous, { ...action, timestamp });
      if (next !== previous) {
        this.state = { ...this.state, [domain]: next };
        this.recordAction(action, timestamp);
        this.emitUpdate(action);
      } else {
        // Still record action for traceability even if reducer no-ops
        this.recordAction(action, timestamp);
      }
    } catch (error) {
      console.error('[WorldStateStore] Dispatch error', error);
      this.eventBus.emit('worldstate:error', {
        action,
        error: error.message,
      });
    }
  }

  /**
   * Register update listener.
   * @param {Function} callback
   * @returns {Function} unsubscribe
   */
  onUpdate(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Emit update event and listener callbacks.
   * @param {Object} action
   */
  emitUpdate(action) {
    this.eventBus.emit('worldstate:action', action);
    this.eventBus.emit('worldstate:updated', {
      state: this.state,
      lastAction: action,
    });

    for (const listener of this.listeners) {
      try {
        listener(this.state, action);
      } catch (error) {
        console.error('[WorldStateStore] Listener error', error);
      }
    }
  }

  /**
   * Append action to history with limit.
   * @param {Object} action
   * @param {number} timestamp
   */
  recordAction(action, timestamp) {
    if (!this.config.enableDebug) {
      return;
    }

    const entry = {
      ...action,
      timestamp,
    };

    this.actionHistory.push(entry);

    const { actionHistoryLimit } = this.config;
    if (this.actionHistory.length > actionHistoryLimit) {
      this.actionHistory.splice(0, this.actionHistory.length - actionHistoryLimit);
    }
  }

  /**
   * Select data from state using memoized selector.
   * @param {Function} selector
   * @param {...*} args
   * @returns {*}
   */
  select(selector, ...args) {
    return selector(this.state, ...args);
  }

  /**
   * Get raw world state.
   * @returns {Object}
   */
  getState() {
    return this.state;
  }

  /**
   * Produce serializable snapshot for saves/debugging.
   * @returns {Object}
   */
  snapshot() {
    const storyFlags = sliceRegistry.story.serialize(this.state.story);
    const quests = sliceRegistry.quest.serialize(this.state.quest);
    const factions = sliceRegistry.faction.serialize(this.state.faction);
    const tutorial = sliceRegistry.tutorial.serialize(this.state.tutorial);
    const dialogue = sliceRegistry.dialogue.serialize(this.state.dialogue);
    const inventory = sliceRegistry.inventory.serialize(this.state.inventory);
    const districts = sliceRegistry.district.serialize(this.state.district);
    const npcs = sliceRegistry.npc.serialize(this.state.npc);

    return {
      storyFlags,
      quests,
      factions,
      tutorial,
      dialogue,
      inventory,
      districts,
      npcs,
      tutorialComplete: Boolean(tutorial?.completed),
    };
  }

  /**
   * Hydrate state from snapshot.
   * @param {Object} snapshot
   */
  hydrate(snapshot) {
    if (!snapshot) return;

    const normalizedPayload = {
      quests: snapshot.quests ?? {},
      story: snapshot.storyFlags ?? {},
      factions: snapshot.factions ?? {},
      tutorial: snapshot.tutorial ?? {},
      dialogue: snapshot.dialogue ?? {},
      inventory: snapshot.inventory ?? {},
      districts: snapshot.districts ?? {},
      npc: snapshot.npcs ?? snapshot.npc ?? {},
    };

    this.dispatch({
      type: 'WORLDSTATE_HYDRATE',
      domain: 'world',
      payload: normalizedPayload,
    });
  }

  /**
   * Debug helper for console inspection.
   */
  debug() {
    if (!this.config.enableDebug) {
      console.warn('[WorldStateStore] Debug output disabled in production mode');
      return;
    }

    // eslint-disable-next-line no-console
    console.groupCollapsed?.('[WorldStateStore] Snapshot');
    // eslint-disable-next-line no-console
    console.log(this.snapshot());
    if (this.actionHistory.length) {
      // eslint-disable-next-line no-console
      console.log('Recent actions:', [...this.actionHistory].reverse());
    }
    // eslint-disable-next-line no-console
    console.groupEnd?.();
  }

  /**
   * Cleanup subscriptions.
   */
  destroy() {
    this.detachEventSubscriptions();
    this.listeners.clear();
    this.actionHistory = [];
    this.initialized = false;
  }
}

export default WorldStateStore;
