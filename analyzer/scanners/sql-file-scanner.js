import fs from 'node:fs/promises';
import path from 'node:path';
import { toPosix } from '../config.js';

async function walk(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const nested = await Promise.all(entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return walk(absolute);
      return entry.isFile() && entry.name.toLowerCase().endsWith('.sql') ? [absolute] : [];
    }));
    return nested.flat();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function scanSqlFiles(root, configuredPaths) {
  const categories = Object.entries(configuredPaths);
  const groups = await Promise.all(categories.map(async ([category, relativeDirectory]) => {
    const files = await walk(path.resolve(root, relativeDirectory));
    return Promise.all(files.map(async (absolutePath) => ({
      category,
      path: toPosix(path.relative(root, absolutePath)),
      content: await fs.readFile(absolutePath, 'utf8')
    })));
  }));
  return groups.flat().sort((a, b) => a.path.localeCompare(b.path));
}
