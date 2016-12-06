const arrayToObject = arr => arr.reduce((obj, s) => {
  obj[s] = true;
  return obj;
}, {});

export default class StringSet {
  
  constructor(obj = {}) {
    if (Array.isArray(obj)) {
      obj = arrayToObject(obj);
    }
    this.internal = () => obj;
  }
  
  toArray() {
    return Object.keys(this.internal());
  }
  
  size() {
    return this.toArray().length;
  }
  
  contains(str) {
    return !!this.internal()[str];
  }
  
  add(str) {
    this.internal()[str] = true;
  }
  
  remove(str) {
    delete this.internal()[str];
  }
  
  forEach(f) {
    this.toArray().forEach(f);
  }
  
  filter(f) {
    return this.toArray().reduce((ss, str) => {
      if (f(str)) {
        ss.add(str);
      }
      return ss;
    }, new StringSet());
  }
  
  map(f) {
    return this.toArray().reduce((ss, str) => {
      ss.add(f(str));
      return ss;
    }, new StringSet());
  }
  
}