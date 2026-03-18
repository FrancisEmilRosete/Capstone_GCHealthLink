declare module "next-pwa" {
  import type { NextConfig } from "next";

  type PwaOptions = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    [key: string]: unknown;
  };

  function withPWAInit(options?: PwaOptions): (nextConfig?: NextConfig) => NextConfig;

  export default withPWAInit;
}
