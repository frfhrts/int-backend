import * as Joi from 'joi';

export const JoiSchema = Joi.object({
  REDIS_CONNECTION_URI: Joi.string().uri().required(),
  APP_PORT: Joi.number().default(3000),
  GCP_KEY: Joi.string().required(),
  GCP_SECRET: Joi.string().required(),
  GCP_URL: Joi.string().uri().required(),
});
