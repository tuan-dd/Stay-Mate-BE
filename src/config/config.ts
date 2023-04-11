const appConfig = {
  database: {
    host: process.env.MONGODB_HOST,
    port: process.env.MONGODB_PORT,
    name: process.env.MONGODB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    pass: process.env.REDIS_PASSWORD,
  },
};

export default appConfig;
