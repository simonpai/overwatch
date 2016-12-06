import path from 'path';
import extend from 'extend';
import Symbol from 'es6-symbol';
import StringSet from './util/string-set';
import StringMap from './util/string-map';

const EXPORTED_NAMES = Symbol('EXPORTED_NAMES');
const IMPORTED_NAMES = Symbol('IMPORTED_NAMES');

const computeExportedNames = module => 
  module.exports.reduce((sm, { source, entries }) => {
    let ss = sm.putIfAbsent(source ? source.absolutePath : module.absolutePath, () => new StringSet());
    entries.forEach(({ exported }) => ss.add(exported));
    return sm;
  }, new StringMap())
    .mapValue(ss => ss.toArray())
    .internal();

const computeImportedNames = module => 
  module.imports.reduce((sm, { source, entries }) => {
    let ss = sm.putIfAbsent(source.absolutePath, () => new StringSet());
    entries.forEach(({ imported }) => ss.add(imported));
    return sm;
  }, new StringMap())
    .mapValue(ss => ss.toArray())
    .internal();

export default class Module {
  
  _cache = {}
  
  constructor(project, context) {
    this.project = project;
    this.path = project.resolvePath(context.absolutePath);
    
    const patchDependency = d => {
      if (d.source) {
        d.source.path = project.resolvePath(d.source.absolutePath);
      }
    };
    context.imports.forEach(patchDependency);
    context.exports.forEach(patchDependency);
    
    extend(this, context);
  }
  
  exportedNames() {
    return this._cache[EXPORTED_NAMES] || (this._cache[EXPORTED_NAMES] = computeExportedNames(this));
  }
  
  importedNames() {
    return this._cache[IMPORTED_NAMES] || (this._cache[IMPORTED_NAMES] = computeImportedNames(this));
  }
  
}