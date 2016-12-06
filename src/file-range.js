import path from 'path';
import glob from 'glob';
import minimatch from 'minimatch';

const asArray = obj => obj === undefined ? [] : Array.isArray(obj) ? obj : [ obj ];

const getGlobOptions = fileRange => ({
  ...fileRange.options,
  cwd: fileRange.basedir
});

export default class FileRange {
  
  constructor(basedir, pattern, options = {}) {
    this.basedir = basedir;
    this.pattern = pattern || '*';
    this.options = options;
    this.ignores = asArray(options.ignore);
  }
  
  resolve(filename) {
    return path.resolve(this.basedir, filename);
  }
  
  relativePath(filename) {
    return path.relative(this.basedir, filename);
  }
  
  match(filename) {
    filename = this.resolve(filename);
    return minimatch(filename, this.pattern, this.options) && !this.ignores.some(i => minimatch(filename, i, this.options));
  }
  
  get() {
    return new Promise((resolve, reject) => {
      glob(this.pattern, getGlobOptions(this), (err, matches) => {
        if (err) {
          reject(err);
        } else {
          resolve(matches);
        }
      });
    });
  }
  
  getSync() {
    return glob.sync(this.pattern, getGlobOptions(this));
  }
  
}