module.exports = {
  apps: [
    {
      name: 'tennis-backend',
      script: 'npm',
      args: 'start --prefix backend',
      cwd: __dirname,
    },
    {
      name: 'tennis-frontend',
      script: 'node_modules/vite/bin/vite.js',
      cwd: __dirname,
    },
  ],
};
