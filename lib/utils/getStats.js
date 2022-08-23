const mongoose = require("mongoose");
require("dotenv").config();

const getStats = async (user, field) => {
  console.log(process.env.MONGO_URI);

  return new Promise((resolve) => {
    mongoose
      .connect(process.env.MONGO_URI)
      .then(() => {
        console.log("MongoDB has been connected");
        console.log(user);
        let query = user ? { user } : {};
        let projection = field ? { projection: { [field]: 1, item: 1 } } : {};
        const db = mongoose.connection;
        const collection = db.collection("Wordle");
        collection.find(query, projection).toArray((err, result) => {
          if (err) throw err;
          mongoose.connection.close();
          // console.log(result)
          resolve(result);
        });
      })
      .catch((error) => {
        console.log(error);
      });
  });
};
// getStats()
module.exports = getStats;
