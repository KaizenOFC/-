
import chalk from "chalk";

export const LogLevel = {
  ERROR: 0,
  COMMAND: 1,
  MESSAGE: 2,
};

export const CURRENT_LOG_LEVEL = LogLevel.COMMAND;  

export function logCommand(details) {
  if (CURRENT_LOG_LEVEL < LogLevel.COMMAND) return;
  const ts = details.timestamp || new Date().toISOString();
  console.log(
    chalk.blue(`[COMMAND]\nFrom: ${details.sender}\nChat: ${details.isGroup ? "Grupo" : "Privado"} (${details.chatId})\nComando: ${details.command}`)
  );
}

export function logMessage(details) {
  if (CURRENT_LOG_LEVEL < LogLevel.MESSAGE) return;
  const ts = details.timestamp || new Date().toISOString();
  console.log(
    chalk.gray(`[MESSAGE]\n${ts}\nFrom: ${details.sender}\nChat: ${details.isGroup ? "Grupo" : "Privado"} (${details.chatId})\nMensaje: ${details.text}`)
  );
}

export function logError(error) {
  console.error(chalk.red(`[ERROR] ${new Date().toISOString()} | ${error}`));
}
