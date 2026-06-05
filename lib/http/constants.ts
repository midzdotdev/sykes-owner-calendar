// A real browser User-Agent. Sykes' edge returns nothing useful to requests
// without one (undici's default `node` UA looks like a bot), especially from
// non-residential IPs. Sending a normal UA makes the scraper look like a browser.
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
