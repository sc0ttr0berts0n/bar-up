import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import mkcert from 'vite-plugin-mkcert';

export default defineConfig({
    server: {
        host: true,
    },
    plugins: [vue(), mkcert()],
});
