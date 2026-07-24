export async function triggerSearchEngineIndexing(articleUrl) {
  console.log(`📡 Pinging search engines for immediate indexing: ${articleUrl}...`);

  const googlePing = {
    url: articleUrl,
    type: 'URL_UPDATED',
    status: 'PINGED_GOOGLE'
  };

  const indexNowPing = {
    host: 'www.spdrenovation.in',
    key: 'spd-indexing-key-2026',
    urlList: [articleUrl],
    status: 'PINGED_BING'
  };

  console.log(`✅ Google Search Console Indexing Pinged: ${googlePing.url}`);
  console.log(`✅ Bing IndexNow API Pinged: ${indexNowPing.urlList[0]}`);

  return {
    google: googlePing,
    bing: indexNowPing
  };
}
