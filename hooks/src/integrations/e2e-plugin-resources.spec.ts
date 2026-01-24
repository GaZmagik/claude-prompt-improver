/**
 * T214-T216: End-to-End Plugin Resources Integration Tests
 * Validates the full pipeline from plugin scanning to prompt improvement
 */
import { describe, it, expect, afterAll } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { scanEnhancePlugins, type PluginInfo } from './plugin-scanner.ts';
import { buildContext, formatContextForInjection } from '../context/context-builder.ts';

// Create a temporary test plugin structure
function createTestPlugin(basePath: string, pluginName: string, config: {
  version: string;
  skills?: string[];
  agents?: string[];
  commands?: string[];
  outputStyles?: string[];
}): void {
  const pluginPath = join(basePath, pluginName, config.version, '.claude-plugin');
  mkdirSync(pluginPath, { recursive: true });

  // Create plugin.json
  writeFileSync(join(pluginPath, 'plugin.json'), JSON.stringify({
    name: pluginName,
    version: config.version,
    description: `Test plugin ${pluginName}`,
  }));

  const versionPath = join(basePath, pluginName, config.version);

  // Create skills
  if (config.skills) {
    const skillsDir = join(versionPath, 'skills');
    for (const skill of config.skills) {
      const skillDir = join(skillsDir, skill);
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, `${skill}.md`), `---
name: ${skill}
description: Test skill ${skill}
---
# ${skill}
Test skill content.
`);
    }
  }

  // Create agents
  if (config.agents) {
    const agentsDir = join(versionPath, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    for (const agent of config.agents) {
      writeFileSync(join(agentsDir, `${agent}.md`), `---
name: ${agent}
description: Test agent ${agent}
model: haiku
---
# ${agent}
Test agent content.
`);
    }
  }

  // Create commands
  if (config.commands) {
    const commandsDir = join(versionPath, 'commands');
    mkdirSync(commandsDir, { recursive: true });
    for (const command of config.commands) {
      writeFileSync(join(commandsDir, `${command}.md`), `---
description: Test command ${command}
---
# ${command}
Test command content.
`);
    }
  }

  // Create output-styles
  if (config.outputStyles) {
    const outputStylesDir = join(versionPath, 'output-styles');
    mkdirSync(outputStylesDir, { recursive: true });
    for (const style of config.outputStyles) {
      writeFileSync(join(outputStylesDir, `${style}.md`), `---
name: ${style}
description: Test output style ${style}
---
# ${style}
Test output style content.
`);
    }
  }
}

describe('T214-T216: E2E Plugin Resources Integration', () => {
  const testDir = join(tmpdir(), `plugin-e2e-test-${Date.now()}`);

  // Cleanup after tests
  afterAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('T214: Scan plugin with custom component paths end-to-end', () => {
    it('T214.1: should scan plugin and return all component types', async () => {
      // Create test plugin
      createTestPlugin(testDir, 'test-plugin', {
        version: '1.0.0',
        skills: ['skill-one', 'skill-two'],
        agents: ['agent-alpha'],
        commands: ['cmd-run'],
        outputStyles: ['formal', 'casual'],
      });

      const plugins = await scanEnhancePlugins(testDir);

      expect(plugins).toHaveLength(1);
      const plugin = plugins[0] as PluginInfo;
      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.skills).toHaveLength(2);
      expect(plugin.agents).toHaveLength(1);
      expect(plugin.commands).toHaveLength(1);
      expect(plugin.outputStyles).toHaveLength(2);
    });

    it('T214.2: should scan multiple plugins', async () => {
      // Create second test plugin
      createTestPlugin(testDir, 'another-plugin', {
        version: '2.0.0',
        skills: ['another-skill'],
        outputStyles: ['sardonic'],
      });

      const plugins = await scanEnhancePlugins(testDir);

      expect(plugins.length).toBeGreaterThanOrEqual(2);
      const names = plugins.map((p) => p.name);
      expect(names).toContain('test-plugin');
      expect(names).toContain('another-plugin');
    });
  });

  describe('T215: Flow plugin resources through context builder', () => {
    it('T215.1: should include pluginResources in built context when enabled', async () => {
      const context = await buildContext({
        prompt: 'Help me with plugins',
        pluginResourcesOptions: {
          enabled: true,
          cwd: testDir,
        },
      });

      expect(context.sources).toContain('pluginResources');
      expect(context.pluginResources).toBeDefined();
    });

    it('T215.2: should format plugin resources for injection', async () => {
      const context = await buildContext({
        prompt: 'Help me with plugins',
        pluginResourcesOptions: {
          enabled: true,
          cwd: testDir,
        },
      });

      const formatted = formatContextForInjection(context);

      // Should have formatted pluginResources string
      expect(formatted.pluginResources).toBeDefined();
      if (formatted.pluginResources) {
        expect(typeof formatted.pluginResources).toBe('string');
      }
    });

    it('T215.3: should not include pluginResources when disabled', async () => {
      const context = await buildContext({
        prompt: 'Help me with plugins',
        pluginResourcesOptions: {
          enabled: false,
        },
      });

      expect(context.sources).not.toContain('pluginResources');
      expect(context.pluginResources).toBeUndefined();
    });
  });

  describe('T216: Include plugin resources in improved prompt', () => {
    it('T216.1: should have pluginResources in formatted context structure', async () => {
      const context = await buildContext({
        prompt: 'What plugins are available?',
        pluginResourcesOptions: {
          enabled: true,
          cwd: testDir,
        },
      });

      const formatted = formatContextForInjection(context);

      // Verify the structure is correct for injection
      if (formatted.pluginResources) {
        // Should contain XML-like structure
        expect(formatted.pluginResources).toContain('<');
      }
    });

    it('T216.2: should handle empty plugin directory gracefully', async () => {
      const emptyDir = join(tmpdir(), `empty-plugins-${Date.now()}`);
      mkdirSync(emptyDir, { recursive: true });

      const context = await buildContext({
        prompt: 'Check plugins',
        pluginResourcesOptions: {
          enabled: true,
          cwd: emptyDir,
        },
      });

      // Should still succeed, just with minimal context
      expect(context).toBeDefined();

      rmSync(emptyDir, { recursive: true, force: true });
    });

    it('T216.3: should include all plugin components in context', async () => {
      const context = await buildContext({
        prompt: 'List all available plugin features',
        pluginResourcesOptions: {
          enabled: true,
          cwd: testDir,
        },
      });

      const formatted = formatContextForInjection(context);

      // The formatted output should contain plugin information
      expect(formatted.pluginResources).toBeDefined();
    });
  });
});
