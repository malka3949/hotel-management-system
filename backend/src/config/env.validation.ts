import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required().custom((value, helpers) => {
      if (!value.includes('sslmode=require')) {
        return helpers.error('any.invalid', { label: 'DATABASE_URL must contain sslmode=require in production' });
      }
      return value;
    }),
    otherwise: Joi.string().required(),
  }),
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
  STRIPE_WEBHOOK_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),
  RESEND_API_KEY: Joi.string().optional().allow(''),
  N8N_BASE_URL: Joi.string().default('http://localhost:5678'),
  N8N_WEBHOOK_SECRET: Joi.string().optional().allow(''),
  GOOGLE_AI_API_KEY: Joi.string().optional().allow(''),
  COHERE_API_KEY: Joi.string().optional().allow(''),
  COHERE_DPA_SIGNED: Joi.string().valid('true', 'false').default('false'),
  RESEND_DPA_SIGNED: Joi.string().valid('true', 'false').default('false'),
});
