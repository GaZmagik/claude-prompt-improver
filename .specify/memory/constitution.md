<!--
Sync Impact Report
==================
Version change: N/A → 1.0.0 (initial ratification)

Added sections:
- Core Principles (P1-P6)
- GitHub Workflow
- Governance

Templates requiring updates:
- .specify/templates/plan-template.md: ✅ Already aligned (Constitution Check section)
- .specify/templates/spec-template.md: ✅ Already aligned (user story structure)
- .specify/templates/tasks-template.md: ✅ Already aligned (TDD workflow section)

Follow-up TODOs: None
-->
---
description: "Claude Code Plugin Development Constitution - Core principles and governance for building Claude Code plugins"
version: "1.0.0"
ratified: "2026-01-09"
last_amended: "2026-01-09"
principles:
  - id: "P1"
    name: "Plugin Architecture Compliance"
    status: "active"
  - id: "P2"
    name: "Test-First Development"
    status: "active"
  - id: "P3"
    name: "GitHub Flow Discipline"
    status: "active"
  - id: "P4"
    name: "Observability & Debuggability"
    status: "active"
  - id: "P5"
    name: "Simplicity & YAGNI"
    status: "active"
  - id: "P6"
    name: "Semantic Versioning"
    status: "active"
sections:
  - name: "Core Principles"
    principle_ids: ["P1", "P2", "P3", "P4", "P5", "P6"]
  - name: "GitHub Workflow"
    principle_ids: ["P3", "P6"]
  - name: "Governance"
    principle_ids: []
---

# Claude Code Plugin Development Constitution

## Core Principles

### P1: Plugin Architecture Compliance

All plugins MUST adhere to the official Claude Code plugin structure:

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata (REQUIRED)
├── commands/                 # Slash commands (optional)
├── agents/                   # Specialised agents (optional)
├── skills/                   # Agent skills (optional)
├── hooks/                    # Event handlers (optional)
├── .mcp.json                 # MCP server config (optional)
└── README.md                 # Plugin documentation (REQUIRED)
```

**Non-negotiable rules**:
- `plugin.json` MUST reside inside `.claude-plugin/` directory only
- Commands, agents, skills, and hooks directories MUST be at the plugin root level, NOT inside `.claude-plugin/`
- Each plugin component MUST be independently functional
- All plugins MUST include a README.md documenting usage, installation, and available commands/hooks

**Rationale**: Consistency with the official plugin ecosystem ensures discoverability, maintainability, and compatibility with Claude Code updates.

---

### P2: Test-First Development (NON-NEGOTIABLE)

All implementation MUST follow the Red-Green-Refactor cycle:

1. **Red**: Write a failing test that defines the expected behaviour
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up without changing behaviour

**Non-negotiable rules**:
- Tests MUST be written and seen failing BEFORE implementation code
- Within each feature phase, ALL test tasks MUST be grouped BEFORE ALL implementation tasks
- Interleaving test and implementation tasks is FORBIDDEN
- Test code MUST be treated with the same rigour as production code
- Each test MUST be independently executable (no inter-test dependencies)

**Test structure**:
- Setup: Establish pre-conditions
- Execution: Trigger the behaviour
- Validation: Assert expected outcomes
- Cleanup: Restore to pre-test state

**TDD Status Reporting**: All completed tasks MUST include:
```
TDD: test first? ✅/❌ | seen failing? ✅/❌ | now passing? ✅/❌
```

**Rationale**: TDD ensures comprehensive coverage, catches regressions early, and produces self-documenting code. The test-first discipline prevents "test-after" shortcuts that lead to untested edge cases.

---

### P3: GitHub Flow Discipline

This project follows GitHub Flow for version control:

**Branch naming convention**:
- Feature branches: `feature/<short-description>` (e.g., `feature/memory-skill`)
- Bug fixes: `fix/<short-description>` (e.g., `fix/hook-timeout`)
- Documentation: `docs/<short-description>` (e.g., `docs/readme-update`)

**Non-negotiable rules**:
- Direct commits to `main` are BANNED
- All changes MUST come through feature branches merged via pull request
- The `main` branch MUST always be deployable
- Feature branches MUST be deleted after merging
- Each pull request MUST have a clear description of changes and testing performed

**Commit message format**:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Commit types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes nor adds
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

**Example**:
```
feat(hooks): add PreToolUse validation for Bash commands

