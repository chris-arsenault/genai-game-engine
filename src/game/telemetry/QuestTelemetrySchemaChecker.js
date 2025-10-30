import { QUEST_TELEMETRY_DASHBOARD_SCHEMA } from './QuestTelemetrySchema.js';

/**
 * Validate quest telemetry analytics dataset against canonical schema.
 * @param {object} dataset
 * @param {{ schema?: object }} [options]
 * @returns {{ ok: boolean, issues: Array<object>, stats: object }}
 */
export function checkQuestTelemetrySchema(dataset, options = {}) {
  const schema =
    options.schema && typeof options.schema === 'object'
      ? options.schema
      : QUEST_TELEMETRY_DASHBOARD_SCHEMA;

  const issues = [];
  const stats = {
    totalEvents: Array.isArray(dataset?.events) ? dataset.events.length : 0,
    missingDatasetFields: [],
    missingEventFields: [],
    missingPayloadFields: [],
    unexpectedFields: [],
  };

  validateFields(dataset, schema.datasetFields, 'dataset', issues, stats.missingDatasetFields);

  const events = Array.isArray(dataset?.events) ? dataset.events : [];
  events.forEach((event, index) => {
    const eventPath = `events[${index}]`;
    validateFields(event, schema.eventFields, eventPath, issues, stats.missingEventFields);

    if (event && typeof event === 'object' && event.payload && typeof event.payload === 'object') {
      validateFields(
        event.payload,
        schema.payloadFields,
        `${eventPath}.payload`,
        issues,
        stats.missingPayloadFields
      );
      collectUnexpectedFields(
        event.payload,
        schema.payloadFields,
        `${eventPath}.payload`,
        issues,
        stats.unexpectedFields
      );
    }
    collectUnexpectedFields(event, schema.eventFields, eventPath, issues, stats.unexpectedFields);
  });

  collectUnexpectedFields(dataset, schema.datasetFields, 'dataset', issues, stats.unexpectedFields);

  const ok = issues.every((issue) => issue.severity !== 'error');

  return { ok, issues: issues.sort(issueSeverityComparator), stats };
}

/**
 * Build a telemetry dataset wrapper from sample quest telemetry events.
 * @param {Array<object>} samples
 * @param {{ schemaVersion?: string, generatedAt?: string, report?: object, datasetOverrides?: object }} [metadata]
 * @returns {object}
 */
export function buildQuestTelemetryDatasetFromSamples(samples, metadata = {}) {
  if (!Array.isArray(samples)) {
    throw new Error('[buildQuestTelemetryDatasetFromSamples] samples array is required');
  }

  const events = samples.map((sample) => normalizeSampleEvent(sample));
  const uniqueTags = new Set();
  for (const event of events) {
    const telemetryTag = event?.payload?.telemetryTag;
    if (typeof telemetryTag === 'string' && telemetryTag.length > 0) {
      uniqueTags.add(telemetryTag);
    }
  }

  const dataset = {
    schemaVersion: typeof metadata.schemaVersion === 'string' ? metadata.schemaVersion : 'sample-batch',
    generatedAt: typeof metadata.generatedAt === 'string' ? metadata.generatedAt : new Date().toISOString(),
    totalEvents: events.length,
    events,
    report:
      metadata.report && typeof metadata.report === 'object'
        ? metadata.report
        : {
            source: 'sample-batch',
            summary: {
              note: 'Auto-generated from quest telemetry samples',
            },
          },
    uniqueTelemetryTags: Array.from(uniqueTags),
  };

  if (metadata.datasetOverrides && typeof metadata.datasetOverrides === 'object') {
    Object.assign(dataset, metadata.datasetOverrides);
  }

  return dataset;
}

/**
 * Summarize schema parity for reporting and CLI usage.
 * @param {{ ok: boolean, issues: Array<object>, stats: object }} result
 * @param {object} [schema]
 * @returns {{ ok: boolean, issues: Array<object>, parity: object }}
 */
export function summarizeQuestTelemetrySchemaCheck(result, schema = QUEST_TELEMETRY_DASHBOARD_SCHEMA) {
  if (!result || typeof result !== 'object') {
    return {
      ok: false,
      issues: [],
      parity: {
        dataset: emptyParityBucket(schema?.datasetFields),
        event: emptyParityBucket(schema?.eventFields),
        payload: emptyParityBucket(schema?.payloadFields),
        unexpected: [],
      },
    };
  }

  return {
    ok: !!result.ok,
    issues: Array.isArray(result.issues) ? result.issues : [],
    parity: {
      dataset: buildParityBucket(schema?.datasetFields, result.stats?.missingDatasetFields),
      event: buildParityBucket(schema?.eventFields, result.stats?.missingEventFields),
      payload: buildParityBucket(schema?.payloadFields, result.stats?.missingPayloadFields),
      unexpected: summarizeUnexpectedFields(result.stats?.unexpectedFields),
    },
  };
}

