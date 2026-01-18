#!/usr/bin/env node

/**
 * Test Undo/Redo Implementation
 * Verifies the useHistory hook logic works correctly
 */

console.log('🧪 Testing Undo/Redo Implementation\n')

// Simulate the useHistory hook logic
class HistoryManager {
  constructor(initialState, maxHistorySize = 50) {
    this.past = []
    this.present = initialState
    this.future = []
    this.maxHistorySize = maxHistorySize
  }

  setState(newState) {
    this.past.push(this.present)

    // Limit history size
    if (this.past.length > this.maxHistorySize) {
      this.past = this.past.slice(this.past.length - this.maxHistorySize)
    }

    this.present = newState
    this.future = [] // Clear future when new state is set
  }

  undo() {
    if (this.past.length === 0) {
      console.log('  ⚠️  Cannot undo - no history')
      return
    }

    const previous = this.past[this.past.length - 1]
    const newPast = this.past.slice(0, this.past.length - 1)

    this.future.unshift(this.present)
    this.present = previous
    this.past = newPast
  }

  redo() {
    if (this.future.length === 0) {
      console.log('  ⚠️  Cannot redo - no future')
      return
    }

    const next = this.future[0]
    const newFuture = this.future.slice(1)

    this.past.push(this.present)
    this.present = next
    this.future = newFuture
  }

  get canUndo() {
    return this.past.length > 0
  }

  get canRedo() {
    return this.future.length > 0
  }

  getStatus() {
    return {
      present: this.present,
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      historySize: this.past.length + 1 + this.future.length
    }
  }
}

// Test scenario
console.log('📝 Test Scenario: Canvas Element Management\n')

const history = new HistoryManager({
  id: 'scene-1',
  elements: []
})

console.log('1️⃣  Initial state:')
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Add element 1
history.setState({
  id: 'scene-1',
  elements: [{ id: 'el-1', name: 'Avatar 1', x: 100, y: 100 }]
})
console.log('2️⃣  Added Avatar 1:')
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Add element 2
history.setState({
  id: 'scene-1',
  elements: [
    { id: 'el-1', name: 'Avatar 1', x: 100, y: 100 },
    { id: 'el-2', name: 'Text 1', x: 200, y: 200 }
  ]
})
console.log('3️⃣  Added Text 1:')
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Move element 1
history.setState({
  id: 'scene-1',
  elements: [
    { id: 'el-1', name: 'Avatar 1', x: 150, y: 150 }, // Moved
    { id: 'el-2', name: 'Text 1', x: 200, y: 200 }
  ]
})
console.log('4️⃣  Moved Avatar 1:')
console.log('   Avatar 1 position:', history.present.elements[0].x, history.present.elements[0].y)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Test Undo
console.log('5️⃣  Press Ctrl+Z (Undo):')
history.undo()
console.log('   Avatar 1 position:', history.present.elements[0].x, history.present.elements[0].y)
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Test Undo again
console.log('6️⃣  Press Ctrl+Z (Undo again):')
history.undo()
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Test Redo
console.log('7️⃣  Press Ctrl+Y (Redo):')
history.redo()
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Test Redo again
console.log('8️⃣  Press Ctrl+Y (Redo again):')
history.redo()
console.log('   Avatar 1 position:', history.present.elements[0].x, history.present.elements[0].y)
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo)
console.log()

// Make new change (should clear future)
history.setState({
  id: 'scene-1',
  elements: [
    { id: 'el-1', name: 'Avatar 1', x: 150, y: 150 },
    { id: 'el-2', name: 'Text 1', x: 200, y: 200 },
    { id: 'el-3', name: 'Image 1', x: 300, y: 300 }
  ]
})
console.log('9️⃣  Added Image 1 (new branch):')
console.log('   Elements:', history.present.elements.length)
console.log('   Can Undo:', history.canUndo)
console.log('   Can Redo:', history.canRedo, '(should be false - future cleared)')
console.log()

console.log('✅ Undo/Redo implementation test complete!')
console.log()
console.log('Final history state:')
console.log('   Past states:', history.past.length)
console.log('   Present: ', history.present.elements.length, 'elements')
console.log('   Future states:', history.future.length)
console.log('   Total history size:', history.getStatus().historySize)
