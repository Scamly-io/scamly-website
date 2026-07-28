/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Blog deprecated during sunset — page code retained, inaccessible to users
      {
        source: "/blog",
        destination: "/",
        permanent: false,
      },
      {
        source: "/blog/:path*",
        destination: "/",
        permanent: false,
      },
      // Post-signup check-email page deprecated (account creation disabled)
      {
        source: "/check-email",
        destination: "/",
        permanent: false,
      },
      // Note: /portal/onboarding left accessible for existing incomplete profiles.
      // It is no longer linked from auth because signup is disabled.
    ];
  },
};

export default nextConfig;
