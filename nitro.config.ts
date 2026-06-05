//https://nitro.unjs.io/config
export default defineNitroConfig({
  vercel: {
    functions: {
      // The Sykes scrape (sign in + fetch bookings) takes ~10s; give the
      // serverless function headroom so the calendar feed doesn't time out.
      maxDuration: 60,
    },
  },
});
