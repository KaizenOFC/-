// plugins/kick.js
const handler = async (m, { conn, args }) => {
  // Obtenemos el JID del objetivo (mencionado o pasado como número)
  const targetJid = m.quoted?.key?.participant || args[0];
  if (!targetJid) return m.reply("❌ Debes mencionar a alguien o dar su número.");

  // Normalizamos el JID
  const jid = targetJid.includes("@") ? targetJid : `${targetJid}@s.whatsapp.net`;

  try {
    // Expulsamos al usuario del grupo
    await conn.groupParticipantsUpdate(m.key.remoteJid, [jid], "remove");

    // Mensaje de confirmación con mención
    m.reply(`✅ Usuario expulsado correctamente: @${jid.split("@")[0]}`, { mentions: [jid] });

  } catch (e) {
    console.error(e);
    m.reply("❌ No pude expulsar al usuario. ¿Tengo permisos de admin?");
  }
};

// Flags para el handler principal
handler.command = /^(kick|expulsar)$/i;
handler.admin = true;     // Solo admins pueden ejecutar
handler.Botadmin = true;  // El bot debe ser admin
handler.group = true;     // Solo en grupos

export default handler;