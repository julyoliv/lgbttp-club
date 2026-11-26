import { randomBytes } from 'node:crypto';

export function generateInviteCode() {
  // 8 caracteres alfanuméricos, URL-safe
  return randomBytes(6).toString('base64url').slice(0, 8).toUpperCase();
}