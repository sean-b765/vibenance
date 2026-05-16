## Personal Finance Modelling

## Implementation

- Each new feature or bug should be implemented using use test-driven development - write the test first, and then the functionality. After completing, you need to run the test.
- Always prefer to use shadcn components for Vue (shadcn-vue) over standard HTML interactive tags, for example: inputs, buttons, selects...

## Smoke Tests

Assume the dev server is already running when performing a smoke test, e2e test, or ui test. If it is not, prompt the user to start it.

## Conventions

- shadcn-vue for components.
- pinia for stores.

## Components

ALL UI primitives MUST use shadcn-vue from `@/components/ui/*`.
NEVER write raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<label>`, `<dialog>` in .vue files.
If shadcn component missing: run `npx shadcn-vue@latest add <name>` first.
Exceptions: `<input type="color">`, `<input type="file">` (no shadcn equivalent).
