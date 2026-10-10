/**
 * Body of GET /api/health (schema `Health` in api/openapi.yaml).
 * Written by hand until openapi-typescript generation is set up (API contract ticket).
 */
export type Health = {
  status: 'ok' | 'degraded'
  database: 'up' | 'down'
}
