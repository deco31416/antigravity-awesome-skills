---
name: skillfold
description: "YAML pipeline compiler for multi-agent teams. Composes atomic skills, validates typed state, and compiles to 12 targets including Claude Code, Cursor, Copilot, and Gemini."
risk: safe
source: community
date_added: "2026-03-22"
---

# Skillfold

## Overview

Skillfold is a configuration language and compiler for multi-agent AI pipelines. You define atomic skills, compose them into agents, wire agents into typed execution graphs, and compile the result to platform-native formats for Claude Code, Cursor, Copilot, Windsurf, Gemini, Codex, Goose, Roo Code, Kiro, Junie, and Agent Teams.

## When to Use This Skill

- Use when setting up a multi-agent pipeline that needs to run across different AI coding tools
- Use when composing reusable skill fragments into specialized agents
- Use when you need typed state validation across agent handoffs
- Use when you want a single YAML config that compiles to any supported platform

## How It Works

### Step 1: Install

```bash
npm install skillfold
```

### Step 2: Initialize a Pipeline

Scaffold a new pipeline from a built-in template:

```bash
npx skillfold init my-team --template dev-team
```

Available templates: `dev-team`, `content-pipeline`, `code-review-bot`.

This creates a `skillfold.yaml` config with atomic skills, composed agents, typed state, and a team flow.

### Step 3: Compile to a Target Platform

Compile the pipeline into platform-native output:

```bash
# Claude Code agents and skills
npx skillfold --target claude-code

# Cursor rules
npx skillfold --target cursor

# GitHub Copilot instructions
npx skillfold --target copilot

# Gemini agents and skills
npx skillfold --target gemini

# OpenAI Codex AGENTS.md
npx skillfold --target codex

# All 12 targets are supported
```

### Step 4: Validate the Config

Check that the config is well-formed, all skill references resolve, state types are valid, and the execution graph has no cycles or unreachable nodes:

```bash
npx skillfold validate
```

### Step 5: Inspect the Pipeline

List all skills, state fields, and team flow nodes:

```bash
npx skillfold list
```

Generate an interactive graph visualization:

```bash
npx skillfold graph --html > pipeline.html
```

### Step 6: Run the Pipeline

Execute the pipeline end-to-end with an agent spawner:

```bash
npx skillfold run --target claude-code
```

Supports dry-run mode, checkpoint-based resume, conditional routing, loops with iteration guards, and parallel map execution.

## Config Structure

A `skillfold.yaml` has four top-level sections:

```yaml
resources:
  github: https://github.com/org/repo

skills:
  atomic:
    planning: skills/planning
    code-writing: skills/code-writing
  composed:
    engineer:
      extends: [planning, code-writing]

state:
  schema:
    task: string
    status: string
    code: string

team:
  flow:
    planner:
      skill: engineer
      writes: [task, status]
      then: reviewer
    reviewer:
      skill: engineer
      reads: [task, code]
      writes: [status]
      then:
        - when: status == "approved"
          then: done
        - when: status == "needs-changes"
          then: planner
    done:
      terminal: true
```

## Key Features

- **Skill composition**: Atomic skills are reusable fragments. Composed skills concatenate them in order. Composition is recursive.
- **Typed state**: Schema with primitives, lists, custom types, and external resource locations. Reads and writes are validated at compile time.
- **Execution graphs**: Directed flows with conditional routing (`when` clauses), loops with exit conditions, and parallel `map` over list state.
- **12 compilation targets**: Claude Code, Cursor, Copilot, Windsurf, Gemini, Codex, Goose, Roo Code, Kiro, Junie, Agent Teams, and the default SKILL.md format.
- **Pipeline runner**: `skillfold run` spawns agents, manages state, handles conditionals and loops, and supports checkpoint-based resume.
- **Shared library**: 11 built-in atomic skills (planning, research, code-writing, testing, etc.) importable into any config.

## Best Practices

- Keep atomic skills small and focused on a single capability
- Use `skillfold validate` before compiling to catch config errors early
- Use `skillfold --check` in CI to verify compiled output stays current
- Pin remote skill imports to a specific tag or commit SHA with `@ref`
- Use `skillfold watch` during development for auto-recompile on changes

## Common Pitfalls

- **Problem:** Compiled output is out of date after editing `skillfold.yaml`
  **Solution:** Run `npx skillfold --target <target>` again, or use `skillfold watch` for auto-recompile.

- **Problem:** Circular skill composition causes infinite recursion
  **Solution:** The compiler detects cycles and reports them. Restructure the composition to break the cycle.

- **Problem:** State write conflicts between agents in the flow
  **Solution:** The graph validator flags conflicting writes. Assign exclusive write ownership to each state field.

## Additional Resources

- [GitHub Repository](https://github.com/byronxlg/skillfold)
- [Getting Started Guide](https://github.com/byronxlg/skillfold/blob/main/docs/getting-started.md)
- [npm Package](https://www.npmjs.com/package/skillfold)
