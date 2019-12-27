#!/usr/bin/env node

switch (process.argv.pop()) {
    case 'convert':
        require('./examples/convert');
        break;
    default:
        require('./index');
        break;
}

