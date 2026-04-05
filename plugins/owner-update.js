import { exec } from 'child_process'

const handler = async (m, { conn }) => {
  const msg = await m.reply('🔄 Actualizando desde el repositorio...')

  exec('git pull', async (err, stdout, stderr) => {
    if (err) {
      return await conn.sendMessage(
        m.key.remoteJid,
        { text: `❌ Error al actualizar:\n${err.message}`, edit: msg.key }
      )
    }

    if (stderr) {
      return await conn.sendMessage(
        m.key.remoteJid,
        { text: `⚠️ Aviso:\n${stderr}`, edit: msg.key }
      )
    }

    if (!stdout || stdout.includes('Already up to date')) {
      return await conn.sendMessage(
        m.key.remoteJid,
        { text: '✅ Ya estás en la última versión.', edit: msg.key }
      )
    }

    await conn.sendMessage(
      m.key.remoteJid,
      { text: `✅ Update aplicado correctamente:\n\n${stdout}`, edit: msg.key }
    )

    setTimeout(() => process.exit(0), 1500)
  })
}

handler.command = /^(update|actualizar)$/i
handler.owner = true

export default handler