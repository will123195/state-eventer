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
  state.on('a', handle),     //
  state.on('a.b', handle),   //
  state.on('a.b', handle),   //
  state.on('a.b.c', handle)  //
]

state.set('a.b.c', 123)
// console.log(`state.set('a.b.c', 123)`, counts)
state.set('a.b.c', 123)
// console.log(`state.set('a.b.c', 123)`, counts)
state.set('a.b.d', 456)
// console.log(`state.set('a.b.d', 456)`, counts)
state.set('a.b.d', 456)
// console.log(`state.set('a.b.d', 456)`, counts)

assert.deepEqual(state.get(), { a: { b: { c: 123, d: 456 } } })
assert.deepEqual(state.get('a'), { b: { c: 123, d: 456 } })
assert.deepEqual(state.get('a.b'), { c: 123, d: 456 })
assert.deepEqual(state.get('a.b.c'), 123)

state.set('a', { b: 2 })
// console.log(`state.set('a', { b: 2 })`, counts)
assert.deepEqual(state.get(), { a: { b: 2 } })

state.set({ x: 5, y: 6 })
// console.log(`state.set({ x: 5, y: 6 })`, counts)
assert.deepEqual(state.get(), { x: 5, y: 6 })

state.on('y', handle)

state.unset('y')
assert.deepEqual(state.get(), { x: 5 })

assert.deepEqual(counts, { 'a.b.c': 2, a: 4, 'a.b': 8, 'y': 1 })
assert.deepEqual(events[10].path, 'a.b.c')

assert.ok(state.listeners['a.b'].length, 2)
listeners[2].off()
assert.ok(state.listeners['a.b'].length, 1)

console.log('PASS')
