const entriesToObject = entries => entries.reduce((m, { key, value }) => {
  m[key] = value;
  return m;
}, {});

export default class StringMap {
  
  constructor(obj = {}) {
    if (Array.isArray(obj)) {
      obj = entriesToObject(obj);
    }
    // TODO: from entries
    this.internal = () => obj;
  }
  
  keys() {
    return Object.keys(this.internal());
  }
  
  size() {
    return keys().length;
  }
  
  containsKey(key) {
    return !!this.internal()[key];
  }
  
  get(key) {
    return this.internal()[key];
  }
  
  put(key, value) {
    this.internal()[key] = value;
  }
  
  putIfAbsent(key, f) {
    let obj = this.internal();
    return obj[key] || (obj[key] = f(key));
  }
  
  remove(key) {
    let value = this.internal()[key];
    delete this.internal()[key];
    return value;
  }
  
  values() {
    return this.keys().map(key => this.get(key));
  }
  
  entries() {
    return this.keys().map(key => ({ key, value: this.get(key) }));
  }
  
  filter(f) {
    return new StringMap(this.entries().filter(f));
  }
  
  map(f) {
    return new StringMap(this.entries().map(f));
  }
  
  mapKey(f) {
    return this.map(({ key, value }) => ({ key: f(key), value }));
  }
  
  mapValue(f) {
    return this.map(({ key, value }) => ({ key, value: f(value) }));
  }
  
}