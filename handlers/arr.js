import { EmbedBuilder } from 'discord.js';
import { ARR } from '../config.js';
import {
  configuredApps,
  getHealth,
  getAllHealth,
  getQueue,
  getCalendar,
  getMissing,
  getDiskSpace,
} from '../utils/arrClient.js';

const MEDIA_APPS = ['sonarr', 'radarr', 'lidarr'];

function fmtBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '?';
  const gb = bytes / 1e9;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / 1e6).toFixed(0)} MB`;
}

// ─── Sub-command handlers ─────────────────────────────────────────────────────

async function handleStatus() {
  const health = await getAllHealth();
  const allOk = Object.values(health).every(h => h.ok);

  const lines = Object.entries(health).map(([app, { ok, issues, unreachable }]) => {
    const name = ARR[app].name;
    if (unreachable) return `🔴 **${name}** — unreachable`;
    if (!ok) return `🟡 **${name}** — ${issues.map(i => i.message).join('; ')}`;
    return `🟢 **${name}** — OK`;
  });

  const embed = new EmbedBuilder()
    .setTitle('Arr Suite — Status')
    .setDescription(lines.join('\n'))
    .setColor(allOk ? 0x57f287 : 0xfee75c)
    .setTimestamp();

  return { type: 'embed', embed };
}

async function handleQueue() {
  const apps = configuredApps();
  const embed = new EmbedBuilder()
    .setTitle('Arr Suite — Download Queue')
    .setColor(0x5865f2)
    .setTimestamp();

  for (const app of apps) {
    const name = ARR[app].name;
    try {
      const items = await getQueue(app);
      if (!items.length) {
        embed.addFields({ name, value: '_Empty_', inline: false });
      } else {
        const value = items.map(i => {
          const pct = i.progress != null ? `${i.progress.toFixed(0)}%` : '?%';
          const eta = i.eta ? ` · ETA ${i.eta}` : '';
          return `**${i.title.slice(0, 55)}**\n${i.status} · ${pct}${eta}`;
        }).join('\n\n').slice(0, 1024);
        embed.addFields({ name, value, inline: false });
      }
    } catch (err) {
      embed.addFields({ name, value: `_Unavailable: ${err.message}_`, inline: false });
    }
  }

  return { type: 'embed', embed };
}

async function handleCalendar() {
  const apps = configuredApps().filter(a => MEDIA_APPS.includes(a));
  const embed = new EmbedBuilder()
    .setTitle('Arr Suite — Upcoming (7 days)')
    .setColor(0xeb459e)
    .setTimestamp();

  for (const app of apps) {
    const name = ARR[app].name;
    try {
      const items = await getCalendar(app);
      if (!items.length) {
        embed.addFields({ name, value: '_Nothing upcoming_', inline: false });
      } else {
        const value = items
          .map(i => `**${i.title}**${i.extra ? ` · ${i.extra}` : ''} — ${i.date}`)
          .join('\n')
          .slice(0, 1024);
        embed.addFields({ name, value, inline: false });
      }
    } catch (err) {
      embed.addFields({ name, value: `_Unavailable: ${err.message}_`, inline: false });
    }
  }

  if (!embed.data.fields?.length) {
    embed.setDescription('_No media apps configured (Sonarr / Radarr / Lidarr)_');
  }

  return { type: 'embed', embed };
}

async function handleWanted() {
  const apps = configuredApps().filter(a => MEDIA_APPS.includes(a));
  const embed = new EmbedBuilder()
    .setTitle('Arr Suite — Missing / Wanted')
    .setColor(0xed4245)
    .setTimestamp();

  for (const app of apps) {
    const name = ARR[app].name;
    try {
      const items = await getMissing(app);
      if (!items.length) {
        embed.addFields({ name, value: '_Nothing missing_', inline: false });
      } else {
        const value = items
          .map(i => `**${i.title}**${i.extra ? ` · ${i.extra}` : ''}${i.year ? ` (${i.year})` : ''}`)
          .join('\n')
          .slice(0, 1024);
        embed.addFields({ name, value, inline: false });
      }
    } catch (err) {
      embed.addFields({ name, value: `_Unavailable: ${err.message}_`, inline: false });
    }
  }

  if (!embed.data.fields?.length) {
    embed.setDescription('_No media apps configured (Sonarr / Radarr / Lidarr)_');
  }

  return { type: 'embed', embed };
}

async function handleDisk() {
  const apps = configuredApps().filter(a => a !== 'prowlarr');
  const embed = new EmbedBuilder()
    .setTitle('Arr Suite — Disk Space')
    .setColor(0xfee75c)
    .setTimestamp();

  for (const app of apps) {
    const name = ARR[app].name;
    try {
      const disks = await getDiskSpace(app);
      if (!disks.length) {
        embed.addFields({ name, value: '_No data_', inline: false });
      } else {
        const value = disks.map(d => {
          const pct = d.total > 0 ? `${((d.free / d.total) * 100).toFixed(0)}%` : '?%';
          return `\`${d.path}\`\n${fmtBytes(d.free)} free of ${fmtBytes(d.total)} (${pct} free)`;
        }).join('\n').slice(0, 1024);
        embed.addFields({ name, value, inline: false });
      }
    } catch (err) {
      embed.addFields({ name, value: `_Unavailable: ${err.message}_`, inline: false });
    }
  }

  return { type: 'embed', embed };
}

