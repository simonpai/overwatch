import extend from 'extend';

export default context => ({ types: t }) => ({
  visitor: {
    Program: {
      exit(path, { file }) {
        let { opts, shebang, declarations } = file;
        let { filename, sourceType, sourceMapTarget } = opts;
        extend(context, {
          absolutePath: filename, 
          shebang, 
          declarations,
          sourceType,
          sourceMapTarget
        });
      }
    }
  }
});
