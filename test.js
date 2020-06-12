const StateEventer = require('.')
const assert = require('assert')

const state = new StateEventer()

const listenerKey = '$$_listeners'
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

state.set(['a', 'b', 'c'], 123)
assert.deepEqual(counts, { a: 1, 'a.b': 2, 'a.b.c': 1 })
state.set('a.b.c', 123)
assert.deepEqual(counts, { a: 1, 'a.b': 2, 'a.b.c': 1 })
state.set('a.b.d', 456)
assert.deepEqual(counts, { a: 2, 'a.b': 4, 'a.b.c': 1 })
state.set('a.b.d', 456)
assert.deepEqual(counts, { a: 2, 'a.b': 4, 'a.b.c': 1 })

assert.deepEqual(state.get(), { a: { b: { c: 123, d: 456 } } })
assert.deepEqual(state.get('a'), { b: { c: 123, d: 456 } })
assert.deepEqual(state.get('a.b'), { c: 123, d: 456 })
assert.deepEqual(state.get('a.b.c'), 123)

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

assert.equal(Object.keys(state.listenerTree.a.b[listenerKey]).length, 2)
listeners[2].off()
assert.equal(Object.keys(state.listenerTree.a.b[listenerKey]).length, 1)

assert.equal(state.get('not-found', 12345), 12345)

console.log('PASS')
