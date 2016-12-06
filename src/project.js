import EventEmitter from 'events';
import fs from 'fs';
import values from 'object.values';
import path from 'path';
import { sync as resolveSync } from 'resolve';

import StringSet from './util/string-set';
import StringMap from './util/string-map';
import { analyze, analyzeSync, EXTENSIONS } from './analyzer';
import Module from './module';

values.shim();

const _noEmits = {
  
  analyzeSync: project => name => 
    new Module(project, analyzeSync(project.resolveAbsolutePath(name))),
  
  analyze: project => name => 
    analyze(project.resolveAbsolutePath(name))
        .then(c => new Module(project, c)),
  
  updateModule: project => module => {
    let path = module.path;
    let old = project._modules[path];
    project._modules[path] = module;
    return old;
  },
  
  deleteModule: project => name => {
    let path = project.resolvePath(name);
    let old = project._modules[path];
    delete project._modules[path];
    return old;
  },
  
  reloadModuleSync: project => name => 
    _noEmits.updateModule(project)(_noEmits.analyzeSync(project)(name)),
  
  reloadModule: project => name => 
    _noEmits.analyze(project)(name)
      .then(m => _noEmits.updateModule(project)(m))
  
};

const resolveUnusedExportedEntries0 = (project, cache, module) => 
  new StringMap(module.exportedNames())
    .entries()
    .reduce((ss, { key: fn, value: entries }) => {
      entries.forEach(n => {
        if (n == '*') {
          let m = project.getModule(fn);
          if (m) {
            resolveUnusedExportedEntries(project, cache, m).forEach(k => ss.add(k));
          }
          // TODO: what about external modules
        } else {
          ss.add(n);
        }
      });
      return ss;
    }, new StringSet());

const resolveUnusedExportedEntries = (project, cache, module) => 
  cache.putIfAbsent(module.path, () => resolveUnusedExportedEntries0(project, cache, module));

export default class Project extends EventEmitter {
  
  constructor(fileRange) {
    super();
    
    this.fileRange = fileRange;
    this._modules = {}; // TODO: use Symbol to make this private
  }
  
  // load //
  reload() {
    this.emit('reload');
    this._modules = {};
    return this.fileRange.get()
      .then(fns => Promise.all(fns.map(_noEmits.reloadModule(this))))
      .then(() => {
        this.emit('reloaded');
      });
  }
  
  reloadSync() {
    this.emit('reload');
    this._modules = {};
    this.fileRange.getSync()
      .forEach(_noEmits.reloadModuleSync(this));
    this.emit('reloaded');
  }
  
  reloadModule(name) {
    return _noEmits.analyze(this)(name)
      .then(m => this.updateModule(m));
  }
  
  reloadModuleSync(name) {
    this.updateModule(_noEmits.analyzeSync(this)(name));
  }
  
  // access //
  resolveAbsolutePath(name) {
    // TODO: need better predicate
    return path.extname(name) ? 
      this.fileRange.resolve(name) : 
      resolveSync(name, { basedir: this.fileRange.basedir, extensions: EXTENSIONS });
  }
  
  resolvePath(name) {
    return this.fileRange.relativePath(this.resolveAbsolutePath(name));
  }
  
  listModules() {
    return values(this._modules);
  }
  
  getModule(name) {
    return this._modules[this.resolvePath(name)];
  }
  
  updateModule(module) {
    let old = _noEmits.updateModule(this)(module);
    this.emit('change', { path: module.path, module, old });
  }
  
  deleteModule(name) {
    let old = _noEmits.deleteModule(this)(name);
    this.emit('change', { path: module.path, old });
  }
  
  // computation //
  findUsages(moduleName, exportedName) {
    let path = this.resolvePath(moduleName);
    let usages = [];
    this.listModules().forEach(module => {
      let entries = module.imports
        .filter(i => i.source.path == path && (!exportedName || i.exported == exportedName));
      if (entries.length) {
        usages.push({ module, entries });
      }
    });
    return usages;
  }
  
  computeUnusedExports() {
    return {
      files: this.computeUnusedExportedFiles(),
      entries: this.computeUnusedExportedEntries()
    };
  }
  
  computeUnusedExportedFiles() {
    let unusedExportedFiles = new StringSet(this.listModules()
      .filter(module => module.exports.length)
      .map(({ path }) => path));
    
    this.listModules().forEach(module => {
      module.imports.forEach(({ source }) => {
        unusedExportedFiles.remove(source.path);
      });
    });
    
    return unusedExportedFiles.toArray();
  }
  
  computeUnusedExportedEntries() {
    let unusedExportedEntries = new StringMap();
    
    this.listModules().forEach(module => 
      resolveUnusedExportedEntries(this, unusedExportedEntries, module));

    this.listModules().forEach(module => {
      module.imports.forEach(({ source, entries }) => {
        let names = unusedExportedEntries.get(source.path);
        if (names === undefined) {
          return; // external, or already covered
        }
        entries.forEach(en => {
          let imported = en.imported;
          if (imported == '*') {
            unusedExportedEntries.remove(source.path);
          } else {
            names.remove(imported);
          }
        });
      });
    });

    return unusedExportedEntries
      .filter(({ value: names }) => names.size() > 0)
      .mapValue(names => names.toArray())
      .internal();
  }
  
}
