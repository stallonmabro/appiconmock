module.exports = {
  apps: [{
    name: "appiconmock",
    script: "node_modules/.bin/next",
    args: "start -p 3001",
    cwd: "/home/bilvas/appiconmock",
    instances: 1,
    exec_mode: "fork",
    env: {
      NODE_ENV: "production",
      PORT: "3001",
    },
    max_memory_restart: "500M",
    autorestart: true,
    watch: false,
  }],
};
