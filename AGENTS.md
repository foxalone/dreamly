# Agent notes (Dreamly)

## Project memory

Read `MEMORY.md` for saved project facts, including the dated Google Analytics baseline requested by the user. Preserve reporting periods and metric limitations when using these figures.

## i18n (mandatory)

Every user-facing addition must ship in **English + Spanish + Arabic + Portuguese (Brazil) + German + Russian**.

Read **`docs/i18n.md`** before adding a page, symbol, guide, or UI string. The Cursor rule `.cursor/rules/i18n.mdc` restates the checklist.

English URLs stay unprefixed (`/dreams/snake`). Other locales use `/es`, `/ar`, `/pt`, `/de`, `/ru`. Never introduce `/en`.

## Delivery preference (mandatory)

After every fix, include a ready-to-run terminal script or command in the final response that commits the intended changes and pushes them to `origin main`. Do not omit this even when the user does not repeat the request. Stage only the files belonging to the fix; do not include unrelated work, force-push, or delete Git lock files. Provide the script for the user to run; do not push automatically unless asked.
