import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { jidDecode } from "@whiskeysockets/baileys";
import { db } from "./lib/postgres.js";
import { logCommand, logError } from "./lib/logger.js";
import chalk from "chalk";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginsFolder = path.join(__dirname, "plugins");
const pluginFiles = fs.readdirSync(pluginsFolder).filter(f => f.endsWith(".js"));
const plugins = [];

const messages = {
  ownerOnly: "❌ Solo el owner puede usar este comando.",
  adminOnly: "❌ Solo administradores pueden usar este comando.",
  botAdminOnly: "❌ El bot debe ser administrador para usar este comando.",
  groupOnly: "❌ Este comando solo funciona en grupos.",
  privateOnly: "❌ Este comando solo funciona en chat privado."
};

/* =========================
   NORMALIZACIÓN REAL DE JID
========================= */
function normalizeJid(jid = "") {
  if (!jid) return jid;
  try {
    const decoded = jidDecode(jid);
    if (decoded && decoded.user && decoded.server) return `${decoded.user}@${decoded.server}`;
  } catch {}
  return jid.replace(/:\d+@/, "@");
}

const isOwner = (jid) => {
  const ownerList = config.permissions.owner || [];
  const clean = normalizeJid(jid).split("@")[0];
  return ownerList.includes(jid) || ownerList.includes(clean);
};

const isSelfRespond = () => config.features.selfRespond === true;

const isBotNumber = (jid, botId) => jid && botId && normalizeJid(jid) === normalizeJid(botId);

/* =========================
   CARGA DE PLUGINS
========================= */
for (const file of pluginFiles) {
  const importPath = pathToFileURL(path.join(pluginsFolder, file)).href;
  try {
    const plugin = await import(importPath);
    if (plugin?.default?.command) {
      plugins.push(plugin.default);
      console.log(chalk.green(`✅ Plugin cargado: ${file}`));
    } else {
      console.log(chalk.yellow(`⚠️ Plugin sin comando válido: ${file}`));
    }
  } catch (err) {
    console.error(chalk.red(`❌ Error cargando plugin ${file}: ${err}`));
  }
}

/* =========================
   HANDLER PRINCIPAL
========================= */
export async function handleMessage(conn, m) {
  const chatId = normalizeJid(m.key.remoteJid || "");
  m.isGroup = chatId.endsWith("@g.us");
  m.sender = normalizeJid(m.key.participant || chatId);
  if (m.key.fromMe) m.sender = normalizeJid(conn.user?.id || m.sender);

  m.reply = (text) => conn.sendMessage(chatId, { text }, { quoted: m });

  if (isSelfRespond() && !isBotNumber(m.sender, conn.user?.id)) return;

  const msgContent =
    m.message?.ephemeralMessage?.message ||
    m.message?.viewOnceMessage?.message ||
    m.message;

  const text =
    msgContent?.conversation ||
    msgContent?.extendedTextMessage?.text ||
    msgContent?.imageMessage?.caption ||
    msgContent?.videoMessage?.caption ||
    "";

  if (!text) return;

  const prefixes = config.bot.prefix;
  const usedPrefix = prefixes.find(p => text.startsWith(p)) || "";
  if (!usedPrefix) return;

  const withoutPrefix = text.slice(usedPrefix.length).trim();
  const [commandName, ...argsArr] = withoutPrefix.split(/\s+/);
  const command = (commandName || "").toLowerCase();
  const args = argsArr;

  for (const handler of plugins) {
    let match = false;
    if (handler.command instanceof RegExp) match = handler.command.test(command);
    else if (typeof handler.command === "string") match = handler.command.toLowerCase() === command;
    else if (Array.isArray(handler.command)) match = handler.command.map(c => c.toLowerCase()).includes(command);
    if (!match) continue;

    const isGroup = m.isGroup;
    const isPrivate = !m.isGroup;
    const isOwnerUser = isOwner(m.sender);

    let isAdmin = false;
    let isBotAdmin = false;

    // ✅ Detección de admins como en el index.js
    if ((handler.admin || handler.Botadmin) && m.isGroup) {
      try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata?.participants || [];
        const adminIds = new Set();

        for (const p of participants) {
          const jidUser = p.id || p.jid || p.lid;
          if (!jidUser) continue;
          if (p.admin === "admin" || p.admin === "superadmin") adminIds.add(normalizeJid(jidUser));
        }

        const senderJid = normalizeJid(m.sender);
        const botJid = normalizeJid(conn.user?.id);

        isAdmin = adminIds.has(senderJid);
        isBotAdmin = adminIds.has(botJid);

      } catch (e) {
        console.error(chalk.red("❌ Error obteniendo admins del grupo:"), e);
      }
    }

    if (handler.owner && !isOwnerUser) return m.reply(messages.ownerOnly);
    if (handler.admin && !isAdmin) return m.reply(messages.adminOnly);
    if (handler.Botadmin && !isBotAdmin) return m.reply(messages.botAdminOnly);
    if (handler.group && !isGroup) return m.reply(messages.groupOnly);
    if (handler.private && !isPrivate) return m.reply(messages.privateOnly);

    try {
      logCommand({ sender: m.sender, chatId, isGroup, command: usedPrefix + command });

      if (handler.register && db) {
        try {
          const result = await db.query("SELECT * FROM users WHERE id = $1", [normalizeJid(m.sender)]);
          if (result.rows.length === 0) return m.reply("❌ Necesitas registrarte primero con /reg nombre.edad");
        } catch {
          console.log("⚠️ Base de datos no disponible para verificar registro");
        }
      }

      await handler(m, { conn, args, text: withoutPrefix, usedPrefix, command, isOwner, isAdmin, isBotAdmin, isGroup, isPrivate });
    } catch (error) {
      console.error(chalk.red("❌ Error ejecutando comando:"), error);
      logError(`Error en comando ${command}: ${error.message}`);
      m.reply("❌ Error ejecutando el comando.");
    }

    break;
  }
}