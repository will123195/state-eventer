const deepEqual = require('fast-deep-equal')
const get = require('lodash.get')
const set = require('lodash.set')
const unset = require('lodash.unset')
const _ = { get, set, unset }

const listenersKey = '$$_listeners'

let lastTime = Date.now()
function elapsed(label) {
  console.log(label, Date.now() - lastTime, 'ms')
  lastTime = Date.now()
}

function pathToString(path) {
  if (typeof path === 'string') return path
  if (Array.isArray(path)) return path.join('.')
  throw new Error('`path` must be a string or array')
}

class StateEventer {

  constructor() {
    this.state = {}
    this.listenerTree = {}
  }

  get(path, defaultValue) {
    if (typeof path === 'undefined') return this.state
    return _.get(this.state, path, defaultValue)
  }

  on(path, fn) {
    const pathString = pathToString(path)
    const id = `${Math.random()}`.substr(2)
    const off = () => {
      this.removeListener(pathString, id)
    }
    const listener = { fn, off }
    _.set(this.listenerTree, `${pathString}.${listenersKey}.${id}`, listener)
    return listener
  }

  removeListener(path, id) {
    const pathString = pathToString(path)
    _.unset(this.listenerTree, `${pathString}.${listenersKey}.${id}`)
    // if there are no other listeners at this path, clean up the tree
    const otherListeners = _.get(this.listenerTree, `${pathString}.${listenersKey}`)
    if (Object.keys(otherListeners).length === 0) {
      // remove listenersKey at this path
      _.unset(this.listenerTree, `${pathString}.${listenersKey}`)
    }
    const hasChildren = !!Object.keys(_.get(this.listenerTree, pathString)).length
    if (!hasChildren) {
      // remove this path from the listenerTree
      _.unset(this.listenerTree, pathString)
    }
  }

  // get ancestor paths that have listeners (inclusive of path provided)
  getAncestors(path) {
    const pathString = pathToString(path)
    const props = pathString.split('.')
    const paths = props.map((prop, i) => props.slice(0, i + 1).join('.'))
    return paths
      .filter(p => !!_.get(this.listenerTree, `${p}.${listenersKey}`))
      .map(p => {
        const value = _.get(this.state, p)
        return [p, JSON.stringify(value)]
      })
  }

  // get the child paths that have listeners
  getChildren(path, children = []) {
    const pathString = pathToString(path)
    const obj = !!pathString
      ? _.get(this.listenerTree, pathString)
      : this.listenerTree
    if (!obj) return children
    Object.keys(obj).forEach(child => {
      if (child === listenersKey) return
      const childPath = pathString ? `${pathString}.${child}` : child
      const listeners = _.get(this.listenerTree, `${childPath}.${listenersKey}`)
      if (listeners) {
        const value = _.get(this.state, childPath)
        children.push([childPath, JSON.stringify(value)])
      }
      this.getChildren(childPath, children)
    })
    return children
  }

  emitPath({ pathString, value, oldValue }) {
    const listeners = _.get(this.listenerTree, `${pathString}.${listenersKey}`)
    Object.keys(listeners).forEach(id => {
      elapsed(`emit id ${id}`)
      // setTimeout(() => {
        listeners[id].fn({
          path: pathString,
          value,
          oldValue
        })
      // }, 0)
      elapsed(`emitted id ${id}`)
    })
  }

  emitPaths(paths) {
    elapsed(`emitPaths (${paths.length} paths)`)
    paths.forEach(p => {
      const [pathString, oldValueStr] = p
      const oldValue = oldValueStr ? JSON.parse(oldValueStr) : oldValueStr
      const value = _.get(this.state, pathString)
      if (deepEqual(value, oldValue)) return
      this.emitPath({
        pathString, 
        value,
        oldValue
      })
    })
  }

  set(path, value) {
    elapsed(`set ${path} = ${value}`)
    const paths = [] // paths with listeners
    if (!!path && typeof path === 'object' && !Array.isArray(path)) {
      // we're setting a new state at the root
      const val = path
      const children = this.getChildren('')
      Array.prototype.push.apply(paths, children)
      this.state = val
    } else {
      // a path was provided
      Array.prototype.push.apply(paths, this.getChildren(path))
      Array.prototype.push.apply(paths, this.getAncestors(path))
      _.set(this.state, path, value)
    }
    this.emitPaths(paths)
    elapsed(`done setting ${path} = ${value}`)
  }

  unset(path) {
    const paths = [
      ...this.getChildren(path),
      ...this.getAncestors(path)
    ]
    _.unset(this.state, path)
    this.emitPaths(paths)
  }
}

module.exports = StateEventer
