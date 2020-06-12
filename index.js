const deepEqual = require('fast-deep-equal')
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
    Object.keys(this.listeners).forEach(listenerPath => {
      pathArray.some((leaf, i) => {
        const ancestorPath = pathArray.slice(0, i + 1).join('.')
        if (listenerPath !== ancestorPath) return
        const currentValue = _.get(this.state, ancestorPath)
        const oldValue = currentValue ? JSON.parse(JSON.stringify(currentValue)) : currentValue
        // TODO make this faster
        const futureState = JSON.parse(JSON.stringify(this.state))
        const action = (value !== undefined) ? 'set' : 'unset'
        _[action](futureState, path, value)
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
  shallowCopyAncestors(paths = []) {
    paths.forEach(path => {
      const obj = _.get(this.state, path)
      const value = Array.isArray(obj) ? [...obj] : {...obj}
      _.set(this.state, path, value)
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
    } else {
      Array.prototype.push.apply(notifications, this.notifyPathListeners(path, value))
      Array.prototype.push.apply(notifications, this.notifyChildPathListeners(path, value))
      const ancestorNotifications = this.notifyParentPathListeners(path, value)
      Array.prototype.push.apply(notifications, ancestorNotifications)
      _.set(this.state, path, value)
      const ancestorPaths = ancestorNotifications.map(a => a.param.path)
      this.shallowCopyAncestors(ancestorPaths)
    }
    notifications.forEach(notification => {
      notification.fn(notification.param)
    })
  }

  unset(path) {
    const notifications = []
    Array.prototype.push.apply(notifications, this.notifyPathListeners(path))
    Array.prototype.push.apply(notifications, this.notifyChildPathListeners(path))
    const ancestorNotifications = this.notifyParentPathListeners(path)
    Array.prototype.push.apply(notifications, ancestorNotifications)
    _.unset(this.state, path)
    const ancestorPaths = ancestorNotifications.map(a => a.param.path)
    this.shallowCopyAncestors(ancestorPaths)
    notifications.forEach(notification => {
      notification.fn(notification.param)
    })
  }
}

module.exports = StateEventer
