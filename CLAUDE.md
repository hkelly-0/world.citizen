# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behaviour

Do not make assumptions: if my instructions are unclear, ask me as many clarifying questions as required to remove all ambiguity.

This code should be explicit to the reader. Do not use complex engineering patterns when simple ones will suffice, unless I explicitly ask for modular or scalable solutions.

While working, do not remove previous comments unless the underlying logic changes and the comment is incorrect.

## Git

- Make one commit per logical change (e.g. a bug fix and a refactor are separate commits); don't bundle unrelated updates.
- Commit subject: imperative mood, ≤72 characters, no trailing period (e.g. "Add .gitignore for Python bytecode"). Add a body when the *why* isn't obvious.
- Run the tests before committing code changes.
- Only commit when asked.
