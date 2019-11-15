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
    const pathString = pathToString(path)
    const pathArray = pathString.split('.')
    pathArray.forEach((leaf, i) => {
      const ancestorPath = pathArray.slice(0, i + 1).join('.')
      Object.keys(this.listeners).forEach(listenerPath => {
        if (listenerPath !== ancestorPath) return
        // the new value isn't set yet, but this reference will update
        const newValue = _.get(this.state, ancestorPath)
        const oldValue = JSON.parse(JSON.stringify(newValue))
        this.listeners[ancestorPath].forEach(listener => {
          notifications.push({
            fn: listener.fn,
            param: {
              path: ancestorPath,
              value: newValue,
              oldValue
            }
          })
        })
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

  set(path, value) {
    const notifications = []
    // if we're setting a new state at the root
    if (!!path && typeof path === 'object') {
      const val = path
      Array.prototype.push.apply(notifications, this.notifyAllPathListeners(val))
      this.state = val
    } else {
      const pathNotifications = this.notifyPathListeners(path, value)
      Array.prototype.push.apply(notifications, pathNotifications)
      Array.prototype.push.apply(notifications, this.notifyChildPathListeners(path, value))
      Array.prototype.push.apply(notifications, this.notifyParentPathListeners(path, value))
      _.set(this.state, path, value)
    }
    notifications.forEach(notification => {
      notification.fn(notification.param)
    })
  }

  unset(path) {
    const notifications = []
    const pathNotifications = this.notifyPathListeners(path)
    Array.prototype.push.apply(notifications, pathNotifications)
    Array.prototype.push.apply(notifications, this.notifyChildPathListeners(path))
    Array.prototype.push.apply(notifications, this.notifyParentPathListeners(path))
    _.unset(this.state, path)
    notifications.forEach(notification => {
      notification.fn(notification.param)
    })
  }
}

module.exports = StateEventer
