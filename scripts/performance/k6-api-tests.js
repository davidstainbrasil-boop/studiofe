/**
 * K6 API Endpoint Tests - Testes específicos por rota
 * 
 * Execução: k6 run scripts/performance/k6-api-tests.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Métricas por endpoint
const endpointLatency = {
  health: new Trend('endpoint_health_latency'),
  projects: new Trend('endpoint_projects_latency'),
  renderJobs: new Trend('endpoint_render_jobs_latency'),
  renderStart: new Trend('endpoint_render_start_latency'),
  templates: new Trend('endpoint_templates_latency'),
  subtitles: new Trend('endpoint_subtitles_latency'),
  preview: new Trend('endpoint_preview_latency'),
  music: new Trend('endpoint_music_latency'),
  tts: new Trend('endpoint_tts_latency'),
};

const endpointErrors = {
  health: new Rate('endpoint_health_errors'),
  projects: new Rate('endpoint_projects_errors'),
  renderJobs: new Rate('endpoint_render_jobs_errors'),
  renderStart: new Rate('endpoint_render_start_errors'),
  templates: new Rate('endpoint_templates_errors'),
  subtitles: new Rate('endpoint_subtitles_errors'),
  preview: new Rate('endpoint_preview_errors'),
  music: new Rate('endpoint_music_errors'),
  tts: new Rate('endpoint_tts_errors'),
};

export const options = {
  scenarios: {
    // Cenário 1: Health checks constantes
    health_checks: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 5,
      maxVUs: 20,
      exec: 'healthCheck',
      tags: { scenario: 'health' },
    },
    
    // Cenário 2: Listagem de recursos
    resource_listing: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
      exec: 'resourceListing',
      tags: { scenario: 'listing' },
    },
    
    // Cenário 3: Operações de escrita
    write_operations: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      exec: 'writeOperations',
      tags: { scenario: 'write' },
    },
    
    // Cenário 4: APIs de mídia
    media_apis: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      exec: 'mediaApis',
      tags: { scenario: 'media' },
    },
  },
  
  thresholds: {
    // Latência por endpoint
    'endpoint_health_latency': ['p(95)<100'],
    'endpoint_projects_latency': ['p(95)<300'],
    'endpoint_render_jobs_latency': ['p(95)<300'],
    'endpoint_templates_latency': ['p(95)<200'],
    'endpoint_subtitles_latency': ['p(95)<500'],
    'endpoint_preview_latency': ['p(95)<1000'],
    'endpoint_music_latency': ['p(95)<300'],
    
    // Taxa de erro por endpoint
    'endpoint_health_errors': ['rate<0.01'],
    'endpoint_projects_errors': ['rate<0.05'],
    'endpoint_render_jobs_errors': ['rate<0.05'],
    'endpoint_templates_errors': ['rate<0.05'],
    'endpoint_subtitles_errors': ['rate<0.10'],
  },
};

function getHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
  }
  return headers;
}

// ============= CENÁRIO: HEALTH CHECKS =============

export function healthCheck() {
  const res = http.get(`${BASE_URL}/api/health`, {
    headers: getHeaders(),
    tags: { endpoint: 'health' },
  });
  
  endpointLatency.health.add(res.timings.duration);
  
  const success = check(res, {
    'health - status 200': (r) => r.status === 200,
    'health - fast response': (r) => r.timings.duration < 100,
  });
  
  endpointErrors.health.add(!success);
  sleep(0.1);
}

// ============= CENÁRIO: LISTAGEM DE RECURSOS =============

export function resourceListing() {
  group('Projects Listing', () => {
    const res = http.get(`${BASE_URL}/api/projects`, {
      headers: getHeaders(),
      tags: { endpoint: 'projects' },
    });
    
    endpointLatency.projects.add(res.timings.duration);
    const success = check(res, {
      'projects - valid status': (r) => [200, 401].includes(r.status),
    });
    endpointErrors.projects.add(!success);
  });
  
  sleep(0.5);
  
  group('Render Jobs Listing', () => {
    const res = http.get(`${BASE_URL}/api/render/jobs`, {
      headers: getHeaders(),
      tags: { endpoint: 'render_jobs' },
    });
    
    endpointLatency.renderJobs.add(res.timings.duration);
    const success = check(res, {
      'render_jobs - valid status': (r) => [200, 401].includes(r.status),
    });
    endpointErrors.renderJobs.add(!success);
  });
  
  sleep(0.5);
  
  group('Templates Listing', () => {
    const res = http.get(`${BASE_URL}/api/templates`, {
      headers: getHeaders(),
      tags: { endpoint: 'templates' },
    });
    
    endpointLatency.templates.add(res.timings.duration);
    const success = check(res, {
      'templates - valid status': (r) => [200, 401].includes(r.status),
    });
    endpointErrors.templates.add(!success);
  });
  
  sleep(1);
}

// ============= CENÁRIO: OPERAÇÕES DE ESCRITA =============

export function writeOperations() {
  group('Create Render Job', () => {
    const payload = JSON.stringify({
      projectId: `k6-test-project-${Date.now()}`,
      config: {
        resolution: '720p',
        format: 'mp4',
      },
    });
    
    const res = http.post(`${BASE_URL}/api/render/start`, payload, {
      headers: getHeaders(),
      tags: { endpoint: 'render_start' },
    });
    
    endpointLatency.renderStart.add(res.timings.duration);
    const success = check(res, {
      'render_start - valid status': (r) => [200, 201, 400, 401, 403].includes(r.status),
    });
    endpointErrors.renderStart.add(!success);
    
    // Se job foi criado, tenta cancelar
    if (res.status === 201 || res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        const jobId = data.jobId || data.id;
        if (jobId) {
          sleep(0.5);
          http.post(`${BASE_URL}/api/render/cancel`, JSON.stringify({ jobId }), {
            headers: getHeaders(),
          });
        }
      } catch (e) {
        // Ignora erros de parse
      }
    }
  });
  
  sleep(2);
  
  group('Generate Subtitles', () => {
    const payload = JSON.stringify({
      text: 'Texto de teste para geração de legendas. Este é um texto mais longo para simular um roteiro real de vídeo de treinamento NR.',
      options: { format: 'srt' },
    });
    
    const res = http.post(`${BASE_URL}/api/subtitles?operation=generate`, payload, {
      headers: getHeaders(),
      tags: { endpoint: 'subtitles' },
    });
    
    endpointLatency.subtitles.add(res.timings.duration);
    const success = check(res, {
      'subtitles - valid status': (r) => [200, 201, 400, 401].includes(r.status),
    });
    endpointErrors.subtitles.add(!success);
  });
  
  sleep(2);
}

// ============= CENÁRIO: APIS DE MÍDIA =============

export function mediaApis() {
  group('Music Library', () => {
    const res = http.get(`${BASE_URL}/api/music`, {
      headers: getHeaders(),
      tags: { endpoint: 'music' },
    });
    
    endpointLatency.music.add(res.timings.duration);
    const success = check(res, {
      'music - valid status': (r) => [200, 401, 404].includes(r.status),
    });
    endpointErrors.music.add(!success);
  });
  
  sleep(0.5);
  
  group('Video Preview', () => {
    const payload = JSON.stringify({
      slides: [
        { id: '1', content: 'Slide de teste' },
      ],
      options: { duration: 10 },
    });
    
    const res = http.post(`${BASE_URL}/api/preview`, payload, {
      headers: getHeaders(),
      tags: { endpoint: 'preview' },
    });
    
    endpointLatency.preview.add(res.timings.duration);
    const success = check(res, {
      'preview - valid status': (r) => [200, 201, 202, 400, 401].includes(r.status),
    });
    endpointErrors.preview.add(!success);
  });
  
  sleep(0.5);
  
  group('TTS Preview', () => {
    const payload = JSON.stringify({
      text: 'Teste de síntese de voz.',
      voice: 'rachel',
    });
    
    const res = http.post(`${BASE_URL}/api/tts/preview`, payload, {
      headers: getHeaders(),
      tags: { endpoint: 'tts' },
    });
    
    endpointLatency.tts.add(res.timings.duration);
    const success = check(res, {
      'tts - endpoint exists': (r) => r.status !== 404,
    });
    endpointErrors.tts.add(!success);
  });
  
  sleep(2);
}

// ============= SETUP E TEARDOWN =============

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           K6 API Endpoint Tests - TécnicoCursos               ║
╠════════════════════════════════════════════════════════════════╣
║  Testing: ${BASE_URL.padEnd(45)}     ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  // Verifica conectividade
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    console.warn(`⚠️  API may be unavailable (status: ${health.status})`);
  }
  
  return {};
}

export function teardown() {
  console.log('\n✅ API endpoint tests completed\n');
}
