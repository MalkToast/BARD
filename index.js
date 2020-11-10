const SpotifyWebApi = require("spotify-web-api-node");
const SpotifyClient = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_ID,
  clientSecret: process.env.SPOTIFY_SECRET,
  redirectUri: process.env.SPOTIFY_URI,
});
const Discord = require("./src/utility/discord.js");
const MongoDB = require("./src/utility/mongodb.js");
const Spotify = require("./src/utility/spotify.js");

const Guild = require("./src/models/guild.js");

async function getAllPlaylistTracks(playlist) {
  let res = [];
  let next = true;
  let options = { limit: 100, offset: 0 };
  do {
    tracks = await SpotifyClient.getPlaylistTracks(playlist, options);
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

async function removeAllPlaylistTracks(playlist) {
  let res = await SpotifyClient.getPlaylist(playlist)
    .then((list) => {
      let items = list.body.tracks.items;
      if (items.length !== 0) {
        let tracks = [];
        items.forEach((item) => tracks.push({ uri: item.track.uri }));
        SpotifyClient.removeTracksFromPlaylist(playlist, tracks).then(() => removeAllPlaylistTracks(playlist));
      }
      return list;
    })
    .catch((err) => console.log(err));
  return res;
}

// 2020-05-03: Mongoose + Express, you can just make models, require them where needed, and only connect in your main app...So maybe just wing it w/ modular design?

// when the client is ready, run this code
// this event will only trigger one time after logging in

MongoDB.connect();
Discord.connect();
Spotify.connect();

Discord.client.on("message", (message) => {
  if (message.author.bot) return;

  if (message.channel.type === "text") {
    Guild.getGuild(message.channel.guild.id).then((res) => {
      if (res) {
        var guild = res;
        console.log(guild);
      } else {
        Guild.newGuild(message.channel.guild);
      }
    });
  }

  // Detect prefix'd commmands
  if (!message.content.startsWith(process.env.PREFIX)) return;
  else {
    const matchStr = `${process.env.PREFIX}([^ ]+)( |)(.*)`;
    const regex = new RegExp(matchStr);
    let raw = message.content.replace(regex, "$3").trim();
    for (let i = 0; i < raw.length; i++) {
      let start = false;
      console.log(i);
    }
    var cmd = message.content.replace(regex, "$1");
  }

  if (cmd === "ping") {
    message.channel
      .send("Pong!")
      .then(() =>
        console.log(
          `${message.createdAt.toISOString()} - Sent "Pong!" to ${message.author.username} ` +
            `(user id: ${message.author.id})`
        )
      )
      .catch((err) => console.log(err));
    return;
  }

  if (message.content.toLowerCase().includes("pushups") && message.channel.id === "715700388472422440") {
    message.channel
      .send(`${message.author.username} wants yinz to exercise! https://media.giphy.com/media/1334O1WETb3sIM/200w.gif`)
      .then(() =>
        console.log(
          `${message.createdAt.toISOString()} - Sent a workout call from ${message.author.username} ` +
            `(user id: ${message.author.id})`
        )
      )
      .catch((err) => console.log(err));
  }

  if (cmd === "spotify") {
    // Todo: Parameterize this.
    if (message.channel.id === "708141247897796658" || message.channel.id === "773096553744826371") {
      // Get all messages w/ a spotify track embedded
      let discTracks = Discord.getAllMessages(message.channel.id).then((messages) => {
        let embeds = [];
        messages.forEach((message) =>
          message.embeds
            .filter((embed) => embed.provider.name === "Spotify" && embed.url.includes("track"))
            .reverse()
            .forEach((embed) => {
              let url = embed.url.replace(/.+[\/]([^?\/]+).*/, "spotify:track:$1");
              if (!embeds.includes(url)) embeds.push(url);
            })
        );
        return embeds;
      });

      let spotTracks = Spotify.getAllPlaylistTracks("5VYA73wBtsAAFXJkvPerxR").catch(console.error);

      Promise.all([spotTracks, discTracks])
        .then((res) => {
          let current = [];
          let add = [];
          res[0].forEach((item) => current.push(item.track.uri));
          res[1].forEach((item) => {
            if (!current.includes(item)) {
              add.push(item);
            }
          });
          let addCount = add.length;
          do {
            let tracks = [];
            for (let i = 0; i < 100; i++) {
              if (add.length !== 0) {
                tracks.push(add.pop());
              }
            }
            Spotify.client.addTracksToPlaylist("5VYA73wBtsAAFXJkvPerxR", tracks);
          } while (add.length > 0);
          console.log(`Added ${addCount} tracks to playlist`);
        })
        .then(() => Spotify.client.getPlaylist("5VYA73wBtsAAFXJkvPerxR"))
        .then((list) => console.log(list));
    }
    return;
  }

  // Keep dev commands from activating unless sent by me on my test server
  if (message.author.id !== "182115299288547329" || message.channel.guild.id !== "715581312718733363") {
    return;
  }

  if (cmd === "test") {
    console.log(new Spotify.Target("https://open.spotify.com/track/7dDLHlyZJBqEWSndlPWyCT?si=6--71x3bSz6nyOfjHq64Fw"));
    console.log(new Spotify.Target("spotify:track:7dDLHlyZJBqEWSndlPWyCT"));
    console.log(new Spotify.Target("7dDLHlyZJBqEWSndlPWyCT", "playlist"));
  }
  // Because I'm neurotic, I want a way to empty out test channels
  if (cmd === "clearchannel") {
    let user = message.author;
    let channel = message.channel;
    let arr = [];
    let oldDate = Date.now() - 1123200000;
    Discord.getAllMessages(message.channel.id)
      .then((messages) => {
        let old = messages.filter((message) => {
          message.createdTimeStamp <= oldDate;
        });
        let recent = messages.filter((message) => {
          message.createdTimeStamp > oldDate;
        });
        console.log(old.length);
        console.log(recent.length);
        console.log(messages.length);
        // messages.forEach((message) => arr.push(message.delete()));
      })
      .then(async () => await Promise.all(arr))
      .then(() => channel.send(`User ${user.username} (${user.id}) cleared channel ${channel.name} (${channel.id})`))
      .catch((err) => console.log(err));
    return;
  }

  // Spams my music channel w/ the contents of a playlist
  if (cmd === "spamify") {
    if (message.channel.id === "773096553744826371") {
      getAllPlaylistTracks("5Zibg2CdJa1hYRoBWR7GrT").then((items) => {
        items.forEach((item) => message.channel.send(item.track.external_urls.SpotifyClient));
      });
    }
    return;
  }
});