function validateFields(target, fieldSpec, path, issues, missingAccumulator) {
  if (!fieldSpec || typeof fieldSpec !== 'object') {
    return;
  }

  for (const [fieldName, rule] of Object.entries(fieldSpec)) {
    const value = target?.[fieldName];
    if (value === undefined || value === null) {
      if (rule.required) {
        const message = `Missing required field "${path}.${fieldName}"`;
        issues.push({
          severity: 'error',
          path: `${path}.${fieldName}`,
          message,
        });
        if (Array.isArray(missingAccumulator)) {
          missingAccumulator.push(`${path}.${fieldName}`);
        }
      }
      continue;
    }

    if (!isTypeAllowed(value, rule.types)) {
      issues.push({
        severity: 'error',
        path: `${path}.${fieldName}`,
        message: `Field "${path}.${fieldName}" expected types [${(rule.types ?? []).join(
          ', '
        )}] but received "${describeType(value)}"`,
      });
    }
  }
}

function collectUnexpectedFields(target, fieldSpec, path, issues, accumulator) {
  if (!target || typeof target !== 'object') {
    return;
  }
  const allowedKeys = new Set(Object.keys(fieldSpec ?? {}));
  for (const key of Object.keys(target)) {
    if (!allowedKeys.has(key)) {
      const detail = `${path}.${key}`;
      issues.push({
        severity: 'warning',
        path: detail,
        message: `Unexpected field "${detail}" present in telemetry dataset`,
      });
      if (Array.isArray(accumulator)) {
        accumulator.push(detail);
      }
    }
  }
}

function isTypeAllowed(value, allowedTypes) {
  if (!Array.isArray(allowedTypes) || allowedTypes.length === 0) {
    return true;
  }
  return allowedTypes.some((type) => {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && Number.isFinite(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      default:
        return false;
    }
  });
}

function describeType(value) {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (value === null) {
    return 'null';
  }
  return typeof value;
}

function issueSeverityComparator(a, b) {
  const severityWeight = (issue) => (issue.severity === 'error' ? 0 : 1);
  return severityWeight(a) - severityWeight(b);
}

function normalizeSampleEvent(sample) {
  if (!sample || typeof sample !== 'object') {
    return {
      type: 'unknown',
      timestamp: Date.now(),
      payload: {},
    };
  }
  const payload =
    sample.payload && typeof sample.payload === 'object' ? { ...sample.payload } : {};
  return {
    ...sample,
    payload,
  };
}

function buildParityBucket(fieldSpec, missingPaths) {
  if (!fieldSpec || typeof fieldSpec !== 'object') {
    return emptyParityBucket(fieldSpec);
  }
  const requiredFields = Object.entries(fieldSpec)
    .filter(([, rule]) => rule?.required)
    .map(([fieldName]) => fieldName);
  const missingFieldNames = new Set();
  const missing = Array.isArray(missingPaths) ? [...missingPaths] : [];
  for (const path of missing) {
    const fieldName = extractFieldName(path);
    if (fieldName) {
      missingFieldNames.add(fieldName);
    }
  }
  const coverage =
    requiredFields.length === 0
      ? 1
      : (requiredFields.length - missingFieldNames.size) / requiredFields.length;
  return {
    requiredFields,
    missingFieldNames: Array.from(missingFieldNames),
    missingPaths: missing,
    coverage,
  };
}

function emptyParityBucket(fieldSpec) {
  const requiredFields = fieldSpec && typeof fieldSpec === 'object' ? Object.keys(fieldSpec) : [];
  return {
    requiredFields,
    missingFieldNames: [],
    missingPaths: [],
    coverage: requiredFields.length === 0 ? 1 : 0,
  };
}

function summarizeUnexpectedFields(unexpectedPaths) {
  if (!Array.isArray(unexpectedPaths)) {
    return [];
  }
  const unique = new Set();
  for (const path of unexpectedPaths) {
    const fieldName = extractFieldName(path);
    if (fieldName) {
      unique.add(fieldName);
    }
  }
  return Array.from(unique);
}

function extractFieldName(path) {
  if (typeof path !== 'string' || path.length === 0) {
    return null;
  }
  const segments = path.split('.');
  return segments.length > 0 ? segments[segments.length - 1] : path;
}
