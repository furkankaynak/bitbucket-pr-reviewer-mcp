import { z } from 'zod';

// Environment variables schema
export const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  MCP_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Bitbucket
  BITBUCKET_BASE_URL: z.string().url().default('https://api.bitbucket.org/2.0'),
  BITBUCKET_PROJECT_KEY: z.string(),
  BITBUCKET_REPOSITORY_SLUG: z.string(),

  // Authentication (either token or username/password)
  BITBUCKET_AUTH_TOKEN: z.string().optional(),
  BITBUCKET_USERNAME: z.string().optional(),
  BITBUCKET_PASSWORD: z.string().optional(),

  // MCP Server Configuration
  MCP_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  MCP_TRANSPORT: z.enum(['http', 'stdio']).default('http'),

  // Review Configuration
  EXCLUDE_PATTERNS: z
    .string()
    .transform((str) => {
      try {
        return JSON.parse(str) as string[];
      } catch {
        return ['.md$', '^docs/'];
      }
    })
    .default(JSON.stringify(['\\.md$', '^docs/'])),

  CUSTOM_PROMPT: z
    .string()
    .default('Please review the following diff for technical quality and best practices.'),
});

export type EnvConfig = z.infer<typeof envSchema>;
