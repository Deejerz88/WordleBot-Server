const _ = require("lodash");
const getStats = require('./getStats.js')

const createLeaderboard = async (msg, result, week, james) => {
  if (!result) {
    result = await getStats()
  }
  let golfScores = [];
  result.forEach((stat) =>
    golfScores.push(_.pick(stat, ["user", "wordleGolf"]))
  );
  // console.log(golfScores);
  let numHoles = {};
  let jamesScores = {};
  golfScores.forEach((userStats) => {
    let weekStats = userStats.wordleGolf[`week${week}`];
    if (!weekStats) return;
    jamesScores[userStats.user] = weekStats.stats.jamesScore;

    let weekObj = weekStats.scores;
    if (!weekObj) return;
    let thisWeek = Object.values(weekObj);
    numHoles[userStats.user] = thisWeek.length;
    let weekPM = thisWeek.reduce((a, b) => a + (b - 4), 0);
    userStats.wordleGolf = weekPM;
  });
  let lbStr = `\n__**Week ${week} Leaderboard**__\n`;
  let pos = 1;
  golfScores = _.chain(golfScores)
    .groupBy("wordleGolf")
    .map((value, key) => ({ weekScore: Number(key), users: value }))
    .value();
  let leaderBoard = _.sortBy(golfScores, ["weekScore"]);
  leaderBoard.forEach((leader, i) => {
    let users = leader.users;
    users.forEach((user) => {
      user.jamesScore = jamesScores[user.user];
    });
    users = _.orderBy(users, ["jamesScore"], ["desc"]);
    leaderBoard[i].users = users;
  });
  leaderBoard.forEach((leader) => {
    let users = leader.users;
    let weekScore = leader.weekScore;
    if (!weekScore && weekScore !== 0) return;
    weekScore = weekScore > 0 ? `+ ${weekScore}` : weekScore;
    let emoji = pos === 1 ? "    🏆" : "";
    users.forEach((user) => {
      let posStr = users.length > 1 ? "T" + pos : "   " + pos;
      lbStr += `   **${posStr}. ${user.user.substring(
        0,
        user.user.indexOf("-")
      )}**   |   ${
        numHoles[user.user]
      } played   |   **${weekScore}**${emoji}\n`;
      let js =
        pos === 1
          ? "       " + `   ↳ **James Score**: ${Number(user.jamesScore).toFixed(3)}\n`
          : "";
      lbStr += js;
    });
    pos += users.length;
  });
  let pinned = await msg.channel.messages.fetchPinned();
  pinned = pinned.filter((m) => m.content.includes(`Leaderboard`));
  if (!pinned.first()) {
    msg.channel.send(`${lbStr}`).then((msg) => msg.pin());
  } else {
    pinned.first().edit(`${lbStr}`);
  }
};

module.exports = createLeaderboard;
