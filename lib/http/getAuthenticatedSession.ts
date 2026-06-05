import {
  Cookies,
  getSetCookiesFromHeaders,
  serialiseCookies,
} from "../utils/cookies";
import { USER_AGENT } from "./constants";
import * as cheerio from "cheerio";

export interface SykesSession {
  cookies: Cookies;
}

export const getAuthenticatedSession = async (params: {
  email: string;
  password: string;
}): Promise<SykesSession> => {
  const loginPageResp = await fetch(
    "https://www.sykescottages.co.uk/account/login",
    { headers: { "user-agent": USER_AGENT } }
  );

  const cookies = getSetCookiesFromHeaders(loginPageResp.headers, [
    "PHPSESSID",
    "session_id",
  ]);

  const loginTicket = cheerio
    .load(await loginPageResp.text())(
      'form[action="/account/login"] input[name="ticket"]'
    )
    .attr("value");

  const loginFormData = new FormData();
  loginFormData.append("email", params.email);
  loginFormData.append("password", params.password);
  loginFormData.append("showpassword", "0");
  loginFormData.append("submit", "Log in");
  loginFormData.append("ticket", loginTicket);
  loginFormData.append("formName", "login");

  const loginResp = await fetch("https://www.sykescottages.co.uk/account/login", {
    method: "POST",
    headers: {
      cookie: serialiseCookies(cookies),
      "user-agent": USER_AGENT,
    },
    body: loginFormData,
  });

  // A successful login redirects into the owner area; a failed one lands back on
  // /account/login. Fail loudly so a red run clearly distinguishes an auth
  // problem (bad/expired credentials) from a markup/extraction problem.
  if (!loginResp.url || new URL(loginResp.url).pathname.startsWith("/account/login")) {
    throw new Error("Sykes authentication failed — check the email and password");
  }

  return { cookies };
};
