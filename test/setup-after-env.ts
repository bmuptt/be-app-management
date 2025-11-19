/**
 * Setup file yang dijalankan setelah environment Jest di-setup
 * Ini digunakan untuk setup schema database secara async
 */
import { setupTestSchema } from './test-setup';

// Setup schema database sebelum test dijalankan
// Ini dijalankan sekali per worker untuk parallel testing
export default async function setup() {
  await setupTestSchema();
}

