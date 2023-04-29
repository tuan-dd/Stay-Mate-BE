const appConfig = {
  database: {
    host: process.env.MONGODB_HOST,
    port: process.env.MONGODB_PORT,
    name: process.env.MONGODB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD,
    name: process.env.REDIS_NAME,
  },
  email: {
    clientId: process.env.EMAIL_CLIENT_ID,
    clientSecret: process.env.EMAIL_CLIENT_SECRET,
    refreshToken: process.env.EMAIL_REFRESH_TOKEN,
    redirectUrl: process.env.EMAIL_REDIRECT_URL,
    emailFrom: process.env.EMAIL_FROM,
  },
};

export default appConfig;
