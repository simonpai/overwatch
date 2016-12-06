import extend from 'extend';

export default context => ({ types: t }) => {
  
  // http://cpojer.github.io/esprima_ast_explorer/
  let imports = context.imports = [];
  let exports = context.exports = [];
  
  return {
    visitor: {
      ImportDeclaration({ node }) {
        // import { a, y as b, default as c } from 'mod';
        // import v from 'mod'; (DefaultSpecifier)
        // import * as v from 'mod'; (NamespaceSpecifier)
        let source = node.source.value;
        let entries = node.specifiers.map(specifier => {
          let local = specifier.local.name;
          let imported = specifier.imported ? specifier.imported.name :
            t.isImportNamespaceSpecifier(specifier) ? '*' :
            t.isImportDefaultSpecifier(specifier) ? 'default' : undefined;
          return { imported, local };
        });
        imports.push({ source, entries });
      },
      
      ExportAllDeclaration({ node }) {
        // export * from 'mod'
        let source = node.source.value;
        imports.push({
          source,
          entries: [ { imported: '*' } ]
        });
        exports.push({
          source,
          entries: [ { exported: '*' } ]
        });
      },
      
      ExportDefaultDeclaration({ node }) {
        // export default 0;
        // export default x;
        // export default function () {}
        // export default function f() {}
        // export default class {}
        // export default class c1 {}
        exports.push({
          entries: [ { exported: 'default', declaration: node.declaration } ]
        });
      },
      
      ExportNamedDeclaration({ node }) {
        let source = node.source && node.source.value;
        let declaration = node.declaration;
        
        if (declaration) {
          // export let|var|const v1, v2 = 0;
          // export function f() {}
          // export class c {}
          let declarations = declaration.declarations || [ declaration ];
          let entries = declarations.map(d => ({ exported: d.id.name, local: d.id.name, declaration: d }));
          exports.push({ entries });
          return;
        }
        
        // export { a, y as b, z as default };
        // export { a, y as b, z as default } from 'mod';
        // export * as ns from 'mod'
        // export v from 'mod'
        let entries = node.specifiers.map(specifier => {
          let exported = specifier.exported.name;
          let local = specifier.local && specifier.local.name;
          return local ? { exported, local } : { exported };
        });
        exports.push(source ? { source, entries } : { entries });
        
        // let re-export also count as import
        // https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-export-extensions/src/index.js
        let first = node.specifiers[0];
        if (t.isExportNamespaceSpecifier(first)) {
          // export * as ns from 'mod'
          imports.push({
            source,
            entries: [ { imported: '*' } ],
            exported: true
          });
          
        } else if (t.isExportDefaultSpecifier(first)) {
          // export v from 'mod'
          imports.push({
            source,
            entries: [ { imported: 'default' } ],
            exported: true
          });
          
        }
      }
    }
  };
};
