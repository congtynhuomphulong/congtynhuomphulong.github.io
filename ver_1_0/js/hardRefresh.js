async function handleHardReload(url) {
    const newUrl = urlWithRndQueryParam(url);
    await fetch(newUrl, {
        headers: {
            Pragma: 'no-cache',
            Expires: '-1',
            'Cache-Control': 'no-cache',
        },
    });
    window.location.href = url;
    // This is to ensure reload with url's having '#'
    window.location.reload();
}

function urlWithRndQueryParam(url, paramName) {
    const ulrArr = url.split('#');
    const urlQry = ulrArr[0].split('?');
    const usp = new URLSearchParams(urlQry[1] || '');
    usp.set(paramName || '_z', `${Date.now()}`);
    urlQry[1] = usp.toString();
    ulrArr[0] = urlQry.join('?');
    return ulrArr.join('#');
}

handleHardReload(window.location.href);