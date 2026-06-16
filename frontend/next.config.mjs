/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // El paso de lint dentro de `next build` arranca el wizard interactivo de
  // `next lint` (que cuelga en entornos sin TTY). El lint se ejecuta como
  // paso propio (`npm run lint`); el type-check de TS SÍ se mantiene en build.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
