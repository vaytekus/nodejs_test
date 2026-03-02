const fs = require('fs');
const path = require('path');

/**
 * Delete a file. Resolves relative paths from project root.
 * Ignores ENOENT (file already missing). Returns a Promise.
 */
const deleteFile = (filePath) => {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(path.dirname(require.main.filename), filePath);
  return new Promise((resolve, reject) => {
    fs.unlink(absolutePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        return reject(err);
      }
      resolve();
    });
  });
};

module.exports = { deleteFile };