const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { initializeDatabases } = require("./database");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

const commands = [];
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
    console.log(`[Commands] Loaded: ${command.data.name}`);
  }
}

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  console.log(`[Events] Loaded: ${event.name}`);
}

async function deployCommands() {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.error(
      "[Error] DISCORD_BOT_TOKEN not found in environment variables",
    );
    process.exit(1);
  }

  const rest = new REST().setToken(token);

  try {
    console.log("[Deploy] Refreshing application commands...");

    const clientId = Buffer.from(token.split(".")[0], "base64").toString();

    await rest.put(Routes.applicationCommands(clientId), { body: commands });

    console.log(
      "[Deploy] Successfully registered application commands globally",
    );
  } catch (error) {
    console.error("[Deploy] Error deploying commands:", error);
  }
}

async function main() {
  const token = process.env.DISCORD_BOT_TOKEN;

  if (!token) {
    console.error("[Error] DISCORD_BOT_TOKEN not found");
    console.log("[Info] Please set the DISCORD_BOT_TOKEN secret in Replit");
    console.log(
      "[Info] 1. Go to Discord Developer Portal: https://discord.com/developers/applications",
    );
    console.log("[Info] 2. Create or select your application");
    console.log("[Info] 3. Go to Bot section and copy the token");
    console.log(
      "[Info] 4. Add it as a secret named DISCORD_BOT_TOKEN in Replit",
    );
    process.exit(1);
  }

  // Start HTTP server FIRST for Render health checks (port scan happens immediately)
  const PORT = process.env.PORT || 3000;
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: 'Emerald Isle Casino' }));
  }).listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP] Server listening on port ${PORT}`);
  });

  console.log("[Database] Initializing databases...");
  initializeDatabases();

  console.log("[Bot] Deploying commands...");
  await deployCommands();

  console.log("[Bot] Logging in...");
  await client.login(token);
}

main().catch((error) => {
  console.error("[Fatal Error]", error);
  process.exit(1);
});
