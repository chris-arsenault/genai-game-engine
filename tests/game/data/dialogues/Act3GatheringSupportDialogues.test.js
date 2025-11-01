import { registerAct3GatheringSupportDialogues, ACT3_GATHERING_SUPPORT_DIALOGUES } from '../../../../src/game/data/dialogues/Act3GatheringSupportDialogues.js';

class StubDialogueSystem {
  constructor() {
    this.dialogues = [];
  }

  registerDialogueTree(tree) {
    this.dialogues.push(tree);
  }
}

describe('Act3GatheringSupportDialogues', () => {
  test('registers all stance milestone dialogues', () => {
    const system = new StubDialogueSystem();
    const registered = registerAct3GatheringSupportDialogues(system);

    expect(registered).toHaveLength(ACT3_GATHERING_SUPPORT_DIALOGUES.length);
    expect(system.dialogues).toHaveLength(ACT3_GATHERING_SUPPORT_DIALOGUES.length);

    const branchIds = new Set(
      registered.map((tree) => tree.metadata?.branchId ?? null).filter(Boolean)
    );
    expect(branchIds).toEqual(new Set(['opposition', 'support', 'alternative', 'shared']));
  });

  test('milestone node emits quest automation events', () => {
    const sampleDialogue = ACT3_GATHERING_SUPPORT_DIALOGUES.find(
      (tree) => tree.metadata?.branchId === 'opposition'
    );
    expect(sampleDialogue).toBeDefined();
    if (!sampleDialogue) {
      return;
    }

    const commitNode = sampleDialogue.getNode('commit');
    expect(commitNode).toBeTruthy();
    expect(commitNode.consequences).toBeTruthy();
    expect(commitNode.consequences.events).toContain('act3:gathering_support:milestone');
    expect(commitNode.consequences.data.questId).toBe('main-act3-gathering-support');
    expect(commitNode.consequences.data.branchId).toBe('opposition');
    expect(commitNode.consequences.data.milestoneId).toBe(
      sampleDialogue.metadata.milestoneId
    );
  });
});
