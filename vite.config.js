import { defineConfig } from 'vite';
import ogPlugin from 'vite-plugin-open-graph'
import tailwindcss from 'tailwindcss' 
import autoprefixer from 'autoprefixer'

const ogOptions = {
  basic: {
    url: 'https://background-erase.xyz/',
    title: 'Backgroundears erase',
    type: 'image.png',
    image: 'https://background-erase.xyz/openog.png',
    determiner: 'auto',
    description: 'Remove background in seconds',
    locale: 'en_us',
    localeAlternate: ['en_us'],
    siteName: 'Backgroundears erase',
  },
  twitter: {
    image: 'https://background-erase.xyz/openog.png',
    imageAlt: 'twitter image alt',
  },
};

export default defineConfig({
  plugins: [ogPlugin(ogOptions)],
  css: {
    postcss:{
      plugins: [
        tailwindcss,
        autoprefixer
      ]
    }
  },
  build: {
    target: 'esnext'
  }
});
