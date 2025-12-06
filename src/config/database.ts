// prisma.ts
import { PrismaClient, Prisma } from '@prisma/client';
// @ts-ignore
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from './logging';
import { apm } from './apm';

// Base Prisma Client (Prisma v7: gunakan adapter pg)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Untuk testing parallel, Prisma Client akan menggunakan DATABASE_URL yang sudah di-update
// dengan schema per worker di test-setup.ts
const basePrismaClient = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info'  },
    { emit: 'event', level: 'warn'  },
  ],
});

// ===== Prisma Client dengan APM Extension (menggantikan deprecated $use) =====
// Konteks untuk extension query agar tidak implicit-any
type QueryContext = {
  model?: string;
  operation: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
};

const prismaWithAPM = basePrismaClient.$extends({
  query: {
    $allOperations: async ({ model, operation, args, query }: QueryContext) => {
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
        const dataProp = (args as Record<string, unknown>)?.['data'];
        let count: number | undefined = undefined;
        if (Array.isArray(dataProp)) {
          count = dataProp.length;
        }
        if (count !== undefined) span?.setLabel('items', count);
        
        span?.end();
      }
    },
  },
});

// ===== Winston event listeners tetap jalan =====
basePrismaClient.$on('error', (e: unknown) => { logger.error(e); });
basePrismaClient.$on('warn',  (e: unknown) => { logger.warn(e);  });
basePrismaClient.$on('info',  (e: unknown) => { logger.info(e);  });
basePrismaClient.$on('query', (e: unknown) => {
  // Hati-hati PII: log SQL/params ke file hanya jika aman
  logger.info(e);
});

// Type alias untuk Extended Prisma Client
export type ExtendedPrismaClient = typeof prismaWithAPM;

// Transaction client inherits extensions but omits client-level methods
export type ExtendedTransactionClient = Omit<
  ExtendedPrismaClient,
  '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

// Export prismaClient dengan APM monitoring
export const prismaClient = prismaWithAPM as ExtendedPrismaClient & PrismaClient;

// Export type untuk compatibility
export type PrismaClientType =
  | PrismaClient
  | Prisma.TransactionClient
  | ExtendedPrismaClient
  | ExtendedTransactionClient;
