import { questSlice } from './slices/questSlice.js';
import { storySlice } from './slices/storySlice.js';
import { factionSlice } from './slices/factionSlice.js';
import { tutorialSlice } from './slices/tutorialSlice.js';

const DEFAULT_ACTION_HISTORY = 50;

const sliceRegistry = {
  quest: questSlice,
  story: storySlice,
  faction: factionSlice,
  tutorial: tutorialSlice,
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
    };

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
          },
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

    return {
      storyFlags,
      quests,
      factions,
      tutorial,
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
