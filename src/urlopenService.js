export default async function getJSONFromURL(url) {
  let json = null;
  try {
    const bl = await window.spawn('python3', [`${window.dirname}/python/urlopen-lib.py`, '-u', url])
    json = JSON.parse(bl.toString());
  }
  catch (error) {
    if (error.stderr != null) {
      console.log(error.stderr.toString());
    }
    else {
      console.log(error);
    }
  }

  return json;
}
