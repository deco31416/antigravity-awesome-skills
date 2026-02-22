---
name: data-structure-protocol
description: "Build and navigate DSP — graph-based long-term structural memory for LLM agents to track codebase entities, dependencies, and APIs without losing context."
risk: safe
source: community
---

# Data Structure Protocol (DSP)

## Overview

DSP (Data Structure Protocol) provides a long-term structural memory for LLM coding agents. It stores a graph of project entities (modules, functions, external dependencies), their relationships (imports), public APIs (shared/exports), and explicit clinical "why" reasons for every connection. This enables the agent to navigate the project structure, understand dependencies, and perform impact analysis without loading the entire codebase into the context window.

## When to Use This Skill

- Use when working on a project that has a `.dsp/` directory.
- Use when the user asks to set up DSP or bootstrap a project's structure.
- Use when creating, modifying, or deleting code files in a DSP-tracked project to keep the graph updated.
- Use when navigating project structure, understanding dependencies, or finding modules.

## Step-by-Step Guide

### 1. Initial Setup
The skill relies on a standalone Python CLI script `dsp-cli.py`. Instruct the user to download it if it's missing in the project, or download it yourself:
```bash
curl -O https://raw.githubusercontent.com/k-kolomeitsev/data-structure-protocol/main/skills/data-structure-protocol/scripts/dsp-cli.py
```

### 2. General Workflow Rules
- **Before changing code**: Find affected entities via `python dsp-cli.py search`, `find-by-source`, or `read-toc`. Read their `description` and `imports` to understand the context.
- **When creating a file/module**: Call `create-object`. For each exported function, call `create-function` (with `--owner`). Register exports via `create-shared`.
- **When adding an import**: Call `add-import` with a brief `why`. For external dependencies, first call `create-object --kind external` if the entity doesn't exist yet.
- **When removing import/export/file**: Call `remove-import`, `remove-shared`, `remove-entity` respectively. Cascade cleanup is automatic.
- **When renaming/moving a file**: Call `move-entity`. UID does not change.
- **Don't touch DSP** if only internal implementation changed without affecting purpose or dependencies.
- **Bootstrap**: If `.dsp/` is empty, traverse the project from the root entrypoint via DFS on imports, documenting every file.

## Examples

### Example 1: Creating a new module and adding an import

```bash
# Initialize DSP in the project
python dsp-cli.py --root . init

# Create a module entity
python dsp-cli.py --root . create-object "src/app.ts" "Main application entrypoint"

# Create an exported function entity (owner = module UID)
python dsp-cli.py --root . create-function "src/app.ts#start" "Starts the HTTP server" --owner obj-a1b2c3d4

# Mark exports (public API)
python dsp-cli.py --root . create-shared obj-a1b2c3d4 func-7f3a9c12

# Record an import with a reason (why)
python dsp-cli.py --root . add-import obj-a1b2c3d4 obj-deadbeef "HTTP routing"
```

### Example 2: Navigating the graph

```bash
# Search by meaning/keywords
python dsp-cli.py --root . search "authentication"

# Inspect one entity
python dsp-cli.py --root . get-entity obj-a1b2c3d4

# Check impact analysis / recipients
python dsp-cli.py --root . get-recipients obj-a1b2c3d4
```

## Best Practices

- ✅ **Do:** Update DSP immediately when creating new files, adding imports, or changing public APIs.
- ✅ **Do:** Always add a meaningful `why` reason when recording an import.
- ✅ **Do:** Use `kind: external` for third-party libraries without analyzing their internals.
- ❌ **Don't:** Touch `.dsp/` files for internal-only code changes that don't affect the module's purpose or dependencies.
- ❌ **Don't:** Change an entity's UID when renaming or moving a file (use `move-entity` instead).
