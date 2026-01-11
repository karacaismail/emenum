import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS 4.x Configuration
 *
 * Note: In Tailwind CSS 4.x, most configuration is done via CSS using @theme
 * directive in globals.css. This config file is optional and primarily used for:
 * - Content path specification (for production purging)
 * - JavaScript plugins
 * - Presets
 *
 * @see https://tailwindcss.com/docs/v4-beta
 */
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Theme extensions are defined in globals.css using @theme directive
      // This section is for JavaScript-only extensions or plugins
    },
  },
  plugins: [],
};

export default config;
