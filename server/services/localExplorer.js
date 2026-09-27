import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

/**
 * Local Laptop File & Folder Explorer Service
 * Searches internal laptop directories (Desktop, Documents, Downloads, user home, etc.)
 */
export const localExplorer = {
  /**
   * Lists folders in a known user location (Desktop, Documents, Downloads, etc.).
   * This is intentionally separate from name search so requests such as
   * "list all folders in Desktop" do not try to match the sentence as a name.
   */
  async listFoldersInLocation(location = 'home', options = {}) {
    const { maxResults = 100, maxDepth = 1 } = options;
    const home = os.homedir();
    const normalizedLocation = String(location).toLowerCase().trim();
    const locations = {
      desktop: [path.join(home, 'OneDrive', 'Desktop'), path.join(home, 'Desktop')],
      documents: [path.join(home, 'OneDrive', 'Documents'), path.join(home, 'Documents')],
      downloads: [path.join(home, 'Downloads')],
      pictures: [path.join(home, 'Pictures')],
      videos: [path.join(home, 'Videos')],
      music: [path.join(home, 'Music')],
      home: [home]
    };
    const roots = locations[normalizedLocation] || locations.home;
    const existingRoots = [...new Set(roots.filter(root => {
      try {
        return fs.existsSync(root) && fs.statSync(root).isDirectory();
      } catch {
        return false;
      }
    }))];
    const results = [];
    const queue = existingRoots.map(root => ({ dir: root, depth: 0 }));
    const visited = new Set();
    const ignoreDirs = new Set(['node_modules', '.git', 'appdata', '$recycle.bin', 'system volume information', '.vscode', '.cache']);

    while (queue.length > 0 && results.length < maxResults) {
      const { dir, depth } = queue.shift();
      const key = dir.toLowerCase();
      if (visited.has(key)) continue;
      visited.add(key);

      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('$')) continue;
        if (ignoreDirs.has(entry.name.toLowerCase())) continue;

        const folderPath = path.join(dir, entry.name);
        results.push({
          name: entry.name,
          type: 'folder',
          path: folderPath,
          extension: ''
        });
        if (depth < maxDepth) queue.push({ dir: folderPath, depth: depth + 1 });
      }
    }

    return results;
  },

  /**
   * Search files and folders on the local laptop
   * @param {string} query - Search term / folder / file name
   * @param {object} options - { type: 'all' | 'folder' | 'file', maxResults: number, maxDepth: number }
   */
  async searchLocalLaptop(query, options = {}) {
    const {
      type = 'all',
      maxResults = 12,
      maxDepth = 4
    } = options;

    if (!query || !query.trim()) {
      return [];
    }

    const cwd = process.cwd();
    const parentOfCwd = path.dirname(cwd);
    const home = os.homedir();
    const priorityRoots = [
      cwd,
      parentOfCwd,
      path.join(home, 'OneDrive', 'Desktop'),
      path.join(home, 'Desktop'),
      path.join(home, 'OneDrive', 'Documents'),
      path.join(home, 'Documents'),
      path.join(home, 'Downloads'),
      path.join(home, 'Pictures'),
      path.join(home, 'Videos'),
      path.join(home, 'Music'),
      path.join(home, 'source'),
      path.join(home, 'projects'),
      home
    ].filter(p => {
      try {
        return fs.existsSync(p);
      } catch (e) {
        return false;
      }
    });

    const uniqueRoots = [...new Set(priorityRoots)];
    const lowerQuery = query.toLowerCase().trim();
    const cleanLowerQuery = lowerQuery.replace(/[\s_\-\.]+/g, '');
    const queryTokens = lowerQuery.split(/[\s_\-]+/).filter(t => t.length > 0);

    const results = [];
    const visited = new Set();

    const ignoreDirs = new Set([
      'node_modules', '.git', 'appdata', '$recycle.bin',
      'system volume information', '.vscode', '.gemini', '.cache',
      'temp', 'cache', '.npm', '.local', 'application data', 'local settings',
      'windows', 'program files', 'program files (x86)', 'programdata'
    ]);

    // Breadth-first search queue for high speed & top-level priority
    const queue = uniqueRoots.map(root => ({ dir: root, depth: 0 }));

    while (queue.length > 0 && results.length < maxResults) {
      const { dir, depth } = queue.shift();
      const dirNorm = dir.toLowerCase();
      if (visited.has(dirNorm)) continue;
      visited.add(dirNorm);

      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (e) {
        continue;
      }

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const name = entry.name;
        if (name.startsWith('.') || name.startsWith('$')) continue;

        const nameLower = name.toLowerCase();
        const cleanName = nameLower.replace(/[\s_\-\.]+/g, '');
        const isDir = entry.isDirectory();
        const isFile = entry.isFile();

        if (isDir && ignoreDirs.has(nameLower)) continue;

        const fullPath = path.join(dir, name);

        // Multi-strategy flexible matching:
        // 1. Direct substring match
        const directMatch = cleanLowerQuery.length >= 2 && nameLower.includes(lowerQuery);
        // 2. Normalized match (ignores spaces/dashes/underscores, e.g. "my storage" matches "MyStorage" or "my_storage")
        const normalizedMatch = cleanLowerQuery.length >= 2 && (cleanName.includes(cleanLowerQuery) || (cleanName.length >= 3 && cleanLowerQuery === cleanName));
        // 3. All tokens match (for multi-word queries where each word is present in name)
        const validTokens = queryTokens.filter(t => t.length >= 2);
        const allTokensMatch = validTokens.length > 0 && validTokens.every(token => nameLower.includes(token) || cleanName.includes(token));

        const isMatch = directMatch || normalizedMatch || allTokensMatch;

        if (isMatch) {
          if (type === 'all' || (type === 'folder' && isDir) || (type === 'file' && isFile)) {
            let stat = null;
            try {
              stat = fs.statSync(fullPath);
            } catch (e) {}

            results.push({
              name,
              type: isDir ? 'folder' : 'file',
              path: fullPath,
              size: stat ? stat.size : 0,
              modified: stat ? stat.mtime : null,
              extension: isFile ? path.extname(name).toLowerCase() : ''
            });
          }
        }

        // Add subdirectories to queue if depth permits
        if (isDir && depth < maxDepth) {
          queue.push({ dir: fullPath, depth: depth + 1 });
        }
      }
    }

    return results;
  },

  /**
   * Open the file or folder in Windows File Explorer
   */
  async openInExplorer(targetPath) {
    if (!targetPath) throw new Error('Path is required');
    const resolved = path.resolve(targetPath);
    if (!fs.existsSync(resolved)) {
      throw new Error('Path does not exist on your laptop');
    }

    return new Promise((resolve, reject) => {
      let cmd = `explorer.exe "${resolved}"`;
      try {
        const stat = fs.statSync(resolved);
        if (stat.isFile()) {
          cmd = `explorer.exe /select,"${resolved}"`;
        }
      } catch (e) {}

      exec(cmd, (err) => {
        if (err) return reject(err);
        resolve(true);
      });
    });
  }
};
