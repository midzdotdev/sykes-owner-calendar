export type Cookies = Record<string, string>;

export const getSetCookiesFromHeaders = (
  headers: Headers,
  keys: string[]
): Cookies => {
  const setCookieHeaders = headers.getSetCookie();

  const cookies: Cookies = {};

  for (const setCookie of setCookieHeaders) {
    const [key, value] = setCookie.split(";")[0].split("=");

    // if (keys.includes(key)) {
    cookies[key] = value;
    // }
  }

  return cookies;
};

export const serialiseCookies = (cookies: Cookies): string =>
  Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
