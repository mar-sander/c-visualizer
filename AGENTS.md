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

## Supported scope for Ver.0.2_0730

Currently supported:

- int variable declarations
- uninitialized int declarations
- int initialization
- assignment
- integer arithmetic
- comparison expressions
- comparison operators `<`, `<=`, `>`, `>=`, `==`, `!=`
- C-style truth values: `0` is false, nonzero is true
- simple printf output
- simple if statements
- multiple independent simple if statements
- assignments to existing variables inside if
- printf inside if
- safe skipping of false or unevaluable if bodies
- clear warnings for unsupported if structures
- sequential execution
- line-by-line explanations
- variable state display
- output display

## Simple if statement specification

Supported form:

```c
if(condition){
    statement;
}
```

Rules:

- no else
- no else if
- no nested if
- opening brace must be on the same line as if
- closing brace must be alone on its line
- braces are required
- only assignment to an existing variable and printf are executed inside if
- declarations inside if are unsupported
- unsupported if structures must fail safely
- statements inside unsupported if structures must never be accidentally executed
- braces and else text inside strings or line comments must not affect structure detection
- one statement per line remains required

## Unsupported scope for Ver.0.2_0730

Do not implement these unless explicitly requested:

- else
- else if
- nested if
- declarations inside if
- braceless if
- split-line opening brace style
- for
- while
- arrays
- user-defined functions
- pointers
- scanf
- structs
- file I/O
- multiple source files
- real compiler error reproduction

## Input rule

In Ver.0.2_0730, assume one C statement per line.

If multiple statements are written on one line, show a warning instead of trying to parse them automatically.

Preferred warning message in Japanese:

「1行に複数の文があります。文の終わりで改行してください。」

## Version notation

- UI version format: `Ver.<version>_<MMDD>`
- Example: `Ver.0.2_0730`
- `MMDD` represents the actual update month and day.
- README or release records should also include the full date in `YYYY-MM-DD` format.
- Update version strings consistently across `index.html`, `script.js`, `README.md`, and `AGENTS.md` when a version is changed.

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
