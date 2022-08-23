const fs = require("node:fs");
const { Client, Collection, Intents } = require("discord.js");
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
const eventFiles = fs
  .readdirSync("./events")
  .filter((file) => file.endsWith(".js"));
const async = require("async");
require("dotenv").config();

for (const file of eventFiles) {
  const event = require(`./events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}
client.commands = new Collection();
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once("ready", () => {
  console.log("Ready!");
//     client.guilds.fetch("429408678173605889").then((guild) => {
//       console.log(guild.memberCount)
//     guild.members.list().then((list) => {
//       list.each((member) => console.log(member.user.username));
//     });
//   });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
});

console.log(process.env.TOKEN)
client.login(process.env.TOKEN);

// .each((member) => console.log(member.user.username))))
// server.members.forEach(member => {console.log(member.user.username)})

//     .then(() => {
//     server.members.forEach(async (member) => {
//         console.log(member.user.username);
//     });
// });
