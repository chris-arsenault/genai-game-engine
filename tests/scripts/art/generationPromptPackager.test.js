import {
  buildPromptPackage,
  parsePromptMarkdown,
} from "../../../scripts/art/lib/generationPromptPackager.js";

const SAMPLE_MARKDOWN = `# Briefs\n\n## AR-001 – Deduction Board\n\n### Prompt: Background (\`image-ar-001-deduction-board-bg\`)\n\n\`\`\`\nmake deduction board\n\`\`\`\n\n### Prompt: Nodes (\"image-ar-001-clue-node-pack\")\n\n\`\`\`\nmake nodes\n\`\`\`\n\n## AR-003 – Player\n\n### Prompt\n\n\`\`\`\nplayer sprite sheet prompt\n\`\`\`\n\n## Negative Prompt\n\n\`\`\`\nno bad things\n\`\`\``;

describe("generationPromptPackager", () => {
  it("parses markdown into prompt entries", () => {
    const result = parsePromptMarkdown(SAMPLE_MARKDOWN);

    expect(result.entries).toHaveLength(3);
    expect(result.entries[0]).toEqual({
      arId: "AR-001",
      label: "Background",
      requestId: "image-ar-001-deduction-board-bg",
      prompt: "make deduction board",
    });

    expect(result.entries[1].requestId).toBe("image-ar-001-clue-node-pack");
    expect(result.entries[2].arId).toBe("AR-003");
    expect(result.entries[2].label).toBe("");
    expect(result.entries[2].prompt).toBe("player sprite sheet prompt");
    expect(result.negativePrompt).toBe("no bad things");
  });

  it("builds prompt package using manifest data", () => {
    const parsed = parsePromptMarkdown(SAMPLE_MARKDOWN);
    const manifest = [
      {
        id: "image-ar-001-deduction-board-bg",
        arId: "AR-001",
        title: "Board",
        usage: "ui",
        notes: "",
        status: "pending-sourcing",
      },
      {
        id: "image-ar-001-clue-node-pack",
        arId: "AR-001",
        title: "Nodes",
        usage: "sprites",
        notes: "",
        status: "pending-sourcing",
      },
      {
        id: "image-ar-003-player-kira-sprite",
        arId: "AR-003",
        title: "Player Sprite",
        usage: "sprites",
        notes: "",
        status: "pending-sourcing",
      },
    ];

    const bundle = buildPromptPackage(parsed, manifest);

    expect(bundle.requests).toHaveLength(3);
    expect(bundle.requests[2]).toMatchObject({
      requestId: "image-ar-003-player-kira-sprite",
      prompt: "player sprite sheet prompt",
      negativePrompt: "no bad things",
    });
    expect(bundle.metadata.totalRequests).toBe(3);
    expect(bundle.metadata.negativePrompt).toBe("no bad things");
  });

  it("supports filtering by AR id", () => {
    const parsed = parsePromptMarkdown(SAMPLE_MARKDOWN);
    const manifest = [
      {
        id: "image-ar-001-deduction-board-bg",
        arId: "AR-001",
        title: "Board",
        usage: "ui",
        notes: "",
        status: "pending-sourcing",
      },
      {
        id: "image-ar-001-clue-node-pack",
        arId: "AR-001",
        title: "Nodes",
        usage: "sprites",
        notes: "",
        status: "pending-sourcing",
      },
      {
        id: "image-ar-003-player-kira-sprite",
        arId: "AR-003",
        title: "Player Sprite",
        usage: "sprites",
        notes: "",
        status: "pending-sourcing",
      },
    ];

    const bundle = buildPromptPackage(parsed, manifest, { filter: ["AR-003"] });

    expect(bundle.requests).toHaveLength(1);
    expect(bundle.requests[0].requestId).toBe("image-ar-003-player-kira-sprite");
  });
});
