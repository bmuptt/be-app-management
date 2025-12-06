import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load environment variables from .env if available
dotenv.config();
// Fallback to env.example if .env is not present (Docker build ignores .env)
dotenv.config({ path: 'env.example' });

const dbUrl =
  process.env.DATABASE_URL ??
  process.env.DATABASE_URL_DOCKER ??
  'postgresql://postgres:inputpassdb@postgresrbac:5432/app_management?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: dbUrl,
    // Uncomment if using shadow DB for migrations on CI/testing
    // shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
});
