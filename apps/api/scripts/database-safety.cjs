process.env.TS_NODE_COMPILER_OPTIONS ||= JSON.stringify({
  module: 'CommonJS',
  moduleResolution: 'Node',
});
require('ts-node/register/transpile-only');
module.exports = require('../src/common/database-safety.ts');
