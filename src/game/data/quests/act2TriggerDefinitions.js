/**
 * Act 2 quest trigger seeds used to migrate Act 2 hub content onto the
 * standardized trigger schema.
 *
 * These definitions intentionally leave `migrated` false so the outstanding
 * migration report highlights remaining work until Act 2 scenes adopt the
 * toolkit.
 */
export const ACT2_CROSSROADS_TRIGGER_DEFINITIONS = Object.freeze([
  {
    id: 'act2_crossroads_checkpoint',
    questId: 'main-act2-crossroads',
    objectiveId: 'obj_enter_corporate_spires',
    areaId: 'corporate_spires_checkpoint',
    radius: 128,
    once: true,
    prompt: 'Present forged credentials at the checkpoint',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_arrival_checkpoint',
      unlocksMechanic: 'social_stealth',
      worldFlag: 'act2_corporate_access',
    },
  },
  {
    id: 'act2_crossroads_briefing',
    questId: 'main-act2-crossroads',
    objectiveId: 'obj_attend_zara_briefing',
    areaId: 'safehouse_briefing_table',
    radius: 110,
    once: false,
    prompt: "Review Zara's thread dossier",
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_briefing_selection',
      unlocksMechanic: 'thread_preview',
      branchingChoice: true,
    },
  },
  {
    id: 'act2_crossroads_thread_select',
    questId: 'main-act2-crossroads',
    objectiveId: 'obj_choose_investigation_thread',
    areaId: 'branch_selection_console',
    radius: 96,
    once: false,
    prompt: 'Select the next investigation thread',
    triggerType: 'quest_area',
    metadata: {
      narrativeBeat: 'act2_thread_commit',
      branchingChoice: true,
      telemetryTag: 'act2_thread_selection',
    },
  },
]);

/**
 * Register the Act 2 trigger definitions with a quest trigger registry.
 * @param {{ registerDefinition: Function, getTriggerDefinition: Function }} registry
 * @returns {string[]} List of trigger ids that were registered during this call.
 */
export function seedAct2CrossroadsTriggers(registry) {
  if (
    !registry ||
    typeof registry.registerDefinition !== 'function' ||
    typeof registry.getTriggerDefinition !== 'function'
  ) {
    return [];
  }

  const registered = [];

  for (const definition of ACT2_CROSSROADS_TRIGGER_DEFINITIONS) {
    if (!registry.getTriggerDefinition(definition.id)) {
      registry.registerDefinition({ ...definition });
      registered.push(definition.id);
    }
  }

  return registered;
}
