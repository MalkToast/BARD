const MongoClient = require("MongoDB").MongoClient;

function connect() {
  MongoClient.connect(process.env.MONGODB_URI, { useUnifiedTopology: true }, (err, database) => {
    if (err) throw err;
    global.db = database.db(process.env.MONGODB_NAME);
  });
  console.log("MongoDB Connected");
}

module.exports = {
  connect: connect
}