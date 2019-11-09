# state-eventer

Get/set state and listen for changes

[![Build Status](https://travis-ci.org/will123195/state-eventer.svg?branch=master)](https://travis-ci.org/will123195/state-eventer)

## Install

```
npm i state-eventer
```

## Example

```js
const state = new StateEventer()

state.on('books', console.log)
state.on('books.0', console.log)

state.set({}) // reset the entire state
state.set('books.0.title', 'War and Peace')

state.get()                // { books: { 0: { title: 'War and Peace' } } }
state.get('books')         // { 0: { title: 'War and Peace' } }
state.get('books.0')       // { title: 'War and Peace' }
state.get('books.0.title') // 'War and Peace'

state.unset('books.0.title')
state.get('books.0.title') // undefined
```

## Methods

#### `on( path, listener )`
- `path` (String|Array) the path to listen for changes
- `listener` (Function) the function to call when the value changes

#### `get( path )`
- `path` (String|Array) retrieves the value at this path

#### `set( path, value )`
- `path` (String|Array) the path at which to set the value
- `value` the value to set

#### `set( value )`
- `value` (Object) resets the root state to this value

#### `unset( path )`
- `path` (Object) removes this path from the state

## License

MIT
