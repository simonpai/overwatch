#!/usr/bin/env node
import path from 'path';
import { FileRange, Project, util } from '../lib';

const fileRange = new FileRange(path.join(__dirname, '..'), 'src/**/*@(.js|.jsx)');
const project = new Project(fileRange);
project.reloadSync();

//debugger;

console.log('All files:\n' + fileRange.getSync().map(fn => '* ' + fn + '\n').join(''));

let unusedExports = project.computeUnusedExports();

console.log('Unused modules:\n' + unusedExports.files
  .map(fn => '* ' + fn + '\n')
  .join(''));

console.log('Unused module export entries:\n' + 
  new util.StringMap(unusedExports.entries).entries()
    //.filter(({ key: fn }) => unusedExports.files.indexOf(fn) < 0)
    .map(({ key: fn, value: names }) => '* ' + fn + '\n' + names
      .map(n => '  - ' + n + '\n')
      .join(''))
    .join(''));


