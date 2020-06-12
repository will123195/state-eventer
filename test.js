const StateEventer = require('.')
const assert = require('assert')

const state = new StateEventer()

const events = []
const counts = {}

function handle(event) {
  events.push(event)
  counts[event.path] = counts[event.path] || 0
  counts[event.path] += 1
}

const listeners = [
  state.on('a', handle),
  state.on('a.b', handle),
  state.on('a.b', handle),
  state.on('a.b.c', handle)
]

// mutations using set() give ancestors new reference
state.set(['a', 'b', 'c'], 123)
assert.deepEqual(counts, { a: 1, 'a.b': 2, 'a.b.c': 1 })
state.set('a.b.c', 123)
const ab1 = state.get('a.b')
assert.deepEqual(counts, { a: 1, 'a.b': 2, 'a.b.c': 1 })
state.set('a.b.d', 456)
const ab2 = state.get('a.b')
assert(ab1 !== ab2)
assert.deepEqual(counts, { a: 2, 'a.b': 4, 'a.b.c': 1 })
state.set('a.b.d', 456)
const ab3 = state.get('a.b')
assert(ab2 === ab3)
assert.deepEqual(counts, { a: 2, 'a.b': 4, 'a.b.c': 1 })

// get any path
assert.deepEqual(state.get(), { a: { b: { c: 123, d: 456 } } })
assert.deepEqual(state.get('a'), { b: { c: 123, d: 456 } })
assert.deepEqual(state.get('a.b'), { c: 123, d: 456 })
assert.deepEqual(state.get('a.b.c'), 123)

// only emit change events if the value/object has been changed/mutated
state.set('a', { b: 2 })
assert.deepEqual(counts, { a: 3, 'a.b': 6, 'a.b.c': 2 })
assert.deepEqual(state.get(), { a: { b: 2 } })

state.set({ x: 5, y: 6 })
assert.deepEqual(counts, { a: 4, 'a.b': 8, 'a.b.c': 2 })
assert.deepEqual(state.get(), { x: 5, y: 6 })

state.on('y', handle)

state.unset('y')
assert.deepEqual(state.get(), { x: 5 })

assert.deepEqual(counts, { 'a.b.c': 2, a: 4, 'a.b': 8, 'y': 1 })

// listeners can be removed
assert.equal(Object.keys(state.listeners).length, 4)
assert.equal(state.listeners['a.b'].length, 2)
listeners[2].off()
assert.equal(Object.keys(state.listeners).length, 4)
assert.equal(state.listeners['a.b'].length, 1)
listeners[3].off()
assert.equal(Object.keys(state.listeners).length, 3)

// can specify default values
assert.equal(state.get('not-found', 12345), 12345)

// mutations using unset() give ancestors new reference
state.set('a.b.c', 3)
const b1 = state.get('a.b')
state.unset('a.b.c')
const b2 = state.get('a.b')
assert(b1 !== b2)
state.unset('a.b.c')
const b3 = state.get('a.b')
assert(b2 === b3)

// transform function
state.update('a.b.c', n => n + 1, 5)
assert.equal(state.get('a.b.c'), 6)

console.log('PASS')
