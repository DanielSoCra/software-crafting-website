module.exports = {
  apps: [{
    name: 'software-crafting-portal',
    script: '.next/standalone/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 4322,
      HOSTNAME: '::1',
    },
  }],
};