// ─── Main export ─────────────────────────────────────────────────────────────

async function handleAppStats(appName) {
  const cfg = ARR[appName];
  if (!cfg) return handleHelp();

  const embed = new EmbedBuilder()
    .setTitle(`${cfg.name} — Stats`)
    .setColor(0x5865f2)
    .setTimestamp();

  // Health
  try {
    const { ok, issues, unreachable } = await getHealth(appName);
    const statusLine = unreachable
      ? '🔴 Unreachable'
      : ok
      ? '🟢 OK'
      : `🟡 ${issues.map(i => i.message).join('; ')}`;
    embed.addFields({ name: 'Status', value: statusLine, inline: false });
  } catch (err) {
    embed.addFields({ name: 'Status', value: `_Error: ${err.message}_`, inline: false });
  }

  // Queue
  try {
    const items = await getQueue(appName);
    if (!items.length) {
      embed.addFields({ name: 'Queue', value: '_Empty_', inline: false });
    } else {
      const value = items.map(i => {
        const pct = i.progress != null ? `${i.progress.toFixed(0)}%` : '?%';
        const eta = i.eta ? ` · ETA ${i.eta}` : '';
        return `**${i.title.slice(0, 55)}**\n${i.status} · ${pct}${eta}`;
      }).join('\n\n').slice(0, 1024);
      embed.addFields({ name: 'Queue', value, inline: false });
    }
  } catch (err) {
    embed.addFields({ name: 'Queue', value: `_Unavailable: ${err.message}_`, inline: false });
  }

  // Disk
  if (appName !== 'prowlarr') {
    try {
      const disks = await getDiskSpace(appName);
      if (!disks.length) {
        embed.addFields({ name: 'Disk', value: '_No data_', inline: false });
      } else {
        const value = disks.map(d => {
          const pct = d.total > 0 ? `${((d.free / d.total) * 100).toFixed(0)}%` : '?%';
          return `\`${d.path}\`\n${fmtBytes(d.free)} free of ${fmtBytes(d.total)} (${pct} free)`;
        }).join('\n').slice(0, 1024);
        embed.addFields({ name: 'Disk', value, inline: false });
      }
    } catch (err) {
      embed.addFields({ name: 'Disk', value: `_Unavailable: ${err.message}_`, inline: false });
    }
  }

  return { type: 'embed', embed };
}

function handleHelp() {
  const embed = new EmbedBuilder()
    .setTitle('Arr Suite — Help')
    .setColor(0x5865f2)
    .setDescription('All available `!arr` commands:')
    .addFields(
      { name: '`!arr` / `!arr status`', value: 'Health check all configured apps', inline: false },
      { name: '`!arr queue`',           value: 'Show the active download queue across all apps', inline: false },
      { name: '`!arr calendar`',        value: 'Upcoming releases in the next 7 days (Sonarr / Radarr / Lidarr)', inline: false },
      { name: '`!arr wanted`',          value: 'Missing / wanted monitored items (Sonarr / Radarr / Lidarr)', inline: false },
      { name: '`!arr disk`',            value: 'Disk space per root folder for all apps', inline: false },
      { name: '`!arr help`',            value: 'Show this help message', inline: false },
    )
    .setTimestamp();
  return { type: 'embed', embed };
}

/**
 * Handle an !arr command.
 * @param {string} prompt - Everything after "!arr" (e.g. "queue", "disk", "")
 */
export async function handleArr(prompt) {
  const subcommand = prompt.trim().toLowerCase().split(/\s+/)[0] || 'status';

  switch (subcommand) {
    case 'status':   return handleStatus();
    case 'queue':    return handleQueue();
    case 'calendar': return handleCalendar();
    case 'wanted':   return handleWanted();
    case 'disk':     return handleDisk();
    case 'help':     return handleHelp();
    default:
      if (subcommand in ARR) return handleAppStats(subcommand);
      return handleHelp();
  }
}
