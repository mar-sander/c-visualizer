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
- Current application files:
  - index.html
  - style.css
  - script.js
- Regression test page:
  - tests.html

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

## Supported scope for Ver.0.7_0813

Last updated: 2026-08-13

Currently supported:

- int variable declarations
- uninitialized int declarations
- int initialization
- assignment
- integer arithmetic with `+`, `-`, `*`, `/`, and `%`
- unary signs and parentheses in supported integer expressions
- comparison expressions
- comparison operators `<`, `<=`, `>`, `>=`, `==`, `!=`
- C-style truth values: `0` is false, nonzero is true
- simple printf output
- `return 0;` from main, supported if branches, direct for bodies, and if branches inside for
- simple integer input with `scanf("%d", &variable);` directly inside main
- one declared int variable per scanf call
- one scanf input value per non-empty line in the dedicated input field
- safe stopping on missing input, invalid input, undeclared variables, or unsupported scanf forms
- simple if statements
- simple if-else statements
- simple nested if and if-else statements up to two levels
- a nested if or if-else inside either the outer if branch or the outer else branch
- multiple independent nested if or if-else statements in the same outer branch
- multiple independent simple if statements
- multiple independent simple if-else statements
- assignments to existing variables inside if
- assignments to existing variables inside else
- assignments to existing variables inside a nested if or if-else
- printf inside if and else
- printf inside a nested if or if-else
- `return 0;` inside a supported outer or nested if/if-else branch
- continuation of the outer branch after a nested if
- propagation of values updated by a nested if to later statements
- no evaluation of nested conditions in an unselected outer branch
- inner-body-only stopping when a selected nested condition in a main-level if cannot be evaluated
- outer-branch-level safe stopping for unsupported nested structures in a main-level if
- safe skipping of false or unevaluable if bodies
- safe branch selection: true executes only if, false executes only else
- clear warnings for unsupported if structures
- standalone prefix and postfix `++` and `--`
- standalone `+=` and `-=` with an integer constant
- basic for statements directly inside main
- multiple independent basic for statements directly inside main
- for initialization by assignment to a previously declared int variable
- for conditions using the existing expression evaluator
- for updates using standalone `++`, `--`, integer-constant `+=`, integer-constant `-=`, or an ordinary assignment
- multiple supported statements and empty bodies inside for
- changes to the loop variable inside the for body
- supported if/if-else statements, multiple independent if statements, and up to two if levels inside for
- complete structural validation of a for body before for initialization
- compressed for explanations after six iterations without omitting execution, output, or variable updates
- a per-for safety limit of 500 entered body iterations
- sequential execution
- line-by-line explanations
- variable state display
- output display

## Simple scanf specification

Supported form:

```c
int score;
scanf("%d", &score);
```

Rules:

- scanf must be a direct child statement of main
- only `%d` is supported
- accept exactly one target per scanf call
- the target must be a previously declared int variable
- allow ordinary spacing differences such as `scanf ( "%d" , &score );`
- recreate the input queue from the dedicated textarea on each visualization run
- trim each input line and ignore empty lines
- consume values from top to bottom across multiple scanf calls
- validate an input value only when a scanf call actually uses it
- consume the value only after the scanf form, declaration, presence, and integer format are all valid
- do not validate or warn about unused extra input lines
- stop later main statements safely when input is missing or invalid, or when the scanf form is unsupported
- keep variables and output produced before a scanf error
- if any branch of an outer if or if-else contains scanf, skip the complete outer structure without consuming input
- `&variable` is recognized only as part of the supported scanf syntax; it does not mean general address-operator or pointer support

## Simple if and nested-if/if-else specification

Supported form:

```c
if(condition){
    statement;
}else{
    statement;
}
```

Rules:

- else is optional
- support both `}else{` and a separate `else{` line after the if closing brace
- no else if
- count an if directly inside main or directly inside a for body as level 1
- count an if inside that if or else branch as level 2
- do not count the containing for statement as an if nesting level
- support a maximum depth of 2
- allow multiple independent level-2 if or if-else statements in one outer branch
- allow at most one else on a level-2 if
- opening brace must be on the same line as if or else
- the if closing brace may share a line with `else{` or be alone
- the final closing brace must be alone on its line
- braces are required
- only ordinary assignment to an existing variable, printf, and `return 0;` are executed inside an outer or inner branch
- standalone `++`, `--`, `+=`, and `-=` are unsupported inside any if or else branch
- scanf is unsupported inside any if or else branch
- declarations inside any branch are unsupported and must not register a variable
- use the current expression evaluator for all conditions
- treat `0` as false and every nonzero result as true
- validate the complete outer if/if-else structure before evaluating the outer condition
- after a nested if or if-else finishes or its condition evaluation fails, continue with supported later statements in the selected outer branch
- do not evaluate a nested condition in an unselected outer branch, and do not warn about undeclared or uninitialized values used only there
- if a selected nested condition cannot be evaluated, skip both its if and else branches
- preserve the existing non-fatal runtime-error behavior for if/if-else directly inside main
- when executing an if inside a for, propagate condition and selected-branch runtime errors so the for and program stop
- propagate `return 0;` from a selected outer or nested branch to the program level
- treat unsupported structures as safe-stop targets even when they appear in an unselected outer branch
- if level 3 or deeper, else if, an extra else, or an unsupported control structure appears inside a nested if, do not partially execute the containing outer structure
- never partially execute an outer if/if-else structure that fails structural validation
- unsupported if structures must fail safely
- statements inside unsupported if structures must never be accidentally executed
- if the structure cannot be bounded safely, do not guess or execute it
- braces, if text, and else text inside strings or comments must not affect structure detection
- one statement per line remains required