Implements pattern matching to block dangerous commands.
Closes #42
```

**Pull request workflow**:
1. Create feature branch from `main`
2. Make changes, commit frequently with meaningful messages
3. Push branch to remote
4. Open pull request with description and test plan
5. Self-review the diff (no team required for solo projects)
6. Merge to `main` when ready
7. Delete feature branch

**Rationale**: GitHub Flow provides a lightweight but structured workflow suitable for continuous delivery. The branching strategy keeps `main` stable whilst enabling parallel feature development.

---

### P4: Observability & Debuggability

All plugin components MUST be observable and debuggable:

**Hook feedback**:
- Hooks MUST provide clear feedback via stdout/stderr
- Error messages MUST be actionable (not just "failed")
- Use `--mcp-debug` flag during development to identify configuration issues

**Logging requirements**:
- All significant operations MUST be logged
- Log levels: DEBUG, INFO, WARN, ERROR
- Logs MUST include context (what operation, what inputs, what outcome)

**CLI output standards**:
- Support both human-readable and JSON output formats where applicable
- Human-readable output for interactive use
- JSON output for programmatic consumption and chaining

**Environment variable expansion**:
- Support `${VAR}` and `${VAR:-default}` syntax in configuration
- Document all required environment variables in README

**Rationale**: Plugins run in complex environments with multiple interacting components. Observable plugins are easier to debug, maintain, and integrate.

---

### P5: Simplicity & YAGNI

Start simple. Add complexity only when proven necessary.

**Non-negotiable rules**:
- Solve concrete, documented problems only
- No speculative "might need this later" features
- Each plugin component MUST deliver independent value
- Prefer composition of simple components over complex monolithic solutions

**Complexity justification**:
Any complexity beyond the minimum MUST be justified in writing with:
1. The specific problem it solves
2. Why simpler alternatives are insufficient
3. The cost of maintaining this complexity

**Warning signs of over-engineering**:
- Abstraction layers with only one implementation
- Configuration for hypothetical future requirements
- "Framework" thinking for single-use cases

**Rationale**: Simpler code is easier to understand, test, maintain, and extend. YAGNI (You Ain't Gonna Need It) prevents wasted effort on unused features.

---

### P6: Semantic Versioning

All plugins MUST follow Semantic Versioning (SemVer):

**Format**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes to plugin interface, command syntax, or hook behaviour
- **MINOR**: New features, commands, or hooks that are backward-compatible
- **PATCH**: Bug fixes, documentation updates, internal refactoring

**Version tracking**:
- Version MUST be specified in `plugin.json`
- CHANGELOG.md SHOULD document changes for each version
- Git tags SHOULD mark releases: `v1.0.0`, `v1.1.0`, etc.

**Breaking change protocol**:
1. Document the breaking change clearly
2. Provide migration guidance where possible
3. Consider deprecation period for widely-used functionality

**Rationale**: SemVer communicates the impact of updates to users, enabling informed upgrade decisions.

---

## GitHub Workflow

### Repository Setup (First-Time Guidance)

1. **Initialise repository**:
   ```bash
   git init
   git remote add origin <repository-url>
   ```

2. **Configure branch protection** (via GitHub web UI):
   - Settings → Branches → Add rule for `main`
   - Require pull request before merging
   - (Optional) Require status checks to pass

3. **Create initial structure**:
   ```bash
   git checkout -b feature/initial-setup
   # Create files...
   git add .
   git commit -m "chore: initial project structure"
   git push -u origin feature/initial-setup
   # Open PR, merge, delete branch
   ```

4. **Sensitive files**:
   - NEVER commit secrets, API keys, or credentials
   - Add `.env`, `*.pem`, `credentials.json` to `.gitignore`
   - Use environment variables for sensitive configuration

### Daily Workflow

1. Ensure `main` is up to date: `git pull origin main`
2. Create feature branch: `git checkout -b feature/my-feature`
3. Work in small, logical commits
4. Push regularly: `git push -u origin feature/my-feature`
5. Open pull request when ready
6. Merge and delete branch
7. Pull updated `main`: `git checkout main && git pull`

---

## Governance

### Constitution Authority

This constitution supersedes all other development practices for Claude Code plugin development in this repository. Deviations require explicit justification and documentation.

### Amendment Process

1. Propose amendment via pull request modifying this file
2. Document rationale for change
3. Update version according to SemVer:
   - MAJOR: Principle removal or fundamental redefinition
   - MINOR: New principle or significant expansion
   - PATCH: Clarification or wording improvements
4. Update `last_amended` date
5. Update YAML frontmatter to reflect changes

### Compliance Review

- All pull requests SHOULD verify compliance with these principles
- Non-compliance MUST be explicitly justified in PR description
- Memory system SHOULD record significant compliance decisions

### References

- [Claude Code Plugin Documentation](https://code.claude.com/docs/en/plugins)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

**Version**: 1.0.0 | **Ratified**: 2026-01-09 | **Last Amended**: 2026-01-09
