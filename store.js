import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname);
const DATA = path.join(ROOT, 'data');
const FILES = path.join(DATA, 'files');
const FILES_JSON = path.join(DATA, 'files.json');
const CHATS_JSON = path.join(DATA, 'conversations.json');
const MODELS_JSON = path.join(DATA, 'models.json');

const defaults = {
  conversations: [],
  files: [],
  models: [
    {
      id: 'qwen25-14b',
      name: 'Qwen2.5 14B Instruct (default)',
      parameters: 14000000000,
      quantization: 'Q4_K_M',
      active: true,
      source: 'Hugging Face / llama.cpp',
      uri: 'hf:Qwen/Qwen2.5-14B-Instruct-GGUF:Q4_K_M'
    },
    {
      id: 'qwen25-7b',
      name: 'Qwen2.5 7B Instruct (light)',
      parameters: 7000000000,
      quantization: 'Q4_K_M',
      active: false,
      source: 'Hugging Face / llama.cpp',
      uri: 'hf:Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M'
    },
    {
      id: 'qwen25-32b',
      name: 'Qwen2.5 32B Instruct (heavy)',
      parameters: 32000000000,
      quantization: 'Q4_K_M',
      active: false,
      source: 'Hugging Face / llama.cpp',
      uri: 'hf:Qwen/Qwen2.5-32B-Instruct-GGUF:Q4_K_M'
    },
    {
      id: 'qwen3-27b',
      name: 'Qwen3.x / 3.8 27B class (2026 strong)',
      parameters: 27000000000,
      quantization: 'Q4_K_M',
      active: false,
      source: 'Hugging Face / Unsloth or official GGUF',
      uri: 'hf:unsloth/Qwen3.8-27B-GGUF:Q4_K_M'
    }
  ]
};

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return fallback; }
}
async function writeJson(file, value) {
  const tmp = file + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmp, file);
}
export async function initStore() {
  await fs.mkdir(FILES, { recursive: true });
  if (!(await exists(CHATS_JSON))) await writeJson(CHATS_JSON, defaults.conversations);
  if (!(await exists(FILES_JSON))) await writeJson(FILES_JSON, defaults.files);
  if (!(await exists(MODELS_JSON))) await writeJson(MODELS_JSON, defaults.models);
}
async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}
export async function listConversations() {
  const c = await readJson(CHATS_JSON, []);
  return c.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(x => ({ ...x, messages: undefined }));
}
export async function getConversation(id) {
  const c = await readJson(CHATS_JSON, []);
  return c.find(x => x.id === id) || null;
}
export async function createConversation(title = 'Nueva charla') {
  const c = await readJson(CHATS_JSON, []);
  const now = new Date().toISOString();
  const item = { id: crypto.randomUUID(), title: title.slice(0, 120) || 'Nueva charla', createdAt: now, updatedAt: now, messages: [] };
  c.push(item);
  await writeJson(CHATS_JSON, c);
  return item;
}
export async function saveConversation(item) {
  const c = await readJson(CHATS_JSON, []);
  const i = c.findIndex(x => x.id === item.id);
  item.updatedAt = new Date().toISOString();
  if (i < 0) c.push(item); else c[i] = item;
  await writeJson(CHATS_JSON, c);
  return item;
}
export async function deleteConversation(id) {
  const c = await readJson(CHATS_JSON, []);
  const next = c.filter(x => x.id !== id);
  await writeJson(CHATS_JSON, next);
  return next.length !== c.length;
}
export async function listFiles() { return readJson(FILES_JSON, []); }
export async function saveFile({ name, mime, data }) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(data || '');
  if (!match) throw new Error('Formato de archivo inválido');
  const buffer = Buffer.from(match[2], 'base64');
  const safe = path.basename(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const id = crypto.randomUUID();
  const ext = path.extname(safe);
  const stored = id + (ext || '');
  await fs.writeFile(path.join(FILES, stored), buffer);
  const item = { id, name: safe, mime: mime || match[1], size: buffer.length, stored, createdAt: new Date().toISOString() };
  const files = await readJson(FILES_JSON, []);
  files.unshift(item);
  await writeJson(FILES_JSON, files);
  return item;
}
export async function getFile(id) {
  const files = await readJson(FILES_JSON, []);
  return files.find(x => x.id === id) || null;
}
export async function removeFile(id) {
  const files = await readJson(FILES_JSON, []);
  const item = files.find(x => x.id === id);
  if (!item) return false;
  try { await fs.unlink(path.join(FILES, item.stored)); } catch {}
  await writeJson(FILES_JSON, files.filter(x => x.id !== id));
  return true;
}
export async function listModels() { return readJson(MODELS_JSON, defaults.models); }
export async function saveModelProfile(profile) {
  const models = await readJson(MODELS_JSON, defaults.models);
  const idx = models.findIndex(x => x.id === profile.id);
  if (idx < 0) models.push(profile); else models[idx] = { ...models[idx], ...profile };
  await writeJson(MODELS_JSON, models);
  return models;
}
export { DATA, FILES };
