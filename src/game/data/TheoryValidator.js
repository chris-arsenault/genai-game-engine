/**
 * TheoryValidator
 *
 * Provides graph comparison utilities for player-built theories on the deduction board.
 * Supports multiple canonical solution graphs, connection type validation, and contextual hints.
 *
 * Accuracy blends connection precision/recall with required clue coverage so that solutions
 * must include critical nodes as well as the correct relationships between them.
 */
export class TheoryValidator {
  /**
   * Validate a player theory against the canonical solutions for a case.
   * @param {Object} playerTheory - Raw theory graph from the deduction board.
   * @param {Object} caseFile - Registered case file containing solution graphs and metadata.
   * @param {Object} options
   * @param {Map<string, Object>} [options.clueLookup] - Clue definitions for hint generation.
   * @param {number} [options.threshold=0.7] - Accuracy threshold required to mark the theory as valid.
   * @param {Array<string>} [options.allowedConnectionTypes] - Override for permitted connection archetypes.
   * @returns {Object} Validation payload describing accuracy, errors, and hint context.
   */
  validate(playerTheory = {}, caseFile = {}, options = {}) {
    const solutions = this._collectSolutions(caseFile);
    if (solutions.length === 0) {
      return {
        valid: true,
        accuracy: 1,
        feedback: 'No deduction logic defined for this case.',
        hints: [],
        matchedConnections: [],
        missingConnections: [],
        extraConnections: [],
        invalidConnections: [],
        missingNodes: [],
        unknownNodes: [],
        solutionId: null,
        normalizedTheory: this._normalizeTheory(playerTheory).normalizedTheory
      };
    }

    const threshold = typeof options.threshold === 'number'
      ? options.threshold
      : (caseFile?.accuracyThreshold ?? 0.7);

    const allowedConnectionTypes =
      options.allowedConnectionTypes ||
      caseFile?.allowedConnectionTypes ||
      this._deriveAllowedConnectionTypes(solutions);

    const { normalizedTheory, nodes, unknownNodes, validConnections, invalidConnections } =
      this._normalizeTheory(playerTheory, {
        allowedNodes: this._collectAllowedNodes(solutions, caseFile?.optionalClueIds),
        allowedConnectionTypes
      });

    let bestEvaluation = null;
    for (const solution of solutions) {
      const evaluation = this._evaluateAgainstSolution({
        solution,
        playerNodes: nodes,
        playerConnections: validConnections
      });

      if (!bestEvaluation || evaluation.accuracy > bestEvaluation.accuracy) {
        bestEvaluation = evaluation;
      }
    }

    const result = bestEvaluation ?? {
      accuracy: 0,
      connectionScore: 0,
      nodeCoverage: 0,
      matchedConnections: [],
      missingConnections: [],
      extraConnections: [],
      missingNodes: []
    };

    // Penalize for invalid connections referencing unknown nodes or unsupported types.
    const invalidPenalty = invalidConnections.length > 0 ? Math.min(0.15, invalidConnections.length * 0.05) : 0;
    const accuracy = Math.max(0, Math.min(1, result.accuracy - invalidPenalty));

    const valid = accuracy >= threshold && invalidConnections.length === 0;

    const hints = this._buildHints({
      caseFile,
      clueLookup: options.clueLookup,
      evaluation: result,
      invalidConnections,
      unknownNodes
    });

    const feedback = this._buildFeedback({
      accuracy,
      threshold,
      valid,
      hints,
      missingConnections: result.missingConnections,
      invalidConnections,
      unknownNodes
    });

    return {
      valid,
      accuracy,
      feedback,
      hints,
      solutionId: result.solution?.id ?? null,
      matchedConnections: result.matchedConnections,
      missingConnections: result.missingConnections,
      extraConnections: result.extraConnections,
      invalidConnections,
      missingNodes: result.missingNodes,
      unknownNodes,
      normalizedTheory
    };
  }

