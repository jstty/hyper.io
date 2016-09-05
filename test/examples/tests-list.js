module.exports = {
  'api': {
    'helloworld-singlefile': 'app',
    'helloworld-multifile':  'app',
    'helloworld-custompath': 'index',
    'helloworld-preroute':   'app',

    'multiservice-singlefile': 'app',
    'multiservice-multifile':  'app',

    'prepost-route-multifile': 'app',

    'resolver-basic': 'app',

    'resource-singlefile': 'app',
    'resource-multifile':  'app',
    // "resource-sqlite":            "app",

    'externalservice-basic':      'app',
    'externalservice-websockets': 'app',

    'input-basic':   'app',
    'session-basic': 'app',

    'es6-helloworld-multifile':    'app',
    'es6-generator-singlefile':    'app',
    'es6-generator-multifile':     'app',
    'es6-prepost-route-multifile': 'app'
  },
  'config': {
    'helloworld-singlefile':   'app',
    'helloworld-multifile':    'myserver',
    'multiservice-singlefile': 'server',
    'shared':                  'app'
  },
  'custom-response': {
    'helloworld-singlefile': 'app'
  },
  'template': {
    'helloworld-singlefile': 'app',
    'helloworld-multifile':  'app'
  },
  'static': {
    'helloworld-basic':     'app',
    'helloworld-fromto':    'app',
    'helloworld-otherwise': 'app'
  },
  'export': {
    'helloworld-multifile': 'app'
  }
};
