export const openapi = {
  openapi: "3.0.3",
  info: { title: "Flagship API", version: "1.0.0", description: "Feature flag platform with live updates and auto-rollback." },
  components: {
    securitySchemes: {
      bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      sdkKey: { type: "apiKey", in: "header", name: "x-sdk-key" },
    },
  },
  paths: {
    "/auth/register": { post: { tags: ["Auth"], summary: "Create an organization and its admin", responses: { "201": { description: "Token and user" } } } },
    "/auth/login": { post: { tags: ["Auth"], summary: "Sign in", responses: { "200": { description: "Token and user" } } } },
    "/projects": {
      get: { tags: ["Projects"], security: [{ bearer: [] }], summary: "List projects", responses: { "200": { description: "Projects with environments" } } },
      post: { tags: ["Projects"], security: [{ bearer: [] }], summary: "Create a project", responses: { "201": { description: "Created" } } },
    },
    "/projects/{projectId}/flags": {
      get: { tags: ["Flags"], security: [{ bearer: [] }], summary: "List flags", responses: { "200": { description: "Flags with per-environment config" } } },
      post: { tags: ["Flags"], security: [{ bearer: [] }], summary: "Create a flag", responses: { "201": { description: "Created" } } },
    },
    "/projects/{projectId}/flags/{flagId}/environments/{envId}": {
      patch: { tags: ["Flags"], security: [{ bearer: [] }], summary: "Toggle, set rollout %, or edit targeting rules", responses: { "200": { description: "Updated config" } } },
    },
    "/projects/{projectId}/flags/{flagId}/environments/{envId}/explain": {
      post: { tags: ["Flags"], security: [{ bearer: [] }], summary: "Explain why a user gets a result", responses: { "200": { description: "Result, bucket, explanation" } } },
    },
    "/projects/audit/logs": { get: { tags: ["Audit"], security: [{ bearer: [] }], summary: "Cursor-paginated audit log", responses: { "200": { description: "items and nextCursor" } } } },
    "/v1/evaluate-all": { post: { tags: ["SDK"], security: [{ sdkKey: [] }], summary: "Evaluate every flag for a user", responses: { "200": { description: "Flag results" } } } },
    "/v1/events": { post: { tags: ["SDK"], security: [{ sdkKey: [] }], summary: "Report exposures and errors; may trigger auto-rollback", responses: { "202": { description: "Accepted" } } } },
    "/v1/stream": { get: { tags: ["SDK"], summary: "Server-Sent Events stream of flag changes (?sdkKey=)", responses: { "200": { description: "text/event-stream" } } } },
    "/health": { get: { tags: ["Ops"], summary: "Liveness", responses: { "200": { description: "ok" } } } },
    "/ready": { get: { tags: ["Ops"], summary: "Readiness (checks database)", responses: { "200": { description: "ready" }, "503": { description: "database down" } } } },
  },
};