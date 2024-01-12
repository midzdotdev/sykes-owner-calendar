export default eventHandler(async () => {
  const loginPage = fetch('https://www.sykescottages.co.uk/account/login')

  return loginPage.then(x => [...x.headers.entries()]);

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
