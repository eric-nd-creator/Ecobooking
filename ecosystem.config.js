module.exports = {
  apps: [
    {
      name: 'tennis-backend',
      script: 'src/server.js',
      cwd: __dirname + '/backend',
    },
    {
      name: 'tennis-frontend',
      script: 'node_modules/vite/bin/vite.js',
      cwd: __dirname + '/frontend',
    },
  ],
};
