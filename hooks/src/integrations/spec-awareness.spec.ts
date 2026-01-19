/**
 * T100-T107: Specification awareness integration tests
 * T100: Test spec awareness checks for .specify/ directory
 * T101: Test spec awareness parses spec.md frontmatter
 * T102: Test spec awareness extracts user stories from spec.md
 * T103: Test spec awareness parses plan.md phases
 * T104: Test spec awareness parses tasks.md frontmatter for task status
 * T105: Test spec awareness matches user stories to prompt keywords
 * T106: Test spec awareness gracefully skips if .specify/ missing
 * T107: Test spec awareness gracefully skips if configuration.integrations.spec=false
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  checkSpecifyDirectory,
  clearSpecFileCache,
  extractUserStories,
  formatSpecContext,
  gatherSpecContext,
  matchUserStoriesToPrompt,
  parseFrontmatter,
  parsePlanPhases,
  parseTasks,
  type SpecContext,
  type UserStory,
} from './spec-awareness.ts';

describe('Specification Awareness Integration', () => {
  beforeEach(() => {
    clearSpecFileCache();
  });
  describe('T100: checkSpecifyDirectory - checks for .specify/ directory', () => {
    it('should return true when .specify/ directory exists', () => {
      const result = checkSpecifyDirectory({
        _mockFileSystem: {
          '.specify/': 'directory',
        },
      });

      expect(result).toBe(true);
    });

    it('should return false when .specify/ directory does not exist', () => {
      const result = checkSpecifyDirectory({
        _mockFileSystem: {},
      });

      expect(result).toBe(false);
    });

    it('should check custom specifyPath when provided', () => {
      const result = checkSpecifyDirectory({
        specifyPath: 'custom/.specify',
        _mockFileSystem: {
          'custom/.specify/': 'directory',
        },
      });

      expect(result).toBe(true);
    });
  });

  describe('T101: parseFrontmatter - parses spec.md frontmatter', () => {
    it('should parse YAML frontmatter from markdown content', () => {
      const content = `---
feature: user-authentication
version: 1.0.0
status: in-progress
---

# User Authentication

Feature description here.`;

      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.feature).toBe('user-authentication');
      expect(frontmatter.version).toBe('1.0.0');
      expect(frontmatter.status).toBe('in-progress');
    });

    it('should return empty object for content without frontmatter', () => {
      const content = `# No Frontmatter

Just regular markdown content.`;

      const frontmatter = parseFrontmatter(content);

      expect(Object.keys(frontmatter).length).toBe(0);
    });

    it('should handle frontmatter with arrays and nested values', () => {
      const content = `---
feature: auth
tags:
  - security
  - login
author:
  name: Test
---

Content here.`;

      const frontmatter = parseFrontmatter(content);

      expect(frontmatter.feature).toBe('auth');
      expect(Array.isArray(frontmatter.tags)).toBe(true);
    });
  });

  describe('T102: extractUserStories - extracts user stories from spec.md', () => {
    it('should extract user stories with IDs and titles', () => {
      const content = `## User Stories

### US1: User Login
As a user, I want to log in so that I can access my account.

### US2: User Registration
As a user, I want to register so that I can create an account.`;

      const stories = extractUserStories(content);

      expect(stories.length).toBe(2);
      expect(stories[0]!.id).toBe('US1');
      expect(stories[0]!.title).toBe('User Login');
      expect(stories[1]!.id).toBe('US2');
      expect(stories[1]!.title).toBe('User Registration');
    });

    it('should handle user stories with descriptions', () => {
      const content = `## User Stories

### US1: User Login
As a user, I want to log in so that I can access my account.

This is a detailed description of the login process.`;

      const stories = extractUserStories(content);

      expect(stories.length).toBe(1);
      expect(stories[0]!.description).toContain('detailed description');
    });

    it('should return empty array when no user stories found', () => {
      const content = `# Feature Spec

No user stories defined yet.`;

      const stories = extractUserStories(content);

      expect(stories.length).toBe(0);
    });
  });

  describe('T103: parsePlanPhases - parses plan.md phases', () => {
    it('should parse phases with names and status', () => {
      const content = `## Phases

### Phase 1: Foundation
Status: completed

### Phase 2: Implementation
Status: in_progress

### Phase 3: Testing
Status: pending`;

      const phases = parsePlanPhases(content);

      expect(phases.length).toBe(3);
      expect(phases[0]!.id).toBe('1');
      expect(phases[0]!.name).toBe('Foundation');
      expect(phases[0]!.status).toBe('completed');
      expect(phases[1]!.status).toBe('in_progress');
      expect(phases[2]!.status).toBe('pending');
    });

    it('should handle phases without explicit status', () => {
      const content = `## Phase 1: Setup

Description of setup phase.

## Phase 2: Build

Description of build phase.`;

      const phases = parsePlanPhases(content);

      expect(phases.length).toBe(2);
      expect(phases[0]!.name).toBe('Setup');
    });

    it('should return empty array when no phases found', () => {
      const content = `# Plan

No phases defined.`;

      const phases = parsePlanPhases(content);

      expect(phases.length).toBe(0);
    });
  });

  describe('T104: parseTasks - parses tasks.md for task status', () => {
    it('should parse completed tasks marked with [X]', () => {
      const content = `## Tasks

- [X] T001 Implement login form
- [X] T002 Add validation
- [ ] T003 Write tests`;

      const tasks = parseTasks(content);

      const completed = tasks.filter((t) => t.status === 'completed');
      expect(completed.length).toBe(2);
    });

    it('should parse pending tasks marked with [ ]', () => {
      const content = `## Tasks

- [ ] T001 Implement feature
- [X] T002 Setup project`;

      const tasks = parseTasks(content);

      const pending = tasks.filter((t) => t.status === 'pending');
      expect(pending.length).toBe(1);
      expect(pending[0]!.id).toBe('T001');
    });

    it('should extract task IDs and titles', () => {
      const content = `- [X] T001 [P] [US1] Implement login form in src/auth.ts
- [ ] T002 [US2] Add user registration`;

      const tasks = parseTasks(content);

      expect(tasks[0]!.id).toBe('T001');
      expect(tasks[0]!.title).toContain('Implement login form');
      expect(tasks[1]!.id).toBe('T002');
    });

    it('should extract user story references', () => {
      const content = `- [X] T001 [US1] Implement login
- [ ] T002 [US2] Add registration`;

      const tasks = parseTasks(content);

      expect(tasks[0]!.userStory).toBe('US1');
      expect(tasks[1]!.userStory).toBe('US2');
    });

    it('should return empty array when no tasks found', () => {
      const content = `# Tasks

No tasks yet.`;

      const tasks = parseTasks(content);

      expect(tasks.length).toBe(0);
    });
  });

  describe('T105: matchUserStoriesToPrompt - matches stories to keywords', () => {
    it('should return stories matching prompt keywords', () => {
      const stories: UserStory[] = [
        { id: 'US1', title: 'User Login', description: 'Authentication feature' },
        { id: 'US2', title: 'Shopping Cart', description: 'E-commerce feature' },
        { id: 'US3', title: 'User Profile', description: 'Account management' },
      ];

      const matched = matchUserStoriesToPrompt(stories, 'fix the login authentication');

      expect(matched.length).toBeGreaterThan(0);
      expect(matched.some((s) => s.id === 'US1')).toBe(true);
    });

    it('should return empty array when no stories match', () => {
      const stories: UserStory[] = [
        { id: 'US1', title: 'User Login' },
        { id: 'US2', title: 'Shopping Cart' },
      ];

      const matched = matchUserStoriesToPrompt(stories, 'database migration');

      expect(matched.length).toBe(0);
    });

    it('should match on both title and description', () => {
      const stories: UserStory[] = [
        { id: 'US1', title: 'Security', description: 'OAuth authentication flow' },
      ];

      const matched = matchUserStoriesToPrompt(stories, 'implement OAuth');

      expect(matched.length).toBe(1);
    });

    it('should be case insensitive', () => {
      const stories: UserStory[] = [{ id: 'US1', title: 'USER LOGIN' }];

      const matched = matchUserStoriesToPrompt(stories, 'user login');

      expect(matched.length).toBe(1);
    });
  });

  describe('T106: gatherSpecContext - skips if .specify/ missing', () => {
    it('should skip when .specify/ directory does not exist', async () => {
      const result = await gatherSpecContext({
        _mockFileSystem: {},
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('no_specify_dir');
    });

    it('should skip when spec.md file does not exist', async () => {
      const result = await gatherSpecContext({
        _mockFileSystem: {
          '.specify/': 'directory',
          // No spec.md file
        },
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('no_spec_file');
    });

    it('should return gracefully without error', async () => {
      const result = await gatherSpecContext({
        _mockFileSystem: {},
      });

      expect(result.error).toBeUndefined();
      expect(result.skipped).toBe(true);
    });
  });

  describe('T107: gatherSpecContext - skips if disabled', () => {
    it('should skip when enabled=false', async () => {
      const result = await gatherSpecContext({
        enabled: false,
      });

      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(result.skipReason).toBe('disabled');
    });

    it('should not read any files when disabled', async () => {
      const result = await gatherSpecContext({
        enabled: false,
        _mockFileSystem: {
          '.specify/': 'directory',
          '.specify/spec.md': '# Spec',
        },
      });

      expect(result.skipped).toBe(true);
      expect(result.context).toBeUndefined();
    });
  });

  describe('gatherSpecContext - full integration', () => {
    it('should gather complete spec context', async () => {
      const specContent = `---
feature: user-auth
---

## User Stories

### US1: User Login
Login feature description.

### US2: User Registration
Registration feature description.`;

      const planContent = `## Phase 1: Foundation
Status: completed

## Phase 2: Implementation
Status: in_progress`;

      const tasksContent = `- [X] T001 [US1] Implement login
- [X] T002 [US1] Add validation
- [ ] T003 [US2] Implement registration`;

      const result = await gatherSpecContext({
        _mockFileSystem: {
          '.specify/': 'directory',
          '.specify/specs/feature/user-auth/spec.md': specContent,
          '.specify/specs/feature/user-auth/plan.md': planContent,
          '.specify/specs/feature/user-auth/tasks.md': tasksContent,
        },
        featurePath: '.specify/specs/feature/user-auth',
      });

      expect(result.success).toBe(true);
      expect(result.context).toBeDefined();
      expect(result.context?.userStories.length).toBe(2);
      expect(result.context?.phases.length).toBe(2);
      expect(result.context?.tasks.length).toBe(3);
    });

    it('should handle partial spec data gracefully', async () => {
      const specContent = `---
feature: minimal
---

# Minimal Spec`;

      const result = await gatherSpecContext({
        _mockFileSystem: {
          '.specify/': 'directory',
          '.specify/specs/feature/minimal/spec.md': specContent,
        },
        featurePath: '.specify/specs/feature/minimal',
      });

      expect(result.success).toBe(true);
      expect(result.context?.userStories.length).toBe(0);
      expect(result.context?.phases.length).toBe(0);
    });
  });

  describe('formatSpecContext - formats for injection', () => {
    it('should format spec context as readable string', () => {
      const context: SpecContext = {
        featureName: 'user-auth',
        userStories: [
          { id: 'US1', title: 'User Login' },
          { id: 'US2', title: 'User Registration' },
        ],
        phases: [
          { id: '1', name: 'Foundation', status: 'completed' },
          { id: '2', name: 'Implementation', status: 'in_progress' },
        ],
        tasks: [
          { id: 'T001', title: 'Implement login', status: 'completed' },
          { id: 'T002', title: 'Add tests', status: 'pending' },
        ],
        currentPhase: 'Implementation',
      };

      const formatted = formatSpecContext(context);

      expect(formatted).toContain('user-auth');
      expect(formatted).toContain('US1');
      expect(formatted).toContain('User Login');
      expect(formatted).toContain('Implementation');
    });

    it('should include task completion stats', () => {
      const context: SpecContext = {
        featureName: 'test',
        userStories: [],
        phases: [],
        tasks: [
          { id: 'T001', title: 'Task 1', status: 'completed' },
          { id: 'T002', title: 'Task 2', status: 'completed' },
          { id: 'T003', title: 'Task 3', status: 'pending' },
        ],
      };

      const formatted = formatSpecContext(context);

      expect(formatted).toContain('2');
      expect(formatted).toContain('3');
    });

    it('should handle empty context gracefully', () => {
      const context: SpecContext = {
        featureName: '',
        userStories: [],
        phases: [],
        tasks: [],
      };

      const formatted = formatSpecContext(context);

      expect(typeof formatted).toBe('string');
    });
  });
});
