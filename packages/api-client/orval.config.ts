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
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
