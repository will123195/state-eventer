const get = require('lodash.get')
const set = require('lodash.set')
const unset = require('lodash.unset')
const _ = { get, set, unset }

function pathToString(path) {
  if (typeof path === 'string') return path
  if (Array.isArray(path)) return path.join('.')
  throw new Error('`path` must be a string or array')
}

class StateEventer {

  constructor() {
    this.state = {}
    this.listeners = {}
  }

  get(path) {
    if (typeof path === 'undefined') return this.state
    return _.get(this.state, path)
  }

  notifyAllPathListeners(value) {
    Object.keys(this.listeners).forEach(path => {
      const oldValue = _.get(this.state, path)
      const newValue = _.get(value, path)
      if (oldValue === newValue) return
      this.listeners[path].forEach(listener => {
        listener({
          path,
          value: newValue,
          oldValue
        })
      })
    })
  }

  notifyChildPathListeners(path, value) {
    const pathString = pathToString(path)
    Object.keys(this.listeners).forEach(childPath => {
      const parentPath = `${pathString}.`
      if (!childPath.startsWith(parentPath)) return
      const oldChildValue = _.get(this.state, childPath)
      const relativeChildPath = childPath.substr(parentPath.length)
      const newChildValue = _.get(value, relativeChildPath)
      if (oldChildValue === newChildValue) return
      this.listeners[childPath].forEach(listener => {
        listener({
          path: childPath,
          value: newChildValue,
          oldValue: oldChildValue
        })
      })
    })
  }

  notifyPathListeners(path, value) {
    const oldValue = _.get(this.state, path)
    if (value === oldValue) return
    const pathString = pathToString(path)
    if (Array.isArray(this.listeners[pathString])) {
      this.listeners[pathString].forEach(listener => {
        listener({
          path: pathString,
          value,
          oldValue
        })
      })
    }
  }

  on(path, fn) {
    const pathString = pathToString(path)
    this.listeners[pathString] = this.listeners[pathString] || []
    this.listeners[pathString].push(fn)
  }

  set(path, value) {
    // if we're setting a new state at the root
    if (!!path && typeof path === 'object') {
      const val = path
      this.notifyAllPathListeners(val)
      this.state = val
      return
    }

    this.notifyPathListeners(path, value)
    this.notifyChildPathListeners(path, value)

    // finally change the state
    // TODO: having this last could cause race condition
    // (events emit before the value is actually changed)
    // but for now it's easier to emit the "oldValue" by doing this last
    _.set(this.state, path, value)
  }

  unset(path) {
    this.notifyPathListeners(path)
    this.notifyChildPathListeners(path)
    _.unset(this.state, path)
  }
}

module.exports = StateEventer
