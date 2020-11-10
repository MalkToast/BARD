const Discord = require("./src/utility/discord.js");
const MongoDB = require("./src/utility/mongodb.js");
const Spotify = require("./src/utility/spotify.js");

const Guild = require("./src/models/guild.js");

MongoDB.connect();
Discord.connect();
Spotify.connect();

// Todo: hide stuff behind functions in modules, find potential better way to organize

Discord.client.on("message", (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Fetch guild info, add guild to DB if needed. Todo: same for users.
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

  // Detect prefix'd commmands, parse command and parameters
  if (!message.content.startsWith(process.env.PREFIX)) return;
  else {
    const regex = new RegExp(`${process.env.PREFIX}([^ ]+)( |)(.*)`);
    var cmd = message.content.replace(regex, "$1").trim().toLowerCase();
    var params = message.content.replace(regex, "$3").trim().toLowerCase();
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

  // Playing with autoresponder ideas.
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
    let old;
    let recent;
    console.log(oldDate);
    Discord.getAllMessages(message.channel.id)
      .then((messages) => {
        old = messages.filter((message) => {
          return message.createdTimestamp <= oldDate;
        });
        recent = messages.filter((message) => {
          return message.createdTimestamp > oldDate;
        });
        old.forEach((message) => arr.push(message.delete()));
        let batch = [];
        while (recent.length !== 0) {
          batch.push(recent.pop());
          if (batch.length === 100 || recent.length === 0) {
            arr.push(channel.bulkDelete(batch));
            batch = [];
          }
        }
      })
      .then(async () => await Promise.all(arr))
      .then(() => channel.send(`User ${user.username} (${user.id}) cleared this channel`))
      .catch((err) => console.log(err));
    return;
  }

  if (cmd === "spotifytest") {
    // Todo: Parameterize this, turn into playlist command
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

  // Spams my music channel w/ the contents of a playlist
  if (cmd === "spamify") {
    if (message.channel.id === "773096553744826371") {
      Spotify.getAllPlaylistTracks("5Zibg2CdJa1hYRoBWR7GrT").then((items) => {
        items.forEach((item) => message.channel.send(item.track.external_urls.spotify));
      });
    }
    return;
  }
});
