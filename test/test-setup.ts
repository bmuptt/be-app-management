/**
 * Setup file untuk Jest - membuat schema database terpisah per worker
 * Ini memungkinkan test berjalan parallel tanpa conflict
 */
import dotenv from 'dotenv';

dotenv.config();

// IMPORTANT: Update DATABASE_URL SEBELUM import PrismaClient
// Ini memastikan Prisma Client menggunakan schema yang benar
if (process.env.NODE_ENV === 'testing') {
  const workerId = process.env.JEST_WORKER_ID || '1';
  const schemaName = `test_schema_${workerId}`;
  const baseUrl = process.env.DATABASE_URL || '';
  
  // Update DATABASE_URL untuk worker saat ini
  if (baseUrl.includes('schema=')) {
    process.env.DATABASE_URL = baseUrl.replace(/schema=[^&]*/, `schema=${schemaName}`);
  } else {
    const separator = baseUrl.includes('?') ? '&' : '?';
    process.env.DATABASE_URL = `${baseUrl}${separator}schema=${schemaName}`;
  }
}

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

// Get worker ID dari Jest (akan undefined jika tidak ada worker)
const workerId = process.env.JEST_WORKER_ID || '1';
const schemaName = `test_schema_${workerId}`;

/**
 * Mendapatkan schema name untuk worker saat ini
 */
export function getTestSchemaName(): string {
  return schemaName;
}

/**
 * Mendapatkan DATABASE_URL dengan schema yang berbeda untuk testing parallel
 */
