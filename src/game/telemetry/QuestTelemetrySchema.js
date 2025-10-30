export const QUEST_TELEMETRY_DASHBOARD_SCHEMA = Object.freeze({
  datasetFields: Object.freeze({
    schemaVersion: Object.freeze({ required: true, types: Object.freeze(['string']) }),
    generatedAt: Object.freeze({ required: true, types: Object.freeze(['string']) }),
    totalEvents: Object.freeze({ required: true, types: Object.freeze(['number']) }),
    events: Object.freeze({ required: true, types: Object.freeze(['array']) }),
    report: Object.freeze({ required: true, types: Object.freeze(['object']) }),
    uniqueTelemetryTags: Object.freeze({ required: true, types: Object.freeze(['array']) }),
  }),
  eventFields: Object.freeze({
    type: Object.freeze({ required: true, types: Object.freeze(['string']) }),
    timestamp: Object.freeze({ required: true, types: Object.freeze(['number', 'string']) }),
    payload: Object.freeze({ required: true, types: Object.freeze(['object']) }),
  }),
  payloadFields: Object.freeze({
    telemetryTag: Object.freeze({ required: true, types: Object.freeze(['string']) }),
    questId: Object.freeze({ required: true, types: Object.freeze(['string']) }),
    objectiveId: Object.freeze({ required: true, types: Object.freeze(['string']) }),
    triggerId: Object.freeze({ required: false, types: Object.freeze(['string']) }),
    areaId: Object.freeze({ required: false, types: Object.freeze(['string']) }),
    sceneId: Object.freeze({ required: false, types: Object.freeze(['string']) }),
    source: Object.freeze({ required: false, types: Object.freeze(['string']) }),
  }),
});
