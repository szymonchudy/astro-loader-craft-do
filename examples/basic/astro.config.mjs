import { defineConfig } from 'astro/config';

export default defineConfig({
  // Tests must not replace the live sample's preview artifact.
  outDir: process.env.CRAFT_TEST_FIXTURE === '1' ? './dist-fixture' : './dist',
});
