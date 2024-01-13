export default defineEventHandler(
  () =>
    new Response(undefined, {
      status: 301,
      headers: new Headers({
        Location: "https://github.com/midzdotdev/sykes-owner-calendar",
      }),
    })
);
