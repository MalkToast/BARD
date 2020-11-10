function create(guild) {
  db.collection("Guilds")
    .insertOne({
      _id: guild.id,
      name: guild.name,
      commandData: null,
    })
    .then(console.log(`${guild.name} (${guild.id}) added to DB`));
  getGuild(guild.id);
}

async function getGuild(id) {
  var guild = await db.collection("Guilds").findOne({ _id: id });
  return guild;
}

module.exports = {
  create: create,
  getGuild: getGuild,
};
