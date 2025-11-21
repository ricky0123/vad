import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  plugins: [esbuildPlugin({ ts: true })],
  concurrency: 1,
  browsers: [
    playwrightLauncher({
      launchOptions: {
        args: [
          '--use-fake-ui-for-media-stream',
          '--use-fake-device-for-media-stream',
        ],
      },
    }),
  ],
};
