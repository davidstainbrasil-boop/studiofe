#!/usr/bin/env node
/**
 * 🧪 E2E Test: Collaboration with 2 Simultaneous Users
 * 
 * Testa o sistema de colaboração em tempo real com:
 * 1. Dois usuários conectando ao mesmo projeto
 * 2. Presença em tempo real (< 100ms)
 * 3. Sistema de locks de tracks
 * 4. Conflitos de edição
 * 5. Sincronização de alterações
 * 
 * Uso:
 *   npx tsx scripts/test-collaboration-e2e.ts
 */

import { io, Socket } from 'socket.io-client';

// ============================================================================
// Configuration
// ============================================================================

const SERVER_URL = process.env.COLLABORATION_URL || 'http://localhost:3001';
const PROJECT_ID = 'e2e-test-project-' + Date.now();

const USER_ALICE = {
  id: 'user-alice-' + Date.now(),
  name: 'Alice (User 1)',
  email: 'alice@test.com'
};

const USER_BOB = {
  id: 'user-bob-' + Date.now(),
  name: 'Bob (User 2)',
  email: 'bob@test.com'
};

// ============================================================================
// Test Utilities
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

function log(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m'
  };
  const reset = '\x1b[0m';
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${colors[type]}[${timestamp}]${reset} ${message}`);
}

async function test(name: string, fn: () => Promise<void>): Promise<boolean> {
  const start = Date.now();
  log(`\n🧪 Test: ${name}`, 'info');
  
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log(`  ✅ PASSED (${duration}ms)`, 'success');
    return true;
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, error: errorMsg });
    log(`  ❌ FAILED: ${errorMsg}`, 'error');
    return false;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertLatency(latency: number, maxMs: number, operation: string): void {
  if (latency > maxMs) {
    throw new Error(`${operation} took ${latency}ms (max: ${maxMs}ms)`);
  }
}

function createSocket(): Socket {
  return io(SERVER_URL, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: false,
    timeout: 5000
  });
}

function waitForEvent<T>(socket: Socket, event: string, timeout = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${event}`));
    }, timeout);
    
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Test Suites
// ============================================================================

