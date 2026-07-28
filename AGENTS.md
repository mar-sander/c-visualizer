# C Code Visualizer — Codex Instructions

## Project

This repository contains C Code Visualizer.

C Code Visualizer is an educational web tool for beginner C language learners.
It visualizes how simple C code is processed, how variable values change, and what is printed to the screen.

## Important concept

This project is NOT a full online C compiler.

Do not implement a complete C compiler, runtime, server-side execution environment, WebAssembly compiler, or Node.js-based execution system unless explicitly requested.

The goal is to help students understand the flow of code, not to reproduce all behavior of the C language.

## Technical constraints

- Use only HTML, CSS, and JavaScript.
- The tool must work on GitHub Pages.
- Do not require Node.js, npm, bundlers, servers, databases, or build tools.
- Keep the structure simple.
- Preserve readable formatting, indentation, and helpful comments.
- Current main files:
  - index.html
  - style.css
  - script.js

## Educational priority

Prioritize clarity for beginner students.

When making changes, prefer:

- simple Japanese explanations
- visible variable changes
- readable UI
- predictable behavior
- clear warnings for unsupported code

Avoid:

- overly technical wording
- advanced C language features unless explicitly requested
- adding many features at once
- changing the core design without reason

## Supported scope for Ver.0.1

Currently supported:

- int variable declarations
- int initialization
- assignment
- integer arithmetic
- simple printf output
- sequential execution
- line-by-line explanations
- variable state display
- output display

## Unsupported scope for Ver.0.1

Do not implement these unless explicitly requested:

- if
- for
- while
- arrays
- functions
- pointers
- scanf
- structs
- file I/O
- multiple source files
- real compiler error reproduction

## Input rule

In Ver.0.1, assume one C statement per line.

If multiple statements are written on one line, show a warning instead of trying to parse them automatically.

Preferred warning message in Japanese:

「1行に複数の文があります。文の終わりで改行してください。」

## UI direction

Keep the current visual direction:

- dark background
- code-oriented typography
- calm and readable interface
- card-based sections
- clear line-by-line explanation
- suitable for high school students

## Change policy

When modifying the project:

1. Keep the current behavior unless the task explicitly asks to change it.
2. Avoid large rewrites.
3. Make small, testable changes.
4. Preserve GitHub Pages compatibility.
5. Explain changes in simple terms.
6. Modify only files explicitly permitted by the task.
7. Do not make unrelated edits.
8. Do not delete or replace README.md or AGENTS.md unless explicitly requested.
9. Treat one task as one focused change and one Pull Request.
10. Do not create a Pull Request unless explicitly instructed.

## Required work report

Before editing, record the starting HEAD commit.

After editing, report:

1. the starting HEAD
2. the changed files
3. a concise description of each change
4. the result of `git diff --name-only <starting-HEAD>..HEAD`
5. confirmation that prohibited files have no differences
6. the result of `git diff --check`
7. whether the working tree is clean
