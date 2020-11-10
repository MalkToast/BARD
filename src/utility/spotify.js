const SpotifyWebApi = require("spotify-web-api-node");

const client = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_ID,
  clientSecret: process.env.SPOTIFY_SECRET,
  redirectUri: process.env.SPOTIFY_URI,
});

class Target {
  constructor(param1, param2 = null) {
    let id;
    let type;
    if (param2 === null) {
      const pattern = /.*spotify(?:.com|)(:|\/)([a-z]+)\1([a-zA-Z0-9]+).*/;
      id = param1.replace(pattern, "$3");
      type = param1.replace(pattern, "$2");
    } else {
      id = param1;
      type = param2;
    }
    this.id = id;
    this.type = type;
    this.uri = `spotify:${this.type}:${this.id}`;
    this.webUri = `https://www.spotify.com/${this.type}/${this.id}`;
  }
}

function connect() {
  client.setRefreshToken(process.env.SPOTIFY_REFRESH);
  client
    .refreshAccessToken()
    .then((data) => {
      console.log(`Spotify: New access token acquired`);
      client.setAccessToken(data.body["access_token"]);
    })
    .catch((err) => console.log(err));
}

async function getAllPlaylistTracks(playlist) {
  let res = [];
  let next = true;
  let options = { limit: 100, offset: 0 };
  do {
    tracks = await client.getPlaylistTracks(playlist, options);
    res = res.concat(tracks.body.items);
    if (tracks.body.next !== null) {
      offset = Number(tracks.body.next.replace(/.+offset=([^&]+).*/, "$1"));
      options.offset = offset;
    } else {
      next = false;
    }
  } while (next != false);
  return res;
}

async function clearPlaylist(playlist) {
  let res = await client
    .getPlaylist(playlist)
    .then((list) => {
      let items = list.body.tracks.items;
      if (items.length !== 0) {
        let tracks = [];
        items.forEach((item) => tracks.push({ uri: item.track.uri }));
        client.removeTracksFromPlaylist(playlist, tracks).then(() => removeAllPlaylistTracks(playlist));
      }
      return list;
    })
    .catch((err) => console.log(err));
  return res;
}

function parseUri(inputUri) {
  const pattern = /.*spotify(?:.com|)(:|\/)([a-z]+)\1([a-zA-Z0-9]+).*/;
  const id = inputUri.replace(pattern, "$3");
  const type = inputUri.replace(pattern, "$2");
  return {
    id: id,
    type: type,
    uri: `spotify:${type}:${id}`,
    webUri: `https://www.spotify.com/${type}/${id}`,
  };
}

module.exports = {
  connect: connect,
  getAllPlaylistTracks: getAllPlaylistTracks,
  clearPlaylist: clearPlaylist,
  parseUri: parseUri,
  client: client,
  Target: Target,
};
