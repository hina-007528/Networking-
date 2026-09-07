import type { Config } from 'tailwindcss';
import { tailwindPreset } from '../../packages/config/src/tailwind-preset';

const config: Config = {
  presets: [tailwindPreset as Config],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