  /**
   * Gather all canonical solution graphs for a case.
   * @private
   * @param {Object} caseFile
   * @returns {Array<Object>}
   */
  _collectSolutions(caseFile = {}) {
    const primary = caseFile?.theoryGraph ? [caseFile.theoryGraph] : [];
    const alternates = Array.isArray(caseFile?.alternateTheoryGraphs)
      ? caseFile.alternateTheoryGraphs
      : [];
    const embedded = Array.isArray(caseFile?.theoryGraphs) ? caseFile.theoryGraphs : [];

    return [...primary, ...alternates, ...embedded].map((graph, index) => {
      const id = graph?.id ?? `solution_${index}`;
      return {
        id,
        nodes: Array.isArray(graph?.nodes) ? [...new Set(graph.nodes)] : [],
        connections: Array.isArray(graph?.connections) ? graph.connections.map((conn) => ({
          from: conn?.from,
          to: conn?.to,
          type: conn?.type || 'supports'
        })) : []
      };
    }).filter((graph) => graph.nodes.length > 0 || graph.connections.length > 0);
  }

  /**
   * Determine the union of nodes allowed on the deduction board for this case.
   * @private
   * @param {Array<Object>} solutions
   * @param {Iterable<string>} optionalNodeIds
   * @returns {Set<string>}
   */
  _collectAllowedNodes(solutions, optionalNodeIds = []) {
    const allowed = new Set();
    solutions.forEach((solution) => {
      solution.nodes.forEach((nodeId) => {
        if (typeof nodeId === 'string' && nodeId.length > 0) {
          allowed.add(nodeId);
        }
      });
    });

    if (optionalNodeIds) {
      for (const nodeId of optionalNodeIds) {
        if (typeof nodeId === 'string' && nodeId.length > 0) {
          allowed.add(nodeId);
        }
      }
    }

    return allowed;
  }

  /**
   * Resolve permitted connection types by inspecting solution graphs.
   * @private
   * @param {Array<Object>} solutions
   * @returns {Array<string>}
   */
  _deriveAllowedConnectionTypes(solutions) {
    const types = new Set();
    solutions.forEach((solution) => {
      solution.connections.forEach((conn) => {
        if (conn?.type) {
          types.add(conn.type);
        }
      });
    });

    if (types.size === 0) {
      types.add('supports');
    }

    // Always permit contradicts so alternative solutions can negate links.
    types.add('contradicts');

    return Array.from(types);
  }

  /**
   * Normalize player theory input to a canonical structure.
   * @private
   * @param {Object} playerTheory
   * @param {Object} options
   * @param {Set<string>} [options.allowedNodes]
   * @param {Array<string>} [options.allowedConnectionTypes]
   * @returns {Object}
   */
  _normalizeTheory(playerTheory = {}, options = {}) {
    const allowedNodes = options.allowedNodes || new Set();
    const allowedConnectionTypes = new Set(options.allowedConnectionTypes || ['supports']);

    const rawNodes = Array.isArray(playerTheory?.nodes) ? playerTheory.nodes : [];
    const rawConnections = Array.isArray(playerTheory?.connections) ? playerTheory.connections : [];

    const nodes = new Set();
    const unknownNodes = new Set();

    rawNodes.forEach((nodeId) => {
      if (typeof nodeId !== 'string') {
        return;
      }
      const trimmed = nodeId.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (allowedNodes.size === 0 || allowedNodes.has(trimmed)) {
        nodes.add(trimmed);
      } else {
        unknownNodes.add(trimmed);
      }
    });

    const validConnections = [];
    const invalidConnections = [];
    const connectionKeys = new Set();

    rawConnections.forEach((conn) => {
      const from = typeof conn?.from === 'string' ? conn.from.trim() : '';
      const to = typeof conn?.to === 'string' ? conn.to.trim() : '';
      const type = typeof conn?.type === 'string' && conn.type.trim().length > 0
        ? conn.type.trim()
        : 'supports';

      if (!from || !to || from === to) {
        invalidConnections.push({ ...conn, reason: 'invalid_nodes' });
        return;
      }

      const usesUnknownNode =
        (allowedNodes.size > 0 && (!nodes.has(from) && !allowedNodes.has(from))) ||
        (allowedNodes.size > 0 && (!nodes.has(to) && !allowedNodes.has(to)));

      if (usesUnknownNode) {
        invalidConnections.push({ ...conn, reason: 'unknown_node' });
        return;
      }

      if (!allowedConnectionTypes.has(type)) {
        invalidConnections.push({ ...conn, reason: 'unsupported_connection_type' });
        return;
      }

      const key = this._connectionKey(from, to, type);
      if (connectionKeys.has(key)) {
        invalidConnections.push({ ...conn, reason: 'duplicate' });
        return;
      }

      connectionKeys.add(key);
      validConnections.push({ from, to, type, key });
      nodes.add(from);
      nodes.add(to);
    });

    return {
      normalizedTheory: {
        nodes: Array.from(nodes),
        connections: validConnections.map(({ from, to, type }) => ({ from, to, type }))
      },
      nodes,
      unknownNodes: Array.from(unknownNodes),
      validConnections,
      invalidConnections
    };
  }

