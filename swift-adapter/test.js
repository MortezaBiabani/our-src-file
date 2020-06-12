const adapter = require('./index.js');

// This can be blank since we're not using any of the "core" features
// But in case it's needed we can just mock what we need
const mockedCoreInstance = {};

// This can be blank since we're not using it. 
// You can see that we're not passing this in the returned methods in the adapter.
const mockedVfsInstance = {};

// Create a new instance of the adapter
const instance = adapter(mockedCoreInstance);

// We can now bind VFS methods in the adapter
const readdir = instance.readdir(mockedVfsInstance);

// And finally test
readdir('test:/')
  .then(result => console.log(result))
  .catch(error => console.error(error));