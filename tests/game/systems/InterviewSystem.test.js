import { InterviewSystem } from '../../../src/game/systems/InterviewSystem.js';
import { CaseManager } from '../../../src/game/managers/CaseManager.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { DialogueTree } from '../../../src/game/data/DialogueTree.js';

describe('InterviewSystem', () => {
  let eventBus;
  let caseManager;
  let interviewSystem;
  let dialogueTree;
  let emitted = [];

  beforeEach(() => {
    eventBus = new EventBus();
    emitted = [];

    const componentRegistry = {};

    caseManager = new CaseManager(eventBus);
    caseManager.registerCase(
      {
        id: 'case_test',
        title: 'Test Case',
        description: 'Testing interview logging',
        objectives: [],
        evidenceIds: [],
        requiredClues: [],
      },
      { activate: true }
    );

    dialogueTree = new DialogueTree({
      id: 'interview_test',
      npcId: 'npc_test',
      startNode: 'start',
      nodes: {
        start: {
          speaker: 'Test NPC',
          text: 'We need to talk.',
          metadata: {
            tags: ['interview'],
            caseId: 'case_test',
          },
          choices: [
            {
              text: 'Press hard',
              nextNode: 'detail',
              metadata: { approach: 'aggressive' },
            },
          ],
        },
        detail: {
          speaker: 'Test NPC',
          text: 'They arrived at 01:18 and fled at 02:41.',
          metadata: {
            testimonyFacts: [
              {
                factId: 'fact.timeline',
                value: 'van_0118_0241',
                text: 'They arrived at 01:18 and fled at 02:41.',
                confidence: 'high',
                category: 'timeline',
              },
            ],
          },
          nextNode: null,
        },
      },
      metadata: {
        caseId: 'case_test',
        tags: ['interview'],
      },
    });

    const dialogueSystemStub = {
      getDialogueTree: jest.fn(() => dialogueTree),
    };

    eventBus.on('*', ({ eventType, ...payload }) => {
      emitted.push({ eventType, payload });
    });

    interviewSystem = new InterviewSystem(componentRegistry, eventBus, {
      caseManager,
      dialogueSystem: dialogueSystemStub,
    });
    interviewSystem.init();
  });

  afterEach(() => {
    interviewSystem.cleanup();
  });

  function runInterview({
    npcId,
    dialogueId = 'interview_test',
    approach = 'aggressive',
    factId = 'fact.timeline',
    value,
    text,
  }) {
    const timestamp = Date.now();

    eventBus.emit('dialogue:started', {
      npcId,
      dialogueId,
      requestedDialogueId: dialogueId,
      speaker: 'Test NPC',
      startedAt: timestamp,
    });

    eventBus.emit('dialogue:choice', {
      npcId,
      dialogueId,
      nodeId: 'start',
      choiceIndex: 0,
      metadata: { approach },
      timestamp: timestamp + 1,
    });

    eventBus.emit('dialogue:node_changed', {
      npcId,
      dialogueId,
      nodeId: 'detail',
      text,
      nodeMetadata: {
        testimonyFacts: [
          {
            factId,
            value,
            text,
            confidence: 'high',
          },
        ],
      },
      timestamp: timestamp + 2,
    });

    eventBus.emit('npc:interviewed', {
      npcId,
      dialogueId,
    });
  }

  it('records testimony with approach and statements', () => {
    runInterview({
      npcId: 'npc_test',
      value: 'van_0118_0241',
      text: 'They arrived at 01:18 and fled at 02:41.',
    });

    const caseFile = caseManager.getCase('case_test');
    expect(caseFile.testimonies).toHaveLength(1);
    const testimony = caseFile.testimonies[0];
    expect(testimony.approachId).toBe('aggressive');
    expect(testimony.statements).toHaveLength(1);
    expect(testimony.statements[0].factId).toBe('fact.timeline');
    expect(testimony.statements[0].value).toBe('van_0118_0241');

  });

  it('detects contradictions across testimonies', () => {
    runInterview({
      npcId: 'npc_test',
      value: 'van_0118_0241',
      text: 'They arrived at 01:18 and fled at 02:41.',
    });

    runInterview({
      npcId: 'npc_second',
      value: 'van_0130_0255',
      text: 'No, it was closer to 01:30 and 02:55.',
      approach: 'diplomatic',
    });

    const caseFile = caseManager.getCase('case_test');
    expect(caseFile.testimonies).toHaveLength(2);

    expect(caseFile.testimonyContradictions.length).toBeGreaterThan(0);

    const earlier = caseFile.testimonies[0];
    const later = caseFile.testimonies[1];
    expect(earlier.contradictions.length).toBe(1);
    expect(later.contradictions.length).toBe(1);
    expect(earlier.contradictions[0].withTestimonyId).toBe(later.id);
    expect(later.contradictions[0].withTestimonyId).toBe(earlier.id);
  });
});