  /**
   * Evaluate a sanitized player theory against a single canonical solution.
   * @private
   * @param {Object} params
   * @param {Object} params.solution
   * @param {Set<string>} params.playerNodes
   * @param {Array<Object>} params.playerConnections
   * @returns {Object}
   */
  _evaluateAgainstSolution({ solution, playerNodes, playerConnections }) {
    const requiredNodes = new Set(solution.nodes);
    const requiredConnections = new Map();
    const requiredKeys = new Set();

    solution.connections.forEach((conn, index) => {
      const key = this._connectionKey(conn.from, conn.to, conn.type);
      requiredKeys.add(key);
      requiredConnections.set(key, { ...conn, index });
    });

    const matchedConnections = [];
    const missingConnections = [];
    const extraConnections = [];

    const playerKeys = new Set();
    playerConnections.forEach((conn) => {
      playerKeys.add(conn.key);
      if (requiredKeys.has(conn.key)) {
        matchedConnections.push({ from: conn.from, to: conn.to, type: conn.type });
      } else {
        extraConnections.push({ from: conn.from, to: conn.to, type: conn.type });
      }
    });

    requiredKeys.forEach((key) => {
      if (!playerKeys.has(key)) {
        const missing = requiredConnections.get(key);
        missingConnections.push({ from: missing.from, to: missing.to, type: missing.type });
      }
    });

    const missingNodes = [];
    requiredNodes.forEach((nodeId) => {
      if (!playerNodes.has(nodeId)) {
        missingNodes.push(nodeId);
      }
    });

    const precision = matchedConnections.length + extraConnections.length > 0
      ? matchedConnections.length / (matchedConnections.length + extraConnections.length)
      : 0;

    const recall = requiredConnections.size > 0
      ? matchedConnections.length / requiredConnections.size
      : 1;

    const connectionScore =
      precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

    const nodeCoverage =
      requiredNodes.size > 0 ? (requiredNodes.size - missingNodes.length) / requiredNodes.size : 1;

    const accuracy = (connectionScore * 0.85) + (nodeCoverage * 0.15);

    return {
      solution,
      accuracy,
      connectionScore,
      nodeCoverage,
      matchedConnections,
      missingConnections,
      extraConnections,
      missingNodes
    };
  }

