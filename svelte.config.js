import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  compilerOptions: {
    dev: process.env.NODE_ENV !== 'production'
  },
  kit: {
    adapter: adapter({
      fallback: 'index.html'
    }),
    alias: {
      $api: 'src/lib/api',
      $components: 'src/lib/components',
      $services: 'src/lib/services',
      $stores: 'src/lib/stores',
      $utils: 'src/lib/utils',
      $styles: 'src/styles'
    }
  }
};

export default config;
