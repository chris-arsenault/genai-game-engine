import {
  registerAct3ZenithInfiltrationDialogues,
  ACT3_ZENITH_INFILTRATION_DIALOGUES,
} from '../../../../src/game/data/dialogues/Act3ZenithInfiltrationDialogues.js';
import { GameConfig } from '../../../../src/game/config/GameConfig.js';

class StubDialogueSystem {
  constructor() {
    this.dialogues = [];
  }

  registerDialogueTree(tree) {
    this.dialogues.push(tree);
  }
}

describe('Act3ZenithInfiltrationDialogues', () => {
  test('registers every shared and stance-specific Zenith stage dialogue', () => {
    const expectedShared =
      GameConfig?.narrative?.act3?.zenithInfiltration?.sharedStages?.length ?? 0;
    const expectedStance = (GameConfig?.narrative?.act3?.zenithInfiltration?.stances ?? []).reduce(
      (count, stance) => count + (stance?.stages?.length ?? 0),
      0
    );
    const expectedCount = expectedShared + expectedStance;

    const system = new StubDialogueSystem();
    const registered = registerAct3ZenithInfiltrationDialogues(system);

    expect(ACT3_ZENITH_INFILTRATION_DIALOGUES).toHaveLength(expectedCount);
    expect(system.dialogues).toHaveLength(expectedCount);
    expect(registered).toHaveLength(expectedCount);

    const branchIds = new Set(registered.map((tree) => tree.metadata?.branchId ?? null));
    expect(branchIds.has('shared')).toBe(true);
    expect(branchIds.has('opposition')).toBe(true);
    expect(branchIds.has('support')).toBe(true);
    expect(branchIds.has('alternative')).toBe(true);
  });

  test('stage commit node emits quest progression payloads with context metadata', () => {
    const supportDialogue = ACT3_ZENITH_INFILTRATION_DIALOGUES.find(
      (tree) => tree.metadata?.stageId === 'support_overclock_relays'
    );
    expect(supportDialogue).toBeDefined();
    if (!supportDialogue) {
      return;
    }

    const commitNode = supportDialogue.getNode('commit');
    expect(commitNode).toBeTruthy();
    expect(commitNode?.consequences?.events).toContain('act3:zenith_infiltration:stage');
    expect(commitNode?.consequences?.data?.questId).toBe('main-act3-zenith-infiltration');
    expect(commitNode?.consequences?.data?.stageId).toBe('support_overclock_relays');
    expect(commitNode?.consequences?.data?.branchId).toBe('support');
    expect(commitNode?.consequences?.data?.approachId).toBe('assault');
    expect(commitNode?.consequences?.setFlags).toContain('act3_zenith_support_relays_overclocked');
  });

  test('shared stage dialogue keeps stance-neutral payload data', () => {
    const sharedDialogue = ACT3_ZENITH_INFILTRATION_DIALOGUES.find(
      (tree) => tree.metadata?.stageId === 'shared_archive_elevator'
    );
    expect(sharedDialogue).toBeDefined();
    if (!sharedDialogue) {
      return;
    }

    const commitNode = sharedDialogue.getNode('commit');
    expect(commitNode?.consequences?.data?.branchId).toBe('shared');
    expect(commitNode?.consequences?.data?.stanceId).toBeNull();
    expect(commitNode?.consequences?.data?.stanceFlag).toBeNull();
  });
});
