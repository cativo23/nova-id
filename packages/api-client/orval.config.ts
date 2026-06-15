import { defineConfig } from 'orval';

export default defineConfig({
  novaId: {
    input: {
      target: './openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: './src/generated',
      schemas: './src/model',
      client: 'vue-query',
      httpClient: 'axios',
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: './src/mutator/custom-instance.ts',
          name: 'customInstance',
        },
        // No `query` override: let orval split by HTTP verb
        // (GET -> useQuery, POST/PUT/PATCH/DELETE -> useMutation).
        // Forcing both flags globally inverts the hooks.
      },
    },
  },
});
