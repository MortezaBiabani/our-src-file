
const pkgcloud = require('pkgcloud')
const path = require('path')
const { promisify } = require('util')

/**
 * Gets container, but with promise
 */
const getContainer = (client, options) =>
  promisify(client.getContainer.bind(client))(options)

/**
 * Creates a new container, but with promise
 */
const createContainer = (client, options) =>
promisify(client.createContainer.bind(client))(options)

/**
 * Gets a list files, but with promise
 */
const getFiles = (client, container) =>
  promisify(client.getFiles.bind(client))(container)

/**
 * Gets a file, but with promise
 */
const downloadFile = (client, container, remote) =>
  promisify(client.download.bind(client))({
    container,
    remote
  })

/**
 * Writes a file
 */
const uploadFile = (client, container, remote) =>
  promisify(client.upload.bind(client))({
    container,
    remote
  })

/**
 * Creates a new client
 */
const createClient= credentials => pkgcloud
  .storage.createClient({
    provider:'openstack',
    username: credentials.userId,
    password: credentials.password,
    authUrl: credentials.auth_url,
    keystoneAuthVersion: 'v1'
  });

/**
 * Maps a openstack file to OS.js file
 */
const mapFile = (container, root) => item => ({
  path: root + '/' + filepath,
  filename: file.name,
  size: file.size,
  mime: file.contentType
});

/**
 * Creates a new container from given VFS path
 */
const containerFromRoot = (client, file, create, isdir) => {
  // Translate OS.js path into a "real" one
  // "foo:/some/kind/of/file.bar" -> "/some/kind/of/file.bar"
  const filename = file.split(':').splice(1).join(':')

  // In case we give a filename, the container name must be the parent directory
  const name = isdir ? filename : path.dirname(filename)
  const containerOptions = { name }

  // Use appropriate container function based on arguments
  const fn = create ? createContainer : getContainer;

  return fn(client, containerOptions)
    .then(container => ({ container, filename, name }));
};

/**
 * Wrapper for writing a stream to the VFS
 */
const writeStreamWrapper = readStream => writeStream =>
  new Promise((resolve, reject) => {
    writeStream.on('error', reject);
    writeStream.on('success', resolve);
    readStream.pipe(writeStream);
  });

/**
 * Reads a directory
 */
const readdir = client => (file, options = {}) =>
  containerFromRoot(client, file, false, true)
    .then(({ container }) => getFiles(client, container)
      .then(files => files.map(mapFile(file, container))));

/**
 * Reads a file
 */
const readfile = client => (file, options = {}) =>
  containerFromRoot(client, file, false, false)
    .then(({ container, filename }) => downloadFile(client, container, path.basename(filename)));

/**
 * Removes a file
 */
const unlink = client => (file) =>
  containerFromRoot(client, file, false, false)
    .then(({ container, filename }) => removeFile(client, container, path.basename(filename)));

/**
 * Writes a file
 */
const writefile = (file, data) =>
  containerFromRoot(client, file, false, false)
    .then(({ container, filename }) => {
      return uploadFile(client, container, path.basename(filename))
        .then(writeStreamWrapper(data));
    });

/*
 * OS.js VFS adapter implementation
 */
const adapter = core => {
  // TODO: The client should be created on a per-request basis
  // instead of globally. Right now this only allows for a static connection.
  // This is usually done by getting options from the "vfs" object passed in the
  // higher order functions below this (the "return"s).
  const clientOptions = {
    userId: 'test:tester',
    password: 'testing',
    auth_url:'http://127.0.0.1:8080'
 };

  const client = createClient(clientOptions);

  return {
    readdir: (vfs) => readdir(client),
    readfile: (vfs) => readfile(client),
    writefile: (vfs) => writefile(client),
    unlink: (vfs) => unlink(client)
  };
};

module.exports = adapter