Supported nested form:

```c
if(outerCondition){
    statement;

    if(innerCondition){
        statement;
    }else{
        statement;
    }

    statement;
}
```

## Basic for specification

Supported form:

```c
int i;

for(i = 0; i < 5; i++){
    printf("%d\n", i);
}
```

Rules:

- for must be a direct child statement of main
- allow multiple independent direct-child for statements
- require all three header clauses: initialization, condition, and update
- initialization must assign to a previously declared int variable
- do not support declarations such as `for(int i = 0; ... )`
- use the existing expression evaluator for initialization, conditions, ordinary assignment updates, and body assignments
- treat condition result `0` as false and every nonzero result as true
- support standalone prefix/postfix `++` and `--` in the update clause
- support `+=` and `-=` with an integer constant in the update clause
- support an ordinary assignment such as `i = i + 2` in the update clause
- require braces and require the opening brace on the for header line
- allow multiple supported statements and an empty body
- directly supported body statements are ordinary assignment, standalone updates, printf, and `return 0;`
- allow supported if/if-else nodes as body items instead of creating for-specific if execution
- allow multiple independent if statements in one for body
- allow up to two if levels inside for; the for itself does not count as an if level
- inside an if/else branch in for, allow only ordinary assignment, printf, and `return 0;`
- do not support declarations, scanf, nested for, while, break, continue, or other unsupported controls in the for body
- validate the complete for body before initialization, including unselected if/else branches and a body that will execute zero times
- never partially execute a for that fails structural validation
- propagate `return 0;` from the direct body or an if branch to main and stop the whole program
- propagate runtime errors from initialization, condition, body, selected if branches, and update; never continue to the next iteration after an error
- keep a separate iteration budget for each independent for statement
- permit 500 entered body iterations; after the 500th update, evaluate the condition once more
- if that condition is false, finish normally after 500 iterations
- if that condition is true, stop before entering or updating the 501st body iteration
- describe this as a Visualizer safety limit, not a C language restriction

## For explanation display

- show every iteration explanation for 0 through 6 entered body iterations
- for 7 or more iterations, keep the first 3 iterations, one omission marker, the actual final iteration, and the termination reason
- retain the final false condition on normal completion
- retain the actual return, runtime-error, or safety-stop iteration on abnormal completion
- do not invent a final false condition after return, runtime error, or safety stop
- compress only analysis entries and step entries
- never omit actual condition evaluation, body execution, updates, printf output, or final variable state
- keep explanation histories independent across multiple for statements

## Unsupported scope for Ver.0.7_0813

Do not implement these unless explicitly requested:

- else if
- if nesting at level 3 or deeper
- declarations inside any branch
- standalone `++`, `--`, `+=`, and `-=` inside any if or else branch
- braceless if
- split-line opening brace style
- split-line opening brace style for else
- logical operators `&&`, `||`, and `!`
- for-header declarations
- omitted for initialization, condition, or update, including `for(;;)`
- multiple for-header expressions and comma operators
- variable operands in compound for updates, such as `i += step`
- braceless for and split-line opening brace style for for
- nested for and for inside if
- scanf and declarations inside a for body
- expressions that use the value or side effects of `++` or `--`
- break and continue
- while
- do while
- switch
- arrays
- float, char, and string variables
- user-defined functions
- printf `%%`
- scanf conversion specifiers other than `%d`, including `%f`, `%lf`, `%c`, and `%s`
- multiple scanf targets in one call
- scanf inside if or else branches
- scanf input into float, char, strings, or arrays
- using the scanf return value
- general address-operator and pointer behavior
- interactive console input
- complete C execution involving scanf
- structs
- file I/O
- multiple source files
- real compiler error reproduction

## Input rule

In Ver.0.7_0813, assume one C statement per line.

If multiple statements are written on one line, show a warning instead of trying to parse them automatically.

Preferred warning message in Japanese:

「1行に複数の文があります。文の終わりで改行してください。」

## Version notation

- UI version format: `Ver.<version>_<MMDD>`
- Example: `Ver.0.2_0730`
- `MMDD` represents the actual update month and day.
- README or release records should also include the full date in `YYYY-MM-DD` format.
- Update current-version strings consistently across `index.html`, `README.md`, and `AGENTS.md` when a version is changed.
- Prefer version-neutral wording such as "現在のVisualizerでは" for user-facing messages in `script.js` unless an explicit version is necessary.

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
