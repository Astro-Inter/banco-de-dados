import { createHash } from 'node:crypto';

/**
 * Checksum SHA-256 do conteúdo de um arquivo SQL.
 *
 * As quebras de linha são normalizadas e o BOM é removido antes do cálculo:
 * o mesmo arquivo produz o mesmo checksum no Windows e no Linux, evitando que
 * um script apareça como "Modificado" apenas por causa de CRLF.
 */
export function checksumOf(content) {
  const normalized = String(content ?? '').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Compara o checksum atual com o registrado no histórico.
 * @returns {'never-executed'|'already-executed'|'modified'}
 */
export function checksumStatus(currentChecksum, historyEntry) {
  if (!historyEntry) return 'never-executed';
  return historyEntry.checksum === currentChecksum ? 'already-executed' : 'modified';
}
