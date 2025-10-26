/**
 * ObjectPool - reuses objects to avoid garbage collection.
 * Critical for particles, projectiles, and effects that are frequently created/destroyed.
 * Performance target: Zero-allocation retrieval.
 */
export class ObjectPool {
  constructor(factory, initialSize = 10) {
    this.factory = factory;
    this.available = [];
    this.inUse = new Set();

    for (let i = 0; i < initialSize; i++) {
      this.available.push(this.factory());
    }
  }

  acquire() {
    let obj = this.available.pop() || this.factory();
    this.inUse.add(obj);
    return obj;
  }

  release(obj) {
    if (this.inUse.has(obj)) {
      this.inUse.delete(obj);
      if (obj.reset) {
        obj.reset();
      }
      this.available.push(obj);
    }
  }

  clear() {
    this.available = [];
    this.inUse.clear();
  }

  get activeCount() {
    return this.inUse.size;
  }

  get availableCount() {
    return this.available.length;
  }
}
