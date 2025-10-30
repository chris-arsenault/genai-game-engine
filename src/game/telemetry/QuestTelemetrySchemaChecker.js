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
    missingPayloadFields: [],
    unexpectedFields: [],
  };

  validateFields(dataset, schema.datasetFields, 'dataset', issues, stats.missingDatasetFields);

  const events = Array.isArray(dataset?.events) ? dataset.events : [];
  events.forEach((event, index) => {
    const eventPath = `events[${index}]`;
    validateFields(event, schema.eventFields, eventPath, issues);

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