  /**
   * Generate contextual hints based on the evaluation outcome.
   * @private
   * @param {Object} context
   * @param {Object} context.caseFile
   * @param {Map<string, Object>} [context.clueLookup]
   * @param {Object} context.evaluation
   * @param {Array<Object>} context.invalidConnections
   * @param {Array<string>} context.unknownNodes
   * @returns {Array<string>}
   */
  _buildHints({ caseFile, clueLookup, evaluation, invalidConnections, unknownNodes }) {
    const hints = [];
    const lookup = clueLookup instanceof Map ? clueLookup : null;

    const titleFor = (clueId) => {
      if (!clueId) return 'unknown clue';
      if (lookup && lookup.has(clueId)) {
        return lookup.get(clueId)?.title || clueId;
      }
      return clueId;
    };

    const pushHint = (message) => {
      if (typeof message === 'string' && message.trim().length > 0 && hints.length < 3) {
        hints.push(message);
      }
    };

    if (invalidConnections.length > 0) {
      const unsupported = invalidConnections.find((conn) => conn.reason === 'unsupported_connection_type');
      if (unsupported) {
        pushHint(`Connection type "${unsupported.type}" is not supported in this case.`);
      }
      const duplicate = invalidConnections.find((conn) => conn.reason === 'duplicate');
      if (duplicate) {
        pushHint('Remove duplicate connections to keep the theory clean.');
      }
      const invalidNodeConn = invalidConnections.find((conn) => conn.reason === 'unknown_node');
      if (invalidNodeConn) {
        pushHint('One of your links references a clue that is not part of this case.');
      }
    }

    evaluation.missingConnections.forEach((conn) => {
      pushHint(`Try linking ${titleFor(conn.from)} to ${titleFor(conn.to)} (${conn.type}).`);
    });

    evaluation.missingNodes.forEach((nodeId) => {
      pushHint(`Work ${titleFor(nodeId)} into your theory to cover all key clues.`);
    });

    if (unknownNodes.length > 0) {
      pushHint('Focus on the clues uncovered in this case; external leads are distracting the board.');
    }

    if (caseFile?.narrative?.hints && hints.length === 0) {
      pushHint(caseFile.narrative.hints[0]);
    }

    return hints;
  }

  /**
   * Compose a player-facing feedback message informed by accuracy and validation diagnostics.
   * @private
   * @param {Object} context
   * @param {number} context.accuracy
   * @param {number} context.threshold
   * @param {boolean} context.valid
   * @param {Array<string>} context.hints
   * @param {Array<Object>} context.missingConnections
   * @param {Array<Object>} context.invalidConnections
   * @param {Array<string>} context.unknownNodes
   * @returns {string}
   */
  _buildFeedback({
    accuracy,
    threshold,
    valid,
    hints,
    missingConnections,
    invalidConnections,
    unknownNodes
  }) {
    if (valid) {
      return 'Your theory holds together. Trigger the resolution to move forward.';
    }

    if (invalidConnections.length > 0) {
      const invalid = invalidConnections[0];
      switch (invalid.reason) {
        case 'unsupported_connection_type':
          return `That ${invalid.type || 'unknown'} link is incompatible with this board.`;
        case 'duplicate':
          return 'The same link cannot be entered twice. Clean the duplicate connection.';
        case 'unknown_node':
          return 'One of your connections references a clue that is not tracked in this case.';
        case 'invalid_nodes':
        default:
          return 'A connection is missing required endpoints. Rebuild that link.';
      }
    }

    if (unknownNodes.length > 0) {
      return 'Some nodes in your theory are unfamiliar to this case. Focus on case-specific clues.';
    }

    const accuracyPercent = Math.round(accuracy * 100);
    const thresholdPercent = Math.round(threshold * 100);

    if (accuracy >= threshold * 0.9) {
      return `Close, but a link is misaligned. ${accuracyPercent}% vs ${thresholdPercent}% target.`;
    }

    if (missingConnections.length > 0 && hints.length > 0) {
      return `Your theory misses a critical relationship (${accuracyPercent}% out of ${thresholdPercent}%).`;
    }

    if (accuracy >= threshold * 0.6) {
      return `Pieces are forming, but something is off (${accuracyPercent}% accuracy).`;
    }

    return 'This theory doesn’t fit yet. Re-evaluate your clue connections.';
  }

  /**
   * Generate a unique key for a directed connection.
   * @private
   * @param {string} from
   * @param {string} to
   * @param {string} type
   * @returns {string}
   */
  _connectionKey(from, to, type) {
    return `${from}→${to}::${type}`;
  }
}
