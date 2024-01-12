// const getCookie = (name: string, headers: Headers) => {

// }

export default eventHandler(async () => {
  const loginPageResp = await fetch('https://www.sykescottages.co.uk/account/login')

  // const phpSessId = [...loginPageResp.headers.entries()].find(([k, v]) => k === 'set-cookie' && v.startsWith('PHPSESSID='))[1].split(';')[0].split('=')[1];

  return loginPageResp.headers.getSetCookie();

  // const sessionId = '529utnjpjk9t3pdv30csns3qvb';
  // const propertyId = '21953';

  // const a = await fetch(`https://www.sykescottages.co.uk/owner/bookings/${propertyId}`, {
  //   "headers": {
  //     "cookie": `PHPSESSID=${sessionId}`,
  //   }
  // });

  // const b = await a.text();

  // return b.includes("Mr Brian& Helen Waterfield");
})
