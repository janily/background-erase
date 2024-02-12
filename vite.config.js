import { defineConfig } from 'vite';
import ogPlugin from 'vite-plugin-open-graph'

const ogOptions = {
  basic: {
    url: 'https://backgroundears-erase.xyz',
    title: 'Backgroundears erase',
    type: 'image.png',
    image: 'https://backgroundears-erase.xyz/openog.png',
    determiner: 'auto',
    description: 'Remove background in seconds',
    locale: 'es_ES',
    localeAlternate: ['es_ES'],
    siteName: 'Backgroundears erase',
  },
  twitter: {
    image: 'https://backgroundears-erase.xyz/openog.png',
    imageAlt: 'twitter image alt',
  },
};

export default defineConfig({
  plugins: [ogPlugin(ogOptions)],
  build: {
    target: 'esnext'
  }
});
