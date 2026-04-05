
const handler = async (m, { conn }) => {
  const start = Date.now();
  const msg = await m.reply("🏃‍♂️ Verificando velocidad...");
  const end = Date.now();
  const latencia = end - start;
  
  await conn.sendMessage(m.key.remoteJid, {
    text: `🏓 *PONG!*\n ${latencia}ms`,
    edit: msg.key
  });
}

handler.command = /^(ping|latencia)$/i;
export default handler;
