/**
 * Plugin Scanner - Scans ~/.claude/plugins/cache/enhance/ for installed plugins
 * and detects deliberation keywords for memory think suggestions
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillInfo {
  name: string;
  description: string;
  qualifiedName: string;
}

export interface AgentInfo {
  name: string;
  description: string;
  model: string;
}

export interface CommandInfo {
  name: string;
  description: string;
}

export interface PluginInfo {
  name: string;
  version: string;
  description: string;
  skills: SkillInfo[];
  agents: AgentInfo[];
  commands: CommandInfo[];
}

export interface McpServerInfo {
  name: string;
  type: 'sse' | 'stdio' | 'http';
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deliberation Detection
// ─────────────────────────────────────────────────────────────────────────────

const DELIBERATION_PATTERNS = [
  /\bbrainstorm\b/i,
  /\bweigh\s+(\w+\s+)?options?\b/i,
  /\bpros\s+and\s+cons\b/i,
  /\btrade[- ]?offs?\b/i,
  /\b(help\s+me\s+)?decide\b/i,
  /\bmake\s+a\s+decision\b/i,
  /\bevaluate\b/i,
  /\bconsider\s+(\w+\s+)?options?\b/i,
  /\bdeliberate\b/i,
  /\bthink\s+through\b/i,
];

export function detectDeliberationKeywords(prompt: string): boolean {
  return DELIBERATION_PATTERNS.some((pattern) => pattern.test(prompt));
}

export function suggestMemoryThink(prompt: string): string | null {
  if (!detectDeliberationKeywords(prompt)) return null;
  return `Consider using memory think for deliberation:
- memory think create "Topic" - Start deliberation
- memory think add/counter/branch - Build reasoning
- memory think conclude --promote <type> - Finalise`;
}

// ─────────────────────────────────────────────────────────────────────────────
// YAML Frontmatter Parser
// ─────────────────────────────────────────────────────────────────────────────

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!content.startsWith('---')) return result;

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return result;

  for (const line of content.slice(3, endIndex).trim().split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Scanning
// ─────────────────────────────────────────────────────────────────────────────

function getLatestVersionDir(pluginPath: string): string | null {
  if (!existsSync(pluginPath)) return null;
  const versions = readdirSync(pluginPath).filter((v) => statSync(join(pluginPath, v)).isDirectory());
  if (versions.length === 0) return null;

  versions.sort((a, b) => {
    const partsA = a.split('.').map((n) => parseInt(n, 10) || 0);
    const partsB = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const diff = (partsB[i] || 0) - (partsA[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
  const latestVersion = versions[0];
  if (!latestVersion) return null;
  return join(pluginPath, latestVersion);
}

function scanPluginSkills(pluginPath: string, pluginName: string): SkillInfo[] {
  const skillsDir = join(pluginPath, 'skills');
  if (!existsSync(skillsDir)) return [];

  const skills: SkillInfo[] = [];
  for (const entry of readdirSync(skillsDir)) {
    const entryPath = join(skillsDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;

    const possiblePaths = [join(entryPath, `${entry}.md`), join(entryPath, 'SKILL.md')];
    const mdPath = possiblePaths.find((p) => existsSync(p)) ?? null;
    if (!mdPath) continue;

    try {
      const fm = parseFrontmatter(readFileSync(mdPath, 'utf-8'));
      skills.push({
        name: fm.name || entry,
        description: fm.description || '',
        qualifiedName: `${pluginName}:${fm.name || entry}`,
      });
    } catch { /* skip */ }
  }
  return skills;
}

function scanPluginAgents(pluginPath: string): AgentInfo[] {
  const agentsDir = join(pluginPath, 'agents');
  if (!existsSync(agentsDir)) return [];

  const agents: AgentInfo[] = [];
  for (const entry of readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
    try {
      const fm = parseFrontmatter(readFileSync(join(agentsDir, entry), 'utf-8'));
      agents.push({
        name: fm.name || basename(entry, '.md'),
        description: fm.description || '',
        model: fm.model || 'unknown',
      });
    } catch { /* skip */ }
  }
  return agents;
}

function scanPluginCommands(pluginPath: string): CommandInfo[] {
  const commandsDir = join(pluginPath, 'commands');
  if (!existsSync(commandsDir)) return [];

  const commands: CommandInfo[] = [];
  for (const entry of readdirSync(commandsDir).filter((f) => f.endsWith('.md'))) {
    try {
      const fm = parseFrontmatter(readFileSync(join(commandsDir, entry), 'utf-8'));
      commands.push({
        name: basename(entry, '.md'),
        description: fm.description || '',
      });
    } catch { /* skip */ }
  }
  return commands;
}

export async function scanEnhancePlugins(enhanceDir?: string): Promise<PluginInfo[]> {
  const dir = enhanceDir || join(homedir(), '.claude', 'plugins', 'cache', 'enhance');
  if (!existsSync(dir)) return [];

  const plugins: PluginInfo[] = [];
  for (const pluginName of readdirSync(dir)) {
    const pluginPath = join(dir, pluginName);
    if (!statSync(pluginPath).isDirectory()) continue;

    const versionDir = getLatestVersionDir(pluginPath);
    if (!versionDir) continue;

    const pluginJsonPath = join(versionDir, '.claude-plugin', 'plugin.json');
    if (!existsSync(pluginJsonPath)) continue;

    try {
      const pluginJson = JSON.parse(readFileSync(pluginJsonPath, 'utf-8'));
      const name = pluginJson.name || pluginName;
      plugins.push({
        name,
        version: pluginJson.version || 'unknown',
        description: pluginJson.description || '',
        skills: scanPluginSkills(versionDir, name),
        agents: scanPluginAgents(versionDir),
        commands: scanPluginCommands(versionDir),
      });
    } catch { /* skip */ }
  }
  return plugins;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP Server Scanning
// ─────────────────────────────────────────────────────────────────────────────

export async function scanMcpServers(mcpPaths?: string[]): Promise<McpServerInfo[]> {
  const paths = mcpPaths || [
    join(homedir(), '.claude', '.mcp.json'),
    join(process.cwd(), '.mcp.json'),
  ];

  const servers: McpServerInfo[] = [];
  const seenNames = new Set<string>();

  for (const mcpPath of paths) {
    if (!existsSync(mcpPath)) continue;
    try {
      const content = JSON.parse(readFileSync(mcpPath, 'utf-8'));
      for (const [name, config] of Object.entries(content.mcpServers || {})) {
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        const cfg = config as Record<string, unknown>;
        const desc = cfg.description as string | undefined;
        servers.push({
          name,
          type: (cfg.type as 'sse' | 'stdio' | 'http') || (cfg.command ? 'stdio' : 'sse'),
          ...(desc ? { description: desc } : {}),
        });
      }
    } catch { /* skip */ }
  }
  return servers;
}
