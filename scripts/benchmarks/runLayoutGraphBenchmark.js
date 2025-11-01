#!/usr/bin/env node
/**
 * LayoutGraph Benchmark Runner
 *
 * Exercises LayoutGraph operations across increasing node counts to
 * monitor performance regressions outside Jest. Generates a JSON report
 * with timing statistics and budget comparisons against the 16 ms frame target.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { performance } from 'node:perf_hooks';
import { LayoutGraph } from '../../src/engine/procedural/LayoutGraph.js';

const DEFAULT_NODE_COUNTS = [60, 120, 180];
const DEFAULT_ITERATIONS = 10;
const DEFAULT_OUT_DIR = path.join('reports', 'perf');

function parseArgs(argv) {
  const options = {
    nodeCounts: [...DEFAULT_NODE_COUNTS],
    iterations: DEFAULT_ITERATIONS,
    outputPath: null,
  };

  for (const arg of argv) {
    if (arg.startsWith('--nodes=')) {
      const raw = arg.slice('--nodes='.length).trim();
      const parsed = raw
        .split(',')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => !Number.isNaN(value) && value > 0);
      if (parsed.length > 0) {
        options.nodeCounts = parsed;
      }
    } else if (arg.startsWith('--iterations=')) {
      const iterations = Number.parseInt(arg.slice('--iterations='.length), 10);
      if (!Number.isNaN(iterations) && iterations > 0) {
        options.iterations = iterations;
      }
    } else if (arg.startsWith('--out=')) {
      options.outputPath = arg.slice('--out='.length).trim();
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(`Usage: node scripts/benchmarks/runLayoutGraphBenchmark.js [options]

Options:
  --nodes=a,b,c       Comma-delimited node counts to benchmark (default 60,120,180)
  --iterations=N      Iterations per node count (default ${DEFAULT_ITERATIONS})
  --out=path          Output JSON path (default reports/perf/layout-graph-benchmark-<timestamp>.json)
  --help              Show this message
`);
}

function percentile(sorted, p) {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

function summariseDurations(durations) {
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = durations.reduce((acc, value) => acc + value, 0);
  const mean = sum / durations.length;
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean,
    median: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

function evaluateBudget(stats, budget = { mean: 8, max: 12 }) {
  if (stats.mean <= budget.mean && stats.max <= budget.max) {
    return { status: 'pass', budget };
  }
  if (stats.mean <= budget.mean * 2 && stats.max <= budget.max * 2) {
    return { status: 'warn', budget };
  }
  return { status: 'fail', budget };
}

function buildRoomId(index) {
  return `room-${index}`;
}

function seedGraph(nodeCount) {
  const graph = new LayoutGraph();
  for (let i = 0; i < nodeCount; i += 1) {
    graph.addNode(buildRoomId(i), {
      type: i % 5 === 0 ? 'hub' : 'room',
      difficulty: (i % 7) + 1,
    });
  }

  for (let i = 0; i < nodeCount - 1; i += 1) {
    graph.addEdge(buildRoomId(i), buildRoomId(i + 1), {
      type: 'primary',
      traversalCost: (i % 3) + 1,
    });

    const branchTarget = Math.max(0, i - 3);
    if (branchTarget !== i) {
      graph.addEdge(buildRoomId(i), buildRoomId(branchTarget), {
        type: 'branch',
        traversalCost: 2,
      });
    }
  }

  return graph;
}

function executeGraphWorkload(graph, nodeCount) {
  const checkpoints = [
    nodeCount - 1,
    Math.floor(nodeCount * 0.75),
    Math.floor(nodeCount * 0.5),
    Math.floor(nodeCount * 0.25),
  ];

  // BFS path lookups
  for (const checkpoint of checkpoints) {
    graph.hasPath(buildRoomId(0), buildRoomId(checkpoint));
  }

  // DFS path enumeration (limited) to stress recursion/stack
  graph.getAllPaths(buildRoomId(0), buildRoomId(nodeCount - 1), 5);

  // Serialization + deserialization round trip
  const serialized = graph.serialize();
  LayoutGraph.deserialize(serialized);
}

async function runBenchmark(nodeCount, iterations) {
  const durations = [];
  let edgeCount = 0;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const start = performance.now();
    const graph = seedGraph(nodeCount);
    executeGraphWorkload(graph, nodeCount);
    durations.push(performance.now() - start);

    if (iteration === 0) {
      edgeCount = graph.getEdgeCount();
    }
  }

  const stats = summariseDurations(durations);
  return {
    nodeCount,
    iterations,
    edgeCount,
    edgesPerNode: edgeCount / nodeCount,
    stats,
    budget: evaluateBudget(stats),
    durations,
  };
}

async function writeReport(report, requestedPath) {
  const timestampLabel = report.generatedAt.replace(/[:.]/g, '-');
  const defaultPath = path.join(
    DEFAULT_OUT_DIR,
    `layout-graph-benchmark-${timestampLabel}.json`
  );
  const outputPath = path.resolve(requestedPath ?? defaultPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
  return outputPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const generatedAt = new Date().toISOString();
  const results = [];

  for (const nodeCount of options.nodeCounts) {
    const result = await runBenchmark(nodeCount, options.iterations);
    results.push(result);
    console.log(
      `[LayoutGraphBenchmark] Nodes: ${nodeCount} | mean: ${result.stats.mean.toFixed(
        3
      )}ms | max: ${result.stats.max.toFixed(3)}ms | status: ${result.budget.status}`
    );
  }

  const report = {
    generatedAt,
    parameters: {
      nodeCounts: options.nodeCounts,
      iterations: options.iterations,
    },
    results,
    summary: {
      failures: results.filter((entry) => entry.budget.status === 'fail').length,
      warnings: results.filter((entry) => entry.budget.status === 'warn').length,
      passes: results.filter((entry) => entry.budget.status === 'pass').length,
      meanMax: Math.max(...results.map((entry) => entry.stats.mean)),
      worstCase: Math.max(...results.map((entry) => entry.stats.max)),
    },
  };

  const outputPath = await writeReport(report, options.outputPath);
  console.log(
    `[LayoutGraphBenchmark] Report written to ${path.relative(process.cwd(), outputPath)}`
  );

  if (report.summary.failures > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && process.argv[1].includes('runLayoutGraphBenchmark.js')) {
  main().catch((error) => {
    console.error('[LayoutGraphBenchmark] Unexpected failure:', error);
    process.exitCode = 1;
  });
}
