
fetchLatestVersion = async () => {
    const data = await fetch("https://api.github.com/repos/sandiz/rs-manager/releases/latest");
    const json = await data.json();
    const assets = json.assets;
    $("#version").html(json.tag_name + " - " + json.name);
    for (let i = 0; i < assets.length; i += 1) {
        const asset = assets[i];
        if (asset.name.endsWith(".dmg"))
            $("#mac-dl").attr('href', asset.browser_download_url);
        if (asset.name.endsWith(".exe"))
            $("#win-dl").attr('href', asset.browser_download_url);
    }
}
fetchLatestVersion();
