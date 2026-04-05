const handler = async (m, { conn, isAdmin, isBotAdmin, isGroup, isPrivate, isOwner }) => {

  const rawSender = m.key?.participant || m.key?.remoteJid
  const rawChat = m.key?.remoteJid
  const botJid = conn.user?.id

  const text = `
👤 *Así te detecta el bot*

📨 JID original:
${rawSender}

🧾 JID normalizado:
${m.sender}

💬 Chat ID:
${rawChat}

👥 ¿Es grupo?: ${isGroup ? "Sí" : "No"}
🔒 ¿Es privado?: ${isPrivate ? "Sí" : "No"}

⭐ ¿Eres owner?: ${isOwner(m.sender) ? "Sí" : "No"}
🛡️ ¿Eres admin?: ${isAdmin ? "Sí" : "No"}
🤖 ¿Bot es admin?: ${isBotAdmin ? "Sí" : "No"}

🤖 JID del bot:
${botJid}
`.trim()

  await conn.sendMessage(m.key.remoteJid, { text }, { quoted: m })
}

handler.command = ["me", "detect"]
export default handler