
import * as baileys from "@whiskeysockets/baileys";
import chalk from "chalk";
import readlineSync from "readline-sync";
import fs from "fs";
import pino from "pino";
import { db } from "./lib/postgres.js";
import { config } from "./config.js";

const sessionFolder = config.bot.sessionFolder;
const credsPath = `${sessionFolder}/creds.json`;

if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);

let usarCodigo = false;
let numero = "";

async function main() {
  console.clear();
  console.log(chalk.cyanBright.bold("══════════════════════════════"));
  console.log(chalk.magentaBright.bold(`       ${config.bot.name} v${config.bot.version}`));
  console.log(chalk.cyanBright.bold("══════════════════════════════"));
  
  

  if (!fs.existsSync(credsPath)) {
    console.log(chalk.green("1.") + " Conectar con código QR");
    console.log(chalk.green("2.") + " Conectar con código de 8 dígitos");

    const opcion = readlineSync.question(chalk.yellow("Elige una opción (1 o 2): "));
    usarCodigo = opcion === "2";

    if (usarCodigo) {
      numero = readlineSync.question(chalk.yellow("Ingresa tu número (ej: 123456789): "));
    }
  }

  startBot();
}

async function startBot() {
  const { state, saveCreds } = await baileys.useMultiFileAuthState("session");
  const { version } = await baileys.fetchLatestBaileysVersion();

  const sock = baileys.makeWASocket({
    version,
    printQRInTerminal: !usarCodigo && !fs.existsSync(credsPath),
    logger: pino({ level: config.bot.logLevel }),
    auth: {
      creds: state.creds,
      keys: baileys.makeCacheableSignalKeyStore(state.keys, pino({ level: config.bot.logLevel }))
    },
    browser: config.bot.browser
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    const code = lastDisconnect?.error?.output?.statusCode;
    if (connection === "open") {
      console.log(chalk.greenBright("🚀 Bot conectado y funcionando!"));     
    }
    if (connection === "close") {
      const reconectar = code !== baileys.DisconnectReason.loggedOut;
      if (reconectar) {
        console.log(chalk.blue("🔄 Reconectando..."));
        setTimeout(() => startBot(), 2000); 
      } else {
        console.log(chalk.redBright("❌ Sesión finalizada. Borra la carpeta ${sessionFolder} y vuelve a vincular."));
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    try {
      if (type !== "notify") return
      
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;  
        const { handleMessage } = await import("./handler.js");
        await handleMessage(sock, msg);  
      }
    } catch (err) {
      console.error(chalk.red("❌ Error procesando mensaje:"), err);
    }
  });


  if (usarCodigo && !state.creds.registered && !fs.existsSync(credsPath)) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(numero);
        console.log(chalk.yellow("Código de emparejamiento (8 dígitos):"), chalk.greenBright.bold(code));
        console.log(chalk.gray("WhatsApp > Dispositivos vinculados > Vincular > Usar código"));
      } catch (e) {
        console.log(chalk.red("Error al generar el código:"), e);
      }
    }, 2500);
  }
}

main();
