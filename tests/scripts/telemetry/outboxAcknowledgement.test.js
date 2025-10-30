import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  appendIngestionStatus,
  collectStatus,
  recordAcknowledgement,
} from "../../../scripts/telemetry/lib/outboxAcknowledgement.js";

describe("outboxAcknowledgement", () => {
  it("appends ingestion status to existing section", () => {
    const content = `# Title\n\n## Ingestion Status\n\n- Existing entry\n\n## Attachments\n`; // eslint-disable-line max-len
    const updated = appendIngestionStatus(
      content,
      "2025-10-30: Analytics confirmed via email (Casey)",
    );

    expect(updated).toContain(
      "- 2025-10-30: Analytics confirmed via email (Casey)",
    );
    const attachmentIndex = updated.indexOf("## Attachments");
    const statusIndex = updated.indexOf(
      "- 2025-10-30: Analytics confirmed via email (Casey)",
    );
    expect(statusIndex).toBeLessThan(attachmentIndex);
  });

  it("records acknowledgement and updates files", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "telemetry-ack-test-"));
    const analyticsDir = path.join(tmp, "analytics");
    const outboxDir = path.join(analyticsDir, "outbox");
    const packageDir = path.join(outboxDir, "sample-package");
    await fs.mkdir(packageDir, { recursive: true });

    const readmePath = path.join(packageDir, "README.md");
    await fs.writeFile(
      readmePath,
      "# Package\n\n## Ingestion Status\n\n- Pending\n",
      "utf8",
    );

    const acknowledgement = await recordAcknowledgement({
      analyticsDir,
      baseDir: outboxDir,
      label: "sample-package",
      acknowledgedBy: "Avery (Analytics)",
      method: "email",
      note: "Logged in analytics tracker",
      now: new Date("2025-10-30T10:00:00Z"),
    });

    expect(acknowledgement.method).toBe("email");

    const ackFile = JSON.parse(
      await fs.readFile(path.join(packageDir, "acknowledgement.json"), "utf8"),
    );
    expect(ackFile.acknowledgedBy).toBe("Avery (Analytics)");

    const updatedReadme = await fs.readFile(readmePath, "utf8");
    expect(updatedReadme).toContain(
      "2025-10-30: Analytics acknowledged via email (Avery (Analytics))",
    );

    const log = JSON.parse(
      await fs.readFile(path.join(analyticsDir, "acknowledgements.json"), "utf8"),
    );
    expect(log).toHaveLength(1);
    expect(log[0].label).toBe("sample-package");

    const status = await collectStatus(outboxDir);
    expect(status[0].acknowledged).toBe(true);
  });
});
