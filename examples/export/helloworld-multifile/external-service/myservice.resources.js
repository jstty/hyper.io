
module.exports = {
  'util': {
    'main1': {
      type:   'factory',
      module: require('./util/main1.js')
    },
    'main2': require('./util/main2.js')
    // 'main3': 'util/main3' // TODO
  }
};

// module.exports = [
//   {
//     group:  'util',
//     name:   'main',
//     type:   'factory',
//     module: require('./util/main.js')
//   }
// ];