export function getTestDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL || '';
  
  // Jika bukan testing, return as is
  if (process.env.NODE_ENV !== 'testing') {
    return baseUrl;
  }
  
  // Untuk testing, ganti schema dengan schema per worker
  if (baseUrl.includes('schema=')) {
    return baseUrl.replace(/schema=[^&]*/, `schema=${schemaName}`);
  } else {
    // Tambahkan schema jika belum ada
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}schema=${schemaName}`;
  }
}

/**
 * Setup schema untuk worker saat ini
 */
export async function setupTestSchema(): Promise<void> {
  if (process.env.NODE_ENV !== 'testing') {
    return;
  }

  try {
    console.log(`🔧 [Worker ${workerId}] Setting up test schema: ${schemaName}`);

    // Buat Prisma client dengan connection tanpa schema untuk bisa create schema
    const baseUrl = process.env.DATABASE_URL || '';
    const urlWithoutSchema = baseUrl.replace(/[?&]schema=[^&]*/, '');
    
    const adminClient = new PrismaClient({
      datasources: {
        db: {
          url: urlWithoutSchema,
        },
      },
    });

    // Buat schema jika belum ada
    await adminClient.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
    );

    // Set search_path untuk schema test (agar query default ke schema ini)
    // Ini penting untuk CREATE INDEX dan lainnya yang mungkin tidak menggunakan schema prefix
    await adminClient.$executeRawUnsafe(`SET search_path TO "${schemaName}", public;`);

    // Baca migration SQL file
    const migrationPath = join(
      __dirname,
      '../prisma/migrations/20250426110205_all_table/migration.sql',
    );
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute migration SQL dengan schema prefix
    // Kita perlu replace semua table references dengan schema prefix
    // Note: Index names and constraint names don't need schema prefix - they're local to the schema
    const migrationWithSchema = migrationSQL
      // Replace CREATE TABLE untuk include schema
      .replace(/CREATE TABLE "([^"]+)"/g, `CREATE TABLE "${schemaName}".$1`)
      // Replace CREATE UNIQUE INDEX 
      // Index name stays as is (local to schema)
      // Table name doesn't need schema prefix because search_path is already set to schema
      .replace(
        /CREATE UNIQUE INDEX "([^"]+)" ON "([^"]+)"/g,
        `CREATE UNIQUE INDEX "$1" ON "$2"`,
      )
      // Replace CREATE INDEX (non-unique)
      .replace(/CREATE INDEX "([^"]+)" ON "([^"]+)"/g, `CREATE INDEX "$1" ON "$2"`)
      // Replace ALTER TABLE
      .replace(/ALTER TABLE "([^"]+)"/g, `ALTER TABLE "${schemaName}.$1"`)
      // Replace REFERENCES untuk foreign keys 
      // Handle: REFERENCES "table"("column") ON DELETE ... ON UPDATE ...
      .replace(/REFERENCES "([^"]+)"\("([^"]+)"\)/g, `REFERENCES "${schemaName}.$1"("$2")`)
      // Handle: REFERENCES "table" (without column, but this is less common)
      .replace(/REFERENCES "([^"]+)"(?=\s|;|$)/g, `REFERENCES "${schemaName}.$1"`);

    console.log(`📄 [Worker ${workerId}] Migration SQL length: ${migrationSQL.length}, After replace: ${migrationWithSchema.length}`);

    // Split SQL into individual statements and execute one by one
    // PostgreSQL doesn't allow multiple commands in prepared statements
    const rawStatements = migrationWithSchema.split(';');
    console.log(`📊 [Worker ${workerId}] Raw statements after split: ${rawStatements.length}`);
    
    // Filter statements: remove empty ones and pure comment lines (lines that are ONLY comments)
    // But keep statements that have SQL even if they start with a comment
    const statements = rawStatements
      .map((s) => {
        // Remove comment lines (lines starting with --) but keep the SQL
        return s
          .split('\n')
          .map(line => {
            // Remove comment lines
            if (line.trim().startsWith('--')) return '';
            return line;
          })
          .join('\n')
          .trim();
      })
      .filter((s) => s.length > 0);

    console.log(`📝 [Worker ${workerId}] Found ${statements.length} migration statements after filtering`);
    
    if (statements.length === 0) {
      console.error(`❌ [Worker ${workerId}] No statements found!`);
      console.error(`Raw split count: ${rawStatements.length}`);
      console.error(`First 5 raw statements (first 100 chars each):`);
      rawStatements.slice(0, 5).forEach((s, i) => {
        console.error(`  ${i + 1}: ${s.trim().substring(0, 100)}...`);
      });
      console.error(`Migration SQL preview (first 500 chars):`);
      console.error(migrationWithSchema.substring(0, 500));
      throw new Error(`No migration statements found after processing SQL`);
    }
    
    // Ensure search_path is set before executing statements
    await adminClient.$executeRawUnsafe(`SET search_path TO "${schemaName}", public;`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await adminClient.$executeRawUnsafe(statement);
        } catch (error: any) {
          // Log error but continue - some statements might fail if objects already exist
          // Prisma errors might have different structure - try to access error code from multiple places
          const errorCode = error.code || error.meta?.code || (error.meta?.error_code) || '';
          const errorMessage = error.message || error.meta?.message || error.toString() || '';
          
          const isDuplicateError = errorCode === '42P07' || errorCode === '42710' || 
                                   errorMessage.includes('already exists') ||
                                   errorMessage.includes('duplicate');
          
          // Handle undefined_table errors - might be FK constraint or index trying to reference table that doesn't exist yet
          const isUndefinedTableError = errorCode === '42P01' || errorMessage.includes('relation') || errorMessage.includes('does not exist');
          
          if (isDuplicateError) {
            // Silently ignore duplicate errors - object already exists
            // console.warn(`⚠️ [Worker ${workerId}] Statement ${i + 1}/${statements.length} skipped (already exists)`);
          } else if (isUndefinedTableError) {
            // Log but continue - might fail if table doesn't exist (shouldn't happen, but handle gracefully)
            console.warn(`⚠️ [Worker ${workerId}] Statement ${i + 1}/${statements.length} failed (table/index not found): ${statement.substring(0, 100)}...`);
          } else {
            // Log other errors but continue
            console.warn(`⚠️ [Worker ${workerId}] Statement ${i + 1}/${statements.length} failed [${errorCode}]: ${errorMessage.substring(0, 150)}`);
            console.warn(`   Statement: ${statement.substring(0, 120)}...`);
          }
        }
      }
    }

    // Set search_path to the schema before querying
    await adminClient.$executeRawUnsafe(`SET search_path TO "${schemaName}", public;`);

    // Verify schema is created correctly by checking if tables exist
    // Note: We need to escape the schema name to prevent SQL injection
    const escapedSchemaName = schemaName.replace(/'/g, "''");
    const tablesCheck = await adminClient.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = '${escapedSchemaName}'`
    );
    
    if (!tablesCheck || tablesCheck.length === 0) {
      // Try querying without schema prefix to see all tables
      const allTables = await adminClient.$queryRawUnsafe<Array<{ tablename: string; schemaname: string }>>(
        `SELECT tablename, schemaname FROM pg_tables WHERE schemaname LIKE 'test_%' ORDER BY schemaname, tablename`
      );
      throw new Error(
        `No tables found in schema ${schemaName} after migration. ` +
        `Tables check returned: ${JSON.stringify(tablesCheck)}. ` +
        `All test schemas: ${JSON.stringify(allTables)}`
      );
    }

    await adminClient.$disconnect();

    // Set DATABASE_URL untuk test schema (ini akan digunakan oleh Prisma Client)
    // Pastikan DATABASE_URL sudah di-update dengan schema yang benar
    process.env.DATABASE_URL = getTestDatabaseUrl();
    
    console.log(`✅ [Worker ${workerId}] Test schema ${schemaName} setup completed with ${tablesCheck.length} tables`);
  } catch (error: any) {
    console.error(
      `❌ [Worker ${workerId}] Error setting up schema ${schemaName}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Cleanup schema setelah semua test selesai
 */
export async function cleanupTestSchema(): Promise<void> {
  if (process.env.NODE_ENV !== 'testing') {
    return;
  }

  try {
    console.log(`🧹 [Worker ${workerId}] Cleaning up schema: ${schemaName}`);

    const baseUrl = process.env.DATABASE_URL || '';
    const urlWithoutSchema = baseUrl.replace(/[?&]schema=[^&]*/, '');
    
    const adminClient = new PrismaClient({
      datasources: {
        db: {
          url: urlWithoutSchema,
        },
      },
    });

    // Drop schema (akan drop semua table di dalamnya)
    await adminClient.$executeRawUnsafe(
      `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`,
    );

    await adminClient.$disconnect();
    
    console.log(`✅ [Worker ${workerId}] Schema ${schemaName} cleaned up`);
  } catch (error: any) {
    console.error(
      `⚠️ [Worker ${workerId}] Error cleaning up schema ${schemaName}:`,
      error.message,
    );
    // Don't throw, just log - cleanup errors shouldn't fail tests
  }
}

// Global flag untuk track apakah schema sudah di-setup
let schemaSetupPromise: Promise<void> | null = null;

/**
 * Get atau buat setup promise untuk schema
 */
function getOrCreateSchemaSetup(): Promise<void> {
  if (!schemaSetupPromise) {
    schemaSetupPromise = setupTestSchema();
  }
  return schemaSetupPromise;
}

// Setup schema saat file ini di-load
// Ini dijalankan sebagai setupFiles, jadi DATABASE_URL akan di-set
// SEBELUM module lain di-load, termasuk Prisma Client
if (process.env.NODE_ENV === 'testing') {
  // Update DATABASE_URL untuk worker saat ini (akan digunakan saat Prisma Client dibuat)
  const testDatabaseUrl = getTestDatabaseUrl();
  process.env.DATABASE_URL = testDatabaseUrl;
  
  // Setup schema secara sync menggunakan top-level await workaround
  // Karena setupFiles tidak support async, kita akan setup schema
  // dan pastikan schema dibuat sebelum module lain di-load
  // Schema setup akan dilakukan di getOrCreateSchemaSetup() yang dipanggil
  // sebelum penggunaan Prisma Client di test-util.ts
}

// Export function untuk memastikan schema sudah setup (dipanggil dari test-util)
export { getOrCreateSchemaSetup };

