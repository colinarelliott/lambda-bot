import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import { route } from './router.js';
import { handleChat } from './handlers/chat.js';
import { handleCode } from './handlers/code.js';
import { handleImage } from './handlers/image.js';
import { handleArr } from './handlers/arr.js';
import { sendChunked, sendImage } from './utils/discordUtils.js';
import { getHistory, appendHistory, clearHistory } from './utils/memory.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const HANDLERS = {
  chat:  handleChat,
  code:  handleCode,
  image: handleImage,
  arr:   handleArr,
};

const HELP_TEXT = [
  "**Lambda** — AI Orchestrator",
  "Type naturally and Lambda routes your request automatically, or use a prefix:",
  "",
  "`!chat <message>`  — General conversation (Nemotron)",
  "`!code <message>`  — Code generation & debugging",
  "`!image <prompt>`  — Image generation (Stable Diffusion)",
  "`!arr [subcommand]`— Arr suite: status · queue · calendar · wanted · disk",
  "`!reset`           — Clear your conversation history",
  "`!help`            — Show this message",
].join("\n");

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const { type, prompt } = await route(message.content);

  if (type === "help") {
    await message.reply(HELP_TEXT);
    return;
  }

  if (type === "reset") {
    clearHistory(message.author.id);
    await message.reply("Your conversation history has been cleared.");
    return;
  }

  const handler = HANDLERS[type];
  if (!handler) {
    await message.reply("Unknown task type. Try `!help` to see available commands.");
    return;
  }

  await message.channel.sendTyping();

  const history = getHistory(message.author.id);

  let result;
  try {
    result = await handler(prompt, history);
  } catch (err) {
    const isConnRefused =
      err.cause?.code === "ECONNREFUSED" || err.code === "ECONNREFUSED";
    console.error(`[${type}] Error:`, err.message);
    if (isConnRefused) {
      await message.reply(
        `⚠️ Could not reach the **${type}** service. Is it running?`
      );
    } else {
      await message.reply(`❌ **${type}** handler error: ${err.message}`);
    }
    return;
  }

  if (result.type === "text") {
    if (type !== "arr") {
      appendHistory(message.author.id, "user", prompt);
      appendHistory(message.author.id, "assistant", result.content);
    }
    await sendChunked(message, result.content);
  } else if (result.type === "image") {
    await sendImage(message, result.content, result.filename);
  } else if (result.type === "embed") {
    await message.reply({ embeds: [result.embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);