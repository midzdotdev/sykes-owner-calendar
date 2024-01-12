import {
  Cookies,
  getSetCookiesFromHeaders,
  serialiseCookies,
} from "../utils/cookies";
import * as cheerio from "cheerio";

export interface SykesSession {
  cookies: Cookies;
}

export const getAuthenticatedSession = async (params: {
  email: string;
  password: string;
}): Promise<SykesSession> => {
  const loginPageResp = await fetch(
    "https://www.sykescottages.co.uk/account/login"
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

  await fetch("https://www.sykescottages.co.uk/account/login", {
    method: "POST",
    headers: {
      cookie: serialiseCookies(cookies),
    },
    body: loginFormData,
  });

  // TODO: assert valid status

  return { cookies };
};
