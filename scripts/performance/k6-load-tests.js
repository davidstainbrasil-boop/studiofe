/**
 * K6 Load Testing Suite - MVP Vídeos TécnicoCursos v7
 * 
 * Testes de carga para validar performance do sistema
 * Execução: k6 run scripts/performance/k6-load-tests.js
 * 
 * Opções de execução:
 * - Smoke test: k6 run --env TEST_TYPE=smoke scripts/performance/k6-load-tests.js
 * - Load test: k6 run --env TEST_TYPE=load scripts/performance/k6-load-tests.js
 * - Stress test: k6 run --env TEST_TYPE=stress scripts/performance/k6-load-tests.js
 * - Soak test: k6 run --env TEST_TYPE=soak scripts/performance/k6-load-tests.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// ============= CONFIGURAÇÃO =============

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TEST_TYPE = __ENV.TEST_TYPE || 'load';

// Métricas customizadas
const errorRate = new Rate('errors');
const renderJobCreated = new Counter('render_jobs_created');
const renderJobCompleted = new Counter('render_jobs_completed');
const apiLatency = new Trend('api_latency', true);
const dbLatency = new Trend('db_latency', true);
const activeJobs = new Gauge('active_jobs');

// Configurações por tipo de teste
const testConfigs = {
  smoke: {
    vus: 1,
    duration: '1m',
    thresholds: {
      http_req_duration: ['p(99)<1500'],
      errors: ['rate<0.01'],
    },
  },
  load: {
    stages: [
      { duration: '2m', target: 20 },   // Ramp-up para 20 usuários
      { duration: '5m', target: 20 },   // Mantém 20 usuários
      { duration: '2m', target: 50 },   // Aumenta para 50
      { duration: '5m', target: 50 },   // Mantém 50 usuários
      { duration: '2m', target: 100 },  // Pico de 100 usuários
      { duration: '3m', target: 100 },  // Sustenta o pico
      { duration: '2m', target: 0 },    // Ramp-down
    ],
    thresholds: {
      http_req_duration: ['p(95)<500', 'p(99)<1500'],
      http_req_failed: ['rate<0.05'],
      errors: ['rate<0.05'],
    },
  },
  stress: {
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },
      { duration: '5m', target: 300 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.10'],
      errors: ['rate<0.10'],
    },
  },
  soak: {
    stages: [
      { duration: '5m', target: 50 },
      { duration: '3h', target: 50 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
      errors: ['rate<0.01'],
    },
  },
};

const config = testConfigs[TEST_TYPE];

export const options = {
  ...config,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  noConnectionReuse: false,
  userAgent: 'K6LoadTest/1.0 MVP-TecnicoCursos',
};

// ============= HELPERS =============

function getAuthHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

function checkResponse(res, name, expectedStatus = 200) {
  const success = check(res, {
    [`${name} - status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name} - response time OK`]: (r) => r.timings.duration < 1000,
    [`${name} - has body`]: (r) => r.body && r.body.length > 0,
  });
  
  errorRate.add(!success);
  apiLatency.add(res.timings.duration);
  
  return success;
}

// ============= CENÁRIOS DE TESTE =============

// Teste de Health Check (sempre deve funcionar)
function testHealthCheck() {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: getAuthHeaders(),
      tags: { name: 'health_check' },
    });
    
    checkResponse(res, 'Health Check');
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        check(data, {
          'health - has status': (d) => d.status !== undefined,
          'health - database ok': (d) => d.database === 'connected' || d.status === 'ok',
        });
      } catch (e) {
        // Response não é JSON válido
      }
    }
  });
}

// Teste de listagem de projetos
function testListProjects(token) {
  group('List Projects', () => {
    const res = http.get(`${BASE_URL}/api/projects`, {
      headers: getAuthHeaders(token),
      tags: { name: 'list_projects' },
    });
    
    checkResponse(res, 'List Projects');
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        check(data, {
          'projects - is array': (d) => Array.isArray(d.data || d),
        });
      } catch (e) {
        // Response não é JSON válido
      }
    }
  });
}

// Teste de listagem de jobs de render
function testListRenderJobs(token) {
  group('List Render Jobs', () => {
    const res = http.get(`${BASE_URL}/api/render/jobs`, {
      headers: getAuthHeaders(token),
      tags: { name: 'list_render_jobs' },
    });
    
    checkResponse(res, 'List Render Jobs');
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        check(data, {
          'jobs - has data': (d) => d !== undefined,
        });
        
        // Atualiza gauge de jobs ativos
        if (Array.isArray(data.data || data)) {
          const jobs = data.data || data;
          const processing = jobs.filter(j => j.status === 'processing').length;
          activeJobs.add(processing);
        }
      } catch (e) {
        // Response não é JSON válido
      }
    }
  });
}

// Teste de estatísticas de render
function testRenderStats(token) {
  group('Render Stats', () => {
    const res = http.get(`${BASE_URL}/api/render/stats`, {
      headers: getAuthHeaders(token),
      tags: { name: 'render_stats' },
    });
    
    checkResponse(res, 'Render Stats');
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        check(data, {
          'stats - has metrics': (d) => d.totalJobs !== undefined || d.stats !== undefined,
        });
      } catch (e) {
        // Response não é JSON válido  
      }
    }
  });
}

// Teste de templates NR
function testNRTemplates() {
  group('NR Templates', () => {
    const res = http.get(`${BASE_URL}/api/templates`, {
      headers: getAuthHeaders(),
      tags: { name: 'nr_templates' },
    });
    
    checkResponse(res, 'NR Templates');
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        check(data, {
          'templates - is array': (d) => Array.isArray(d.data || d.templates || d),
        });
      } catch (e) {
        // Response não é JSON válido
      }
    }
  });
}

// Teste de upload PPTX (simulado - não envia arquivo real)
function testPPTXUploadEndpoint(token) {
  group('PPTX Upload Endpoint', () => {
    // Apenas verifica se o endpoint responde (não faz upload real)
    const res = http.options(`${BASE_URL}/api/pptx/upload`, {
      headers: getAuthHeaders(token),
      tags: { name: 'pptx_upload_options' },
    });
    
    check(res, {
      'PPTX Upload - endpoint exists': (r) => r.status !== 404,
    });
  });
}

// Teste de preview de vídeo
function testVideoPreview(token) {
  group('Video Preview', () => {
    const payload = JSON.stringify({
      slides: [
        { id: '1', content: 'Slide de teste para preview' },
        { id: '2', content: 'Segundo slide de teste' },
      ],
      options: {
        duration: 30,
        resolution: 'preview',
      },
    });
    
    const res = http.post(`${BASE_URL}/api/preview`, payload, {
      headers: getAuthHeaders(token),
      tags: { name: 'video_preview' },
    });
    
    // Preview pode retornar 200, 201, ou 202 (accepted)
    const success = check(res, {
      'Preview - status OK': (r) => [200, 201, 202].includes(r.status),
      'Preview - response time < 2s': (r) => r.timings.duration < 2000,
    });
    
    errorRate.add(!success);
  });
}

// Teste de legendas
function testSubtitles(token) {
  group('Subtitles API', () => {
    const payload = JSON.stringify({
      text: 'Este é um texto de teste para geração de legendas automáticas no sistema de vídeos técnicos.',
      options: {
        format: 'srt',
        maxCharsPerLine: 42,
      },
    });
    
    const res = http.post(`${BASE_URL}/api/subtitles?operation=generate`, payload, {
      headers: getAuthHeaders(token),
      tags: { name: 'subtitles_generate' },
    });
    
    checkResponse(res, 'Subtitles Generate');
  });
}

// Teste de resoluções disponíveis
function testResolutions() {
  group('Video Resolutions', () => {
    const res = http.get(`${BASE_URL}/api/render/resolution`, {
      headers: getAuthHeaders(),
      tags: { name: 'video_resolutions' },
    });
    
    checkResponse(res, 'Video Resolutions');
    
    if (res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        check(data, {
          'resolutions - has profiles': (d) => d.profiles !== undefined || Array.isArray(d),
        });
      } catch (e) {
        // Response não é JSON válido
      }
    }
  });
}

// Teste de criação de job de render (sem executar render real)
function testCreateRenderJob(token, projectId) {
  group('Create Render Job', () => {
    const payload = JSON.stringify({
      projectId: projectId || `test-project-${randomString(8)}`,
      config: {
        resolution: '1080p',
        format: 'mp4',
        quality: 'high',
      },
    });
    
    const res = http.post(`${BASE_URL}/api/render/start`, payload, {
      headers: getAuthHeaders(token),
      tags: { name: 'create_render_job' },
    });
    
    // Pode retornar 201 (criado), 200 (ok), ou 400/401/403 se não tiver permissão
    const success = check(res, {
      'Create Job - valid response': (r) => [200, 201, 400, 401, 403].includes(r.status),
    });
    
    if (res.status === 201 || res.status === 200) {
      renderJobCreated.add(1);
      try {
        const data = JSON.parse(res.body);
        if (data.jobId || data.id) {
          return data.jobId || data.id;
        }
      } catch (e) {
        // Response não é JSON válido
      }
    }
    
    return null;
  });
}

// Teste de progresso de job
function testJobProgress(token, jobId) {
  if (!jobId) return;
  
  group('Job Progress', () => {
    const res = http.get(`${BASE_URL}/api/render/progress?jobId=${jobId}`, {
      headers: getAuthHeaders(token),
      tags: { name: 'job_progress' },
    });
    
    checkResponse(res, 'Job Progress');
  });
}

// Teste de cancelamento de job
function testCancelJob(token, jobId) {
  if (!jobId) return;
  
  group('Cancel Job', () => {
    const payload = JSON.stringify({ jobId });
    
    const res = http.post(`${BASE_URL}/api/render/cancel`, payload, {
      headers: getAuthHeaders(token),
      tags: { name: 'cancel_job' },
    });
    
    check(res, {
      'Cancel Job - valid response': (r) => [200, 404, 400].includes(r.status),
    });
  });
}

// Teste de music library
function testMusicLibrary(token) {
  group('Music Library', () => {
    const res = http.get(`${BASE_URL}/api/music`, {
      headers: getAuthHeaders(token),
      tags: { name: 'music_library' },
    });
    
    checkResponse(res, 'Music Library');
  });
}

// Teste de TTS
function testTTSEndpoint(token) {
  group('TTS Endpoint', () => {
    const payload = JSON.stringify({
      text: 'Teste de síntese de voz para o sistema de vídeos.',
      voice: 'rachel',
      options: {
        speed: 1.0,
        pitch: 1.0,
      },
    });
    
    const res = http.post(`${BASE_URL}/api/tts/preview`, payload, {
      headers: getAuthHeaders(token),
      tags: { name: 'tts_preview' },
    });
    
    // TTS pode retornar vários status dependendo de configuração
    check(res, {
      'TTS - endpoint accessible': (r) => r.status !== 404,
    });
  });
}

// ============= CENÁRIO PRINCIPAL =============

export default function() {
  // Token simulado (em produção, seria obtido via login)
  const token = __ENV.AUTH_TOKEN || null;
  
  // Executa testes em grupos com pesos diferentes
  const scenario = randomIntBetween(1, 100);
  
  // 30% - Health e endpoints básicos
  if (scenario <= 30) {
    testHealthCheck();
    testNRTemplates();
    testResolutions();
    sleep(randomIntBetween(1, 3));
  }
  // 25% - Listagem de projetos e jobs
  else if (scenario <= 55) {
    testListProjects(token);
    testListRenderJobs(token);
    testRenderStats(token);
    sleep(randomIntBetween(1, 2));
  }
  // 20% - Preview e subtitles
  else if (scenario <= 75) {
    testVideoPreview(token);
    testSubtitles(token);
    sleep(randomIntBetween(2, 4));
  }
  // 15% - Render job lifecycle
  else if (scenario <= 90) {
    const jobId = testCreateRenderJob(token);
    if (jobId) {
      sleep(1);
      testJobProgress(token, jobId);
      sleep(1);
      testCancelJob(token, jobId);
    }
    sleep(randomIntBetween(2, 5));
  }
  // 10% - Music e TTS
  else {
    testMusicLibrary(token);
    testTTSEndpoint(token);
    sleep(randomIntBetween(1, 3));
  }
}

// ============= LIFECYCLE HOOKS =============

export function setup() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║          K6 Load Test - MVP Vídeos TécnicoCursos v7          ║
╠═══════════════════════════════════════════════════════════════╣
║  Test Type: ${TEST_TYPE.padEnd(10)}                                     ║
║  Base URL: ${BASE_URL.padEnd(45)}║
║  Started: ${new Date().toISOString()}                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
  
  // Verifica se o sistema está acessível
  const healthRes = http.get(`${BASE_URL}/api/health`);
  if (healthRes.status !== 200) {
    console.warn(`⚠️  Health check failed: ${healthRes.status}`);
  }
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    TEST COMPLETED                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Duration: ${duration} minutes                                       ║
║  Finished: ${new Date().toISOString()}               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

// ============= RELATÓRIO CUSTOMIZADO =============

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    testType: TEST_TYPE,
    baseUrl: BASE_URL,
    metrics: {
      http_reqs: data.metrics.http_reqs?.values?.count || 0,
      http_req_duration_avg: data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0,
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)']?.toFixed(2) || 0,
      http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)']?.toFixed(2) || 0,
      http_req_failed_rate: (data.metrics.http_req_failed?.values?.rate * 100)?.toFixed(2) || 0,
      errors_rate: (data.metrics.errors?.values?.rate * 100)?.toFixed(2) || 0,
      vus_max: data.metrics.vus_max?.values?.value || 0,
      iterations: data.metrics.iterations?.values?.count || 0,
    },
    thresholds: data.thresholds || {},
  };
  
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'scripts/performance/k6-results.json': JSON.stringify(summary, null, 2),
    'scripts/performance/k6-full-report.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options) {
  const metrics = data.metrics;
  
  return `
═══════════════════════════════════════════════════════════════════
                    K6 TEST RESULTS SUMMARY
═══════════════════════════════════════════════════════════════════

📊 REQUESTS
   Total Requests:     ${metrics.http_reqs?.values?.count || 0}
   Request Rate:       ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s
   Failed Requests:    ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%

⏱️  LATENCY
   Average:            ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms
   Median:             ${(metrics.http_req_duration?.values?.med || 0).toFixed(2)}ms
   P90:                ${(metrics.http_req_duration?.values['p(90)'] || 0).toFixed(2)}ms
   P95:                ${(metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms
   P99:                ${(metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms
   Max:                ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms

👥 VIRTUAL USERS
   Max VUs:            ${metrics.vus_max?.values?.value || 0}
   Iterations:         ${metrics.iterations?.values?.count || 0}

📈 CUSTOM METRICS
   Error Rate:         ${((metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%
   Render Jobs:        ${metrics.render_jobs_created?.values?.count || 0}
   API Latency Avg:    ${(metrics.api_latency?.values?.avg || 0).toFixed(2)}ms

═══════════════════════════════════════════════════════════════════
`;
}
