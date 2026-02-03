/* eslint-disable no-console */
/**
 * K6 Spike Test - Teste de picos de carga
 * 
 * Simula cenários de pico repentino de usuários
 * Execução: k6 run scripts/performance/k6-spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Métricas
const errorRate = new Rate('spike_errors');
const latencyTrend = new Trend('spike_latency');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const recoveryCounter = new Counter('spike_recovery_checks');

export const options = {
  stages: [
    // Warmup
    { duration: '30s', target: 10 },
    
    // Spike 1: 10 → 100 em 10 segundos
    { duration: '10s', target: 100 },
    { duration: '30s', target: 100 },  // Sustenta pico
    { duration: '20s', target: 10 },   // Recuperação
    
    // Estabilização
    { duration: '1m', target: 10 },
    
    // Spike 2: 10 → 200 em 5 segundos (mais agressivo)
    { duration: '5s', target: 200 },
    { duration: '20s', target: 200 },  // Sustenta pico
    { duration: '30s', target: 10 },   // Recuperação
    
    // Estabilização final
    { duration: '1m', target: 10 },
    
    // Spike 3: Máximo - 10 → 500 instantâneo
    { duration: '1s', target: 500 },
    { duration: '10s', target: 500 },
    { duration: '1m', target: 0 },     // Cooldown
  ],
  
  thresholds: {
    // Durante picos, tolerância maior
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.20'],  // Até 20% de falha aceitável em spike
    spike_errors: ['rate<0.30'],
  },
};

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

export default function() {
  // Mix de operações leves e pesadas
  const operation = Math.random();
  
  if (operation < 0.5) {
    // 50% - Health check (leve)
    const res = http.get(`${BASE_URL}/api/health`, {
      headers: getHeaders(),
      tags: { operation: 'health' },
    });
    
    latencyTrend.add(res.timings.duration);
    const success = check(res, {
      'spike health - status ok': (r) => r.status === 200,
    });
    errorRate.add(!success);
    
  } else if (operation < 0.8) {
    // 30% - Listagem (médio)
    const res = http.get(`${BASE_URL}/api/render/jobs`, {
      headers: getHeaders(),
      tags: { operation: 'listing' },
    });
    
    latencyTrend.add(res.timings.duration);
    const success = check(res, {
      'spike listing - valid response': (r) => [200, 401, 429].includes(r.status),
    });
    errorRate.add(!success);
    
  } else {
    // 20% - Operação pesada
    const payload = JSON.stringify({
      text: 'Texto de teste para spike test',
      options: { format: 'srt' },
    });
    
    const res = http.post(`${BASE_URL}/api/subtitles?operation=generate`, payload, {
      headers: getHeaders(),
      tags: { operation: 'heavy' },
    });
    
    latencyTrend.add(res.timings.duration);
    const success = check(res, {
      'spike heavy - valid response': (r) => [200, 201, 429, 503].includes(r.status),
    });
    errorRate.add(!success);
  }
  
  // Pequena pausa para não sobrecarregar
  sleep(Math.random() * 0.5);
}

export function setup() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              K6 SPIKE TEST - TécnicoCursos                    ║
╠════════════════════════════════════════════════════════════════╣
║  Simula picos de: 100 → 200 → 500 usuários simultâneos        ║
║  Objetivo: Validar comportamento sob carga extrema            ║
╚════════════════════════════════════════════════════════════════╝
  `);
  
  return { startTime: Date.now() };
}

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000 / 60).toFixed(2);
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                    SPIKE TEST COMPLETED                       ║
╠════════════════════════════════════════════════════════════════╣
║  Duration: ${duration} minutes                                        ║
║  Check results above for spike behavior analysis              ║
╚════════════════════════════════════════════════════════════════╝
  `);
}
