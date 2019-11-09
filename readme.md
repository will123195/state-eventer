# state-eventer

Read and write values to a state object and listen for changes at any given path

[![Build Status](https://travis-ci.org/will123195/state-eventer.svg?branch=master)](https://travis-ci.org/will123195/state-eventer)

## Install

```
npm i state-eventer
```

## Example

```js
// initialize an empty state
const state = new StateEventer()
state.get() // {}

// listen for state changes at specific paths
const listeners = [
  state.on('books', console.log),
  state.on('books.1', console.log)
]

// remove listener
listeners[0].off()

// add a new value to the state and notify listeners
state.set('books.1.title', 'War and Peace')

// retrieve values from the state
state.get()                // { books: { 1: { title: 'War and Peace' } } }
state.get('books')         // { 1: { title: 'War and Peace' } }
state.get('books.1')       // { title: 'War and Peace' }
state.get('books.1.title') // 'War and Peace'

// remove values from the state and notify listeners
state.unset('books.1.title')
state.get('books.1.title') // undefined

// reset the entire state and notify listeners
state.set({})
state.get() // {}

```

## Methods

### StateEventer

#### `on( path, listenerFn )`
- `path` (String|Array) the path to listen for changes
- `listenerFn` (Function) the function to call when the value changes

Returns `Listener` (see below)

#### `get( path )`
- `path` (String|Array) the path of the desired value

Returns the value at the given path

#### `set( path, value )`
- `path` (String|Array) the path at which to set the value
- `value` the value to set

#### `set( value )`
- `value` (Object) resets the root state to this value

#### `unset( path )`
- `path` (Object) removes this path from the state

### Listener

#### `off()` removes the listener

## License

MIT
