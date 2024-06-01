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

handleHardReload(window.location.href);