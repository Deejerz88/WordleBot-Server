const Discord = require("discord.js");
const async = require("async");
require("dotenv").config();
const { SlashCommandBuilder } = require("@discordjs/builders");
const mongoose = require("mongoose");
var _ = require("lodash");
const createLeaderboard = require("../lib/utils/createLeaderboard.js");
const updateDB = require("../lib/utils/updateDB.js");
const getStats = require("../lib/utils/getStats.js");
const calcStats = require("../lib/utils/calcStats.js");

const james = [
  0, 1, 0.9253705585449039, 0.7761116756347115, 0.5778998317544551,
  0.3780879878741986, 0.21887851276999337,
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wordle")
    .setDescription("Record score")
    .addStringOption((option) =>
      option
        .setName("input")
        .setDescription(
          "Paste Results Here or Enter in format: Wordle 234 5/6. Submit Distr: 1:x,2:x... 6:x,0:x (fails)"
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    //receive input and parse score
    const value = interaction.options.getString("input");
    const user = interaction.user;
    const username = user.username;
    const id = user.id;
    const pic = user.avatarURL();

    //if Wordle score submitted
    if (value.split(" ")[0].toLowerCase() === "wordle") {
      const stringArr = value
        .substring(0, value.indexOf("/") + 2)
        .trim()
        .split(" ");
      let score = stringArr[2][0];
      score = isNaN(score) ? 0 : score;
      const day = stringArr[1];
      const days = day - 352 + 1;
      const week = Math.ceil(days / 7);
      const rem = days % 7;
      const golfDay = rem === 0 ? 7 : rem;
      let gWeek;
      let gTotal = 0;
      let golfStr = "";
      let weekJamesTotal = 0;

      //recreate & return blocks (if they were sent)
      let blocks = "";
      try {
        blocks = value.substring(value.indexOf("/") + 3).split(" ");
        blocks = blocks.join("\n") + "\n";
      } catch (err) {}
      const reply = stringArr.join(" ") + blocks;

      //get & calculate interacting user's stats
      const result = await getStats();
      const stats = _.find(result, ["user", `${username}-${id}`]);
      const gScores = stats.wordleGolf;
      const dist = stats.distribution;
      dist[score]++;

      //calc total # of games & average
      let wins = stats.wins;
      let numGames = dist.reduce((a, b) => a + b, 0);
      let completedGames = numGames - dist[0];
      let total = 0;
      dist.forEach((s, i) => {
        total += s * i;
      });
      const avg = (total / completedGames).toFixed(3);

      //calc JamesScore
      let jamesTotal = 0;
      dist.forEach((s, i) => (jamesTotal += s * james[i]));
      const jamesScore = ((jamesTotal / completedGames) * 10).toFixed(3);

      //Get this week's scores
      if (golfDay === 1) {
        gScores[`week${week}`] = { scores: {}, stats: {} };
        gWeek = gScores[`week${week}`].scores;
      } else {
        gWeek = gScores[`week${week}`].scores;
      }

      //Add today's score
      score = !score ? 8 : score;
      gWeek[`day${golfDay}`] = Number(score);

      //Check for missed Days
      let golfDays = Object.keys(gWeek);
      let gDaysPlayed = golfDays.length;
      if (gDaysPlayed !== golfDay) {
        let i = 1;
        golfDays.forEach((day) => {
          if (day.slice(-1) != i) {
            gWeek[`day${i}`] = 8;
            i += 1;
          }
          i += 1;
        });
      }

      //Sort by Day #
      let weekArr = Object.entries(gWeek);
      weekArr.sort((a, b) => a[0].slice(-1) - b[0].slice(-1));

      //Gen Golf String & get week James Score total & total score
      weekArr.forEach((weekDay) => {
        const s = weekDay[1];
        weekJamesTotal += !!james[s] ? james[s] : 0;
        gTotal += s;
        let hole = s - 4;
        const thisDay = weekDay[0].slice(-1);
        hole = hole > 0 ? "+" + hole : hole;
        golfStr += `**Hole ${thisDay}:** ${hole}`;
        golfStr = thisDay < golfDay ? (golfStr += "  |  ") : golfStr;
      });

      //Calc Week James Score
      let weekJamesScore = (
        (weekJamesTotal / Object.keys(gWeek).length) *
        10
      ).toFixed(3);

      //update this week's scores & stats obj
      gScores[`week${week}`].scores = Object.fromEntries(weekArr);
      gScores[`week${week}`].stats.jamesScore = weekJamesScore;

      //calc total & today's golf score
      let plusMinus = gTotal - golfDay * 4;
      plusMinus = plusMinus > 0 ? `+ ${plusMinus}` : plusMinus;
      let todayPM = score - 4;

      switch (todayPM) {
        case -3:
          todayPM += `   🎯`;
          break;
        case -2:
          todayPM += `   🦅`;
          break;
        case -1:
          todayPM += `   🐤`;
          break;
        case 0:
          todayPM += `   👏`;
          break;
        case 1:
          todayPM = `+ ${todayPM}   😬`;
          break;
        case 2:
          todayPM = `+ ${todayPM}   💩`;
          break;
        case 4:
          todayPM = `+ ${todayPM}   ☃️`;
          break;
        default:
          todayPM;
      }

      //reply
      interaction
        .editReply(
          `${reply}
__**New Totals For ${username}**__
> **Total Games:** ${numGames}
> **Average:** ${avg}
> **James Score:** ${jamesScore}
**1's:** ${dist[1]} | **2's:** ${dist[2]} | **3's:** ${dist[3]} | **4's:** ${dist[4]} | **5's:** ${dist[5]} | **6's:** ${dist[6]} | **Fails:** ${dist[0]}
---------------------------------------------------------------
🏌️  __**WORDLE GOLF**__   ⛳
**Week** ${week}  **Day** ${golfDay}
> **Score**: ${todayPM}
> **Total**: ${plusMinus}
> **James Score**: ${weekJamesScore}
> **Wins**: ${wins}
${golfStr}
---------------------------------------------------------------`
        )
        .then((msg) => {
          createLeaderboard(msg, result, week, james);
        })
        .then(() => {
          updateDB(numGames, avg, jamesScore, dist, gScores, username, id, pic);
        })
        .then(() => {
          calcStats();
        });

      console.log("replied");
    }
  },
};
