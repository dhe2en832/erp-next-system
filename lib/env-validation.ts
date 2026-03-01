import { z } from 'zod';

const envSchema = z.object({
  ERPNEXT_API_URL: z.string().url('ERPNEXT_API_URL must be a valid URL'),
  ERP_API_KEY: z.string().min(1, 'ERP_API_KEY is required'),
  ERP_API_SECRET: z.string().min(1, 'ERP_API_SECRET is required'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const env = {
    ERPNEXT_API_URL: process.env.ERPNEXT_API_URL,
    ERP_API_KEY: process.env.ERP_API_KEY,
    ERP_API_SECRET: process.env.ERP_API_SECRET,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Environment validation failed:\n${missingVars}\n\n` +
        `Please check your .env file and ensure all required variables are set.`
      );
    }
    throw error;
  }
}

export function getAppEnvironment(): 'development' | 'staging' | 'production' {
  return (process.env.NEXT_PUBLIC_APP_ENV as 'development' | 'staging' | 'production') || 'development';
}

export function isProduction(): boolean {
  return getAppEnvironment() === 'production';
}

export function isStaging(): boolean {
  return getAppEnvironment() === 'staging';
}

export function isDevelopment(): boolean {
  return getAppEnvironment() === 'development';
}