import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  CSRF_SECRET: Joi.string().min(32).required(),
  REFRESH_TOKEN_HMAC_KEY: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  FRONTEND_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri({ scheme: ['https'] }).required(),
    otherwise: Joi.string().default('http://localhost:3000'),
  }),
});