async function runTests() {
  log('\n' + '='.repeat(60), 'info');
  log('🤝 E2E Collaboration Tests - 2 Simultaneous Users', 'info');
  log('='.repeat(60), 'info');
  log(`Server: ${SERVER_URL}`, 'info');
  log(`Project: ${PROJECT_ID}`, 'info');
  log(`Users: ${USER_ALICE.name}, ${USER_BOB.name}`, 'info');
  
  // Create sockets
  const aliceSocket = createSocket();
  const bobSocket = createSocket();
  
  try {
    // ========================================================================
    // Test 1: Both users can connect
    // ========================================================================
    await test('Both users can connect to server', async () => {
      const connectStart = Date.now();
      
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          aliceSocket.on('connect', resolve);
          aliceSocket.on('connect_error', reject);
          aliceSocket.connect();
        }),
        new Promise<void>((resolve, reject) => {
          bobSocket.on('connect', resolve);
          bobSocket.on('connect_error', reject);
          bobSocket.connect();
        })
      ]);
      
      const connectLatency = Date.now() - connectStart;
      assert(aliceSocket.connected, 'Alice should be connected');
      assert(bobSocket.connected, 'Bob should be connected');
      log(`    Connection latency: ${connectLatency}ms`, 'info');
    });
    
    // ========================================================================
    // Test 2: Users can join the same project
    // ========================================================================
    await test('Users can join the same project', async () => {
      const joinStart = Date.now();
      
      // Alice joins first
      aliceSocket.emit('collab:join', { projectId: PROJECT_ID, user: USER_ALICE });
      const aliceState = await waitForEvent<any>(aliceSocket, 'collab:state');
      
      assert(aliceState.projectId === PROJECT_ID, 'Alice should receive correct project ID');
      assert(aliceState.collaborators.length === 1, 'Alice should see 1 collaborator (herself)');
      
      // Bob joins
      bobSocket.emit('collab:join', { projectId: PROJECT_ID, user: USER_BOB });
      
      // Wait for both events
      const [bobState, aliceNotification] = await Promise.all([
        waitForEvent<any>(bobSocket, 'collab:state'),
        waitForEvent<any>(aliceSocket, 'user:joined')
      ]);
      
      const joinLatency = Date.now() - joinStart;
      
      assert(bobState.collaborators.length === 2, 'Bob should see 2 collaborators');
      assert(aliceNotification.name === USER_BOB.name, 'Alice should be notified of Bob joining');
      
      log(`    Join latency: ${joinLatency}ms`, 'info');
      assertLatency(joinLatency, 500, 'Join operation');
    });
    
    // ========================================================================
    // Test 3: Cursor updates sync in real-time (< 100ms target)
    // ========================================================================
    await test('Cursor updates sync in < 100ms', async () => {
      const cursorLatencies: number[] = [];
      
      // Test 5 cursor updates
      for (let i = 0; i < 5; i++) {
        const cursorStart = Date.now();
        const cursor = { x: 100 + i * 50, y: 200 + i * 30, timestamp: cursorStart };
        
        aliceSocket.emit('cursor:move', { projectId: PROJECT_ID, cursor });
        
        const received = await waitForEvent<any>(bobSocket, 'cursor:move', 1000);
        const cursorLatency = Date.now() - cursorStart;
        cursorLatencies.push(cursorLatency);
        
        assert(received.cursor.x === cursor.x, 'Cursor X should match');
        assert(received.cursor.y === cursor.y, 'Cursor Y should match');
      }
      
      const avgLatency = cursorLatencies.reduce((a, b) => a + b, 0) / cursorLatencies.length;
      const maxLatency = Math.max(...cursorLatencies);
      
      log(`    Avg cursor latency: ${avgLatency.toFixed(1)}ms`, 'info');
      log(`    Max cursor latency: ${maxLatency}ms`, 'info');
      
      assertLatency(avgLatency, 100, 'Average cursor sync');
    });
    
    // ========================================================================
    // Test 4: Lock acquisition works
    // ========================================================================
    await test('User can acquire track lock', async () => {
      const trackId = 'track-audio-1';
      const lockStart = Date.now();
      
      aliceSocket.emit('lock:request', { projectId: PROJECT_ID, trackId });
      
      const [aliceLock, bobNotification] = await Promise.all([
        waitForEvent<any>(aliceSocket, 'lock:acquired'),
        waitForEvent<any>(bobSocket, 'lock:acquired')
      ]);
      
      const lockLatency = Date.now() - lockStart;
      
      assert(aliceLock.lock.trackId === trackId, 'Lock should be for correct track');
      assert(aliceLock.lock.userId === USER_ALICE.id, 'Lock should belong to Alice');
      assert(bobNotification.lock.trackId === trackId, 'Bob should see lock notification');
      
      log(`    Lock acquisition latency: ${lockLatency}ms`, 'info');
      assertLatency(lockLatency, 200, 'Lock acquisition');
    });
    
    // ========================================================================
    // Test 5: Lock conflict detection
    // ========================================================================
    await test('Lock conflict is properly detected', async () => {
      const trackId = 'track-audio-1'; // Same track Alice locked
      
      bobSocket.emit('lock:request', { projectId: PROJECT_ID, trackId });
      
      const denied = await waitForEvent<any>(bobSocket, 'lock:denied');
      
      assert(denied.trackId === trackId, 'Denied for correct track');
      assert(denied.error.includes('bloqueada'), 'Error message mentions track is locked');
      assert(denied.existingLock.userId === USER_ALICE.id, 'Shows Alice as lock owner');
      
      log(`    Lock denied correctly for Bob`, 'info');
    });
    
    // ========================================================================
    // Test 6: Timeline changes sync in real-time
    // ========================================================================
    await test('Timeline changes sync in < 100ms', async () => {
      const changeStart = Date.now();
      
      const change = {
        id: 'change-' + Date.now(),
        type: 'element:update',
        projectId: PROJECT_ID,
        trackId: 'track-audio-1',
        elementId: 'element-123',
        data: { volume: 0.8, start: 10.5 }
      };
      
      aliceSocket.emit('change:broadcast', { projectId: PROJECT_ID, change });
      
      const [ack, bobReceived] = await Promise.all([
        waitForEvent<any>(aliceSocket, 'change:ack'),
        waitForEvent<any>(bobSocket, 'change:broadcast')
      ]);
      
      const syncLatency = Date.now() - changeStart;
      
      assert(ack.accepted === true, 'Change should be accepted');
      assert(bobReceived.change.id === change.id, 'Bob should receive same change ID');
      assert(bobReceived.change.data.volume === 0.8, 'Change data should be intact');
      
      log(`    Change sync latency: ${syncLatency}ms`, 'info');
      log(`    Server ACK latency: ${ack.latency}ms`, 'info');
      
      assertLatency(syncLatency, 100, 'Change synchronization');
    });
    
    // ========================================================================
    // Test 7: Change blocked when track locked by another user
    // ========================================================================
    await test('Changes blocked on locked tracks', async () => {
      const change = {
        id: 'change-conflict-' + Date.now(),
        type: 'element:update',
        projectId: PROJECT_ID,
        trackId: 'track-audio-1', // Locked by Alice
        elementId: 'element-456',
        data: { volume: 0.5 }
      };
      
      bobSocket.emit('change:broadcast', { projectId: PROJECT_ID, change });
      
      const conflict = await waitForEvent<any>(bobSocket, 'change:conflict');
      
      assert(conflict.changeId === change.id, 'Conflict for correct change');
      assert(conflict.reason.includes('bloqueada'), 'Reason mentions track is locked');
      
      log(`    Conflict correctly detected for Bob's change`, 'info');
    });
    
    // ========================================================================
    // Test 8: Lock release works
    // ========================================================================
    await test('Lock release works and notifies others', async () => {
      const trackId = 'track-audio-1';
      const releaseStart = Date.now();
      
      aliceSocket.emit('lock:release', { projectId: PROJECT_ID, trackId });
      
      const [aliceRelease, bobRelease] = await Promise.all([
        waitForEvent<any>(aliceSocket, 'lock:released'),
        waitForEvent<any>(bobSocket, 'lock:released')
      ]);
      
      const releaseLatency = Date.now() - releaseStart;
      
      assert(aliceRelease.trackId === trackId, 'Alice sees release');
      assert(bobRelease.trackId === trackId, 'Bob sees release');
      
      log(`    Lock release latency: ${releaseLatency}ms`, 'info');
      
      // Now Bob can acquire the lock
      bobSocket.emit('lock:request', { projectId: PROJECT_ID, trackId });
      const bobLock = await waitForEvent<any>(bobSocket, 'lock:acquired');
      assert(bobLock.lock.userId === USER_BOB.id, 'Bob can now acquire lock');
      
      log(`    Bob successfully acquired lock after release`, 'info');
    });
    
    // ========================================================================
    // Test 9: User disconnect releases locks
    // ========================================================================
    await test('User disconnect releases all locks', async () => {
      // Bob has the lock from previous test
      const trackId = 'track-audio-1';
      
      // Disconnect Bob
      bobSocket.disconnect();
      
      // Alice should receive lock released notification
      const released = await waitForEvent<any>(aliceSocket, 'lock:released', 2000);
      
      assert(released.trackId === trackId, 'Lock should be released');
      assert(released.userId === USER_BOB.id, 'Released by Bob');
      
      log(`    Lock automatically released on disconnect`, 'info');
      
      // Also should receive user left
      // Note: This might have already fired, so we won't assert it
    });
    
    // ========================================================================
    // Test 10: Reconnection and rejoin
    // ========================================================================
    await test('User can reconnect and rejoin', async () => {
      // Reconnect Bob
      bobSocket.connect();
      await waitForEvent<void>(bobSocket, 'connect');
      
      bobSocket.emit('collab:join', { projectId: PROJECT_ID, user: USER_BOB });
      
      const [bobState, aliceNotification] = await Promise.all([
        waitForEvent<any>(bobSocket, 'collab:state'),
        waitForEvent<any>(aliceSocket, 'user:joined')
      ]);
      
      assert(bobState.collaborators.length === 2, 'Bob sees 2 collaborators after rejoin');
      assert(aliceNotification.name === USER_BOB.name, 'Alice notified of Bob rejoining');
      
      log(`    Bob successfully reconnected and rejoined`, 'info');
    });
    
  } finally {
    // Cleanup
    aliceSocket.disconnect();
    bobSocket.disconnect();
  }
  
  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(r => {
    const icon = r.passed ? '✅' : '❌';
    const duration = `${r.duration}ms`.padStart(6);
    console.log(`${icon} ${r.name.padEnd(45)} ${duration}`);
    if (r.error) {
      console.log(`   └─ Error: ${r.error}`);
    }
  });
  
  console.log('─'.repeat(60));
  console.log(`Total: ${passed}/${results.length} passed, ${failed} failed`);
  console.log(`Duration: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log('\n❌ TESTS FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED');
    process.exit(0);
  }
}

// ============================================================================
// Run
// ============================================================================

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
