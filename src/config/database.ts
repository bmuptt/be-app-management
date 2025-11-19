// prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from './logging';
import { apm } from './apm';

// Base Prisma Client
// Untuk testing parallel, Prisma Client akan menggunakan DATABASE_URL yang sudah di-update
// dengan schema per worker di test-setup.ts
const basePrismaClient = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info'  },
    { emit: 'event', level: 'warn'  },
  ],
});

// ===== Prisma Client dengan APM Extension (menggantikan deprecated $use) =====
const prismaWithAPM = basePrismaClient.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }) => {
      // Nama span: prisma <Model>.<operation>
      const modelName = model ?? 'raw';
      const name = `prisma ${modelName}.${operation}`;

      // Buat span untuk operasi database (skip jika apm tidak ada/testing)
      const span = apm?.startSpan(name, 'db', 'prisma', operation) ?? null;

      try {
        const result = await query(args);
        return result;
      } catch (err: any) {
        // Tandai error di span
        span?.setLabel('error', String(err?.message ?? err));
        throw err;
      } finally {
        // Label ringan saja; hindari perekaman argumen besar/PII
        span?.setLabel('model', modelName);
        span?.setLabel('operation', operation);
        
        // Catat jumlah record yang diubah (untuk update/delete/createMany)
        const count = (args as any)?.data?.length ?? undefined;
        if (count !== undefined) span?.setLabel('items', count);
        
        span?.end();
      }
    },
  },
});

// ===== Winston event listeners tetap jalan =====
basePrismaClient.$on('error', (e) => { logger.error(e); });
basePrismaClient.$on('warn',  (e) => { logger.warn(e);  });
basePrismaClient.$on('info',  (e) => { logger.info(e);  });
basePrismaClient.$on('query', (e) => {
  // Hati-hati PII: log SQL/params ke file hanya jika aman
  logger.info(e);
});

// Type alias untuk Extended Prisma Client
type ExtendedPrismaClient = typeof prismaWithAPM;

// Export prismaClient dengan APM monitoring
export const prismaClient = prismaWithAPM as ExtendedPrismaClient & PrismaClient;

// Export type untuk compatibility
export type PrismaClientType = PrismaClient | Prisma.TransactionClient;
