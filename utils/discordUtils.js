import { AttachmentBuilder } from 'discord.js';

const MAX_LENGTH = 2000;

/**
 * Reply to a message with text, splitting into multiple messages if needed.
 */
export async function sendChunked(message, text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += MAX_LENGTH) {
    chunks.push(text.slice(i, i + MAX_LENGTH));
  }
  await message.reply(chunks[0]);
  for (let i = 1; i < chunks.length; i++) {
    await message.channel.send(chunks[i]);
  }
}

/**
 * Reply to a message with an image file from a Buffer.
 */
export async function sendImage(message, buffer, filename = "generated.png") {
  const attachment = new AttachmentBuilder(buffer, { name: filename });
  await message.reply({ files: [attachment] });
}

