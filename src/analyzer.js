import path from 'path';
import * as babel from 'babel-core';
import { sync as resolveSync } from 'resolve';
import syntaxFromPresets from 'babel-preset-syntax-from-presets';
import trackDependencies from './babel/track-dependencies';
import trackFileInfo from './babel/track-file-info';
import Module from './module';

export const EXTENSIONS = [ '.js', '.jsx', '.json', '.css' ];

const transformFile = (filename, options) => 
  new Promise((resolve, reject) => {
    babel.transformFile(filename, options, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });

const mergeOptions = (context, options = {}) =>
  ({
    babelrc: false,
    ...options,
    presets: [
      syntaxFromPresets,
      ...options.presets || []
    ],
    plugins: [
      trackFileInfo(context),
      trackDependencies(context),
      ...options.plugins || []
    ]
  });

const patchDependencies = (context, filename) => {
  let basedir = path.dirname(filename);
  let extensions = EXTENSIONS;
  
  const patchDependency = d => {
    if (d.source) {
      d.source = {
        value: d.source,
        absolutePath: resolveSync(d.source, { basedir, extensions })
      };
    }
  };
  
  context.imports.forEach(patchDependency);
  context.exports.forEach(patchDependency);
};

const mergeResult = context => ({ ast, code, map, ignored }) => ({
  ...context, 
  ast, code, map, 
  opts: {
    ...context.opts, 
    ignored
  }
});

export const analyze = (filename, options) => {
  let context = {};
  options = mergeOptions(context, options);
  return transformFile(filename, options)
    .then(r => {
      patchDependencies(context, filename);
      return r;
    })
    .then(mergeResult(context));
};

export const analyzeSync = (filename, options) => {
  let context = {};
  options = mergeOptions(context, options);
  let result = babel.transformFileSync(filename, options);
  patchDependencies(context, filename);
  return mergeResult(context)(result);
};


