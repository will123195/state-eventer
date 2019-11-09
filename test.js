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

state.on('a', handle)
state.on('a.b', handle)
state.on('a.b', handle)
state.on('a.b.c', handle)

state.set('a.b.c', 123)
state.set('a.b.c', 123)
state.set('a.b.d', 456)

assert.deepEqual(state.get(), { a: { b: { c: 123, d: 456 } } })
assert.deepEqual(state.get('a'), { b: { c: 123, d: 456 } })
assert.deepEqual(state.get('a.b'), { c: 123, d: 456 })
assert.deepEqual(state.get('a.b.c'), 123)

state.set('a', { b: 2 })
assert.deepEqual(state.get(), { a: { b: 2 } })

state.set({ x: 5, y: 6 })
assert.deepEqual(state.get(), { x: 5, y: 6 })

state.on('y', handle)
state.unset('y')
assert.deepEqual(state.get(), { x: 5 })

assert.deepEqual(counts, { 'a.b.c': 2, a: 2, 'a.b': 4, 'y': 1 })
assert.deepEqual(events[4].path, 'a.b.c')

console.log('PASS')
