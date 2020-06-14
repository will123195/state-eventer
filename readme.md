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

// add/modify value and notify listeners
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

// transform
state.update('counter', n => n + 1, 0) // 1
```

## Methods

### StateEventer

#### `on( path, listenerFn )`
- `path` (String|Array) the path to listen for changes
- `listenerFn` (Function) the function to call when the value changes

Returns `Listener` (see below)

#### `get( path, [defaultValue] )`
- `path` (String|Array) the path of the desired value
- `defaultValue` (*) optional default value to return if the value at the specified path is undefined

#### `set( path, value )`
- `path` (String|Array) the path at which to set the value
- `value` the value to set

#### `set( value )`
- `value` (Object) resets the root state to this value

#### `unset( path )`
- `path` (String|Array) removes this path from the state

#### `update( path, transformFn, [defaultValue] )`
- `path` (String|Array) the path at which to set the value
- `transformFn` (Function) transform the current value to a new value
- `defaultValue` (*) optional default value to pass into the transform function if the value at the given path is undefined
  ```js
  update('counter', n => n + 1, 0)
  ```

### Listener

#### `off()` removes the listener

## License

MIT
