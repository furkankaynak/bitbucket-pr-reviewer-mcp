import dotenv from 'dotenv';
import path from 'path';
import { envSchema, type EnvConfig } from './schema.js';

// Load environment variables from .env file
dotenv.config({
  path: path.resolve(process.cwd(), '.env'),
});

// Validate and parse environment variables
const parseConfig = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`❌ Invalid environment variables: ${error.message}`);
    }
    throw new Error('❌ Invalid environment variables');
  }
};

// Export the validated config
export const config = parseConfig();

// Export types
export type { EnvConfig };
