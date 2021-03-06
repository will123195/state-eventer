const deepEqual = require('fast-deep-equal')
const get = require('lodash.get')
const set = require('lodash.set')
const unset = require('lodash.unset')
const cloneDeep = require('lodash.clonedeep')
const _ = { get, set, unset, cloneDeep }

function isObject (x) {
  return Object.prototype.toString.call(x) === '[object Object]'
}

function pathToString(path) {
  if (typeof path === 'string') return path
  if (Array.isArray(path)) return path.join('.')
  throw new Error('`path` must be a string or array')
}

function shallowCopy(value) { // todo: consider using lodash.clone
  let newValue = value
  if (isObject(value)) newValue = { ...value }
  if (Array.isArray(value)) newValue = [...value]
  return newValue
}

class StateEventer {

  constructor() {
    this.state = {}
    this.listeners = {}
    this.snapshot = {}
  }

  get(path, defaultValue) {
    if (typeof path === 'undefined') return this.state
    return _.get(this.state, path, defaultValue)
  }

  notifyAllPathListeners(value) {
    const notifications = []
    Object.keys(this.listeners).forEach(path => {
      const oldValue = _.get(this.state, path)
      const newValue = _.get(value, path)
      if (oldValue === newValue) return
      this.listeners[path].forEach(listener => {
        notifications.push({
          fn: listener.fn,
          param: {
            path,
            value: newValue,
            oldValue
          }
        })
      })
    })
    return notifications
  }

  notifyChildPathListeners(path, value) {
    const notifications = []
    const pathString = pathToString(path)
    Object.keys(this.listeners).forEach(childPath => {
      const parentPath = `${pathString}.`
      if (!childPath.startsWith(parentPath)) return
      const oldChildValue = _.get(this.state, childPath)
      const relativeChildPath = childPath.substr(parentPath.length)
      const newChildValue = _.get(value, relativeChildPath)
      if (oldChildValue === newChildValue) return
      this.listeners[childPath].forEach(listener => {
        notifications.push({
          fn: listener.fn,
          param: {
            path: childPath,
            value: newChildValue,
            oldValue: oldChildValue
          }
        })
      })
    })
    return notifications
  }

  notifyParentPathListeners(path, value) {
    const notifications = []
    let pathString = pathToString(path)
    const pathArray = pathString.split('.').slice(0, -1)
    pathString = pathArray.join('.')
    if (!pathString) return []
    const listenerPaths = Object.keys(this.listeners)
    if (!listenerPaths.length) return
    const futureState = cloneDeep(this.snapshot)
    const action = (value !== undefined) ? 'set' : 'unset'
    _[action](futureState, path, value)
    listenerPaths.forEach(listenerPath => {
      pathArray.some((leaf, i) => {
        const ancestorPath = pathArray.slice(0, i + 1).join('.')
        if (listenerPath !== ancestorPath) return
        const oldValue = _.get(this.snapshot, ancestorPath)
        const newValue = _.get(futureState, listenerPath)
        if (deepEqual(newValue, oldValue)) return
        this.listeners[ancestorPath].forEach(listener => {
          const param = {
            path: ancestorPath,
            value: newValue,
            oldValue
          }
          notifications.push({
            fn: listener.fn,
            param
          })
        })
        return true
      })
    })
    return notifications
  }

  notifyPathListeners(path, value) {
    const notifications = []
    const oldValue = _.get(this.state, path)
    if (value === oldValue) return
    const pathString = pathToString(path)
    if (Array.isArray(this.listeners[pathString])) {
      this.listeners[pathString].forEach(listener => {
        notifications.push({
          fn: listener.fn,
          param: {
            path: pathString,
            value,
            oldValue
          }
        })
      })
    }
    return notifications
  }

  on(path, fn) {
    const pathString = pathToString(path)
    const id = Math.random()
    const off = () => {
      this.removeListener(pathString, id)
    }
    const listener = { id, fn, off }
    this.listeners[pathString] = this.listeners[pathString] || []
    this.listeners[pathString].push(listener)
    return listener
  }

  removeListener(path, id) {
    const i = this.listeners[path].findIndex(l => l.id === id)
    // TODO: this.listeners[path] should be an object instead of array to
    // prevent possible race condition causing wrong listener to be removed
    this.listeners[path].splice(i, 1)
    if (this.listeners[path].length === 0) {
      delete this.listeners[path]
    }
  }

  // give each ancestor in the path a new reference
  shallowCopyAncestors(path) {
    const pathArr = pathToString(path).split('.')
    const paths = pathArr.map((p, i) => pathArr.slice(0, i + 1).join('.'))
    paths.forEach(path => {
      let value = _.get(this.state, path)
      if (value === undefined) return
      _.set(this.state, path, shallowCopy(value))
    })
  }

  update(path, transformFn, defaultValue) {
    const oldValue = this.get(path, defaultValue)
    const newValue = transformFn(oldValue)
    this.set(path, newValue)
  }

  set(path, value) {
    const notifications = []
    // if we're setting a new state at the root
    if (!!path && typeof path === 'object' && !Array.isArray(path)) {
      const val = path
      Array.prototype.push.apply(notifications, this.notifyAllPathListeners(val))
      this.state = val
      this.snapshot = cloneDeep(this.state)
    } else {
      const originalValue = _.get(this.snapshot, path)
      if (value && deepEqual(value, originalValue)) return
      Array.prototype.push.apply(notifications, this.notifyPathListeners(path, value))
      Array.prototype.push.apply(notifications, this.notifyChildPathListeners(path, value))
      Array.prototype.push.apply(notifications, this.notifyParentPathListeners(path, value))
      _.set(this.state, path, value)
      this.snapshot = cloneDeep(this.state)
      this.shallowCopyAncestors(path)
    }
    notifications.forEach(notification => {
      notification.fn(notification.param)
    })
  }

  unset(path) {
    const originalValue = _.get(this.snapshot, path)
    if (originalValue === undefined) return
    const notifications = []
    Array.prototype.push.apply(notifications, this.notifyPathListeners(path))
    Array.prototype.push.apply(notifications, this.notifyChildPathListeners(path))
    Array.prototype.push.apply(notifications, this.notifyParentPathListeners(path))
    _.unset(this.state, path)
    this.snapshot = cloneDeep(this.state)
    this.shallowCopyAncestors(path)
    notifications.forEach(notification => {
      notification.fn(notification.param)
    })
  }
}

module.exports = StateEventer
