const DiscordJS = require("discord.js");
const client = new DiscordJS.Client();

function connect() {
  client
    .login(process.env.DISCORD_TOKEN)
    .then(() => console.log("Discord login successful"))
    .catch((err) => {
      console.log("Connection error, details follow.");
      console.log(err);
      console.log("Retrying in 30 seconds");
    });
  client.once("ready", () => console.log("Discord client ready"));
}

async function getAllMessages(channel, before) {
  let res = [];
  let options = { limit: 100 };
  if (before) {
    options.before = before;
  }
  messages = await client.channels
    .fetch(channel)
    .then((channel) => channel.messages.fetch(options))
    .then(async (messages) => {
      res = res.concat(messages.array());
      if (messages.size === 100) {
        next = await getAllMessages(channel, messages.last().id);
        res = res.concat(next);
      }
      return res;
    })
    .catch((err) => console.log(err));
  return messages;
}

module.exports = {
  getAllMessages: getAllMessages,
  connect: connect,
  client: client,
};
