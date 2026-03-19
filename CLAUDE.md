# CLAUDE.md — Project Instructions for Claude Code

## Namespace Warning

**CRITICAL: This is a namespaced scratch org (namespace: `OpenSF`). The namespace prefix is added AUTOMATICALLY during deployment.**

- **Metadata source files** (object XMLs, field XMLs, flows, flexipages, custom metadata, permission sets) must NEVER have the `OpenSF__` prefix in directory names, file names, `<fullName>`, `<referenceTo>`, or `<relationshipName>` values.
  - Correct: `objects/Sprint__c/fields/Status__c.field-meta.xml` with `<fullName>Status__c</fullName>`
  - Wrong: `objects/OpenSF__Sprint__c/fields/OpenSF__Status__c.field-meta.xml`

- **Apex code** (.cls, .trigger) DOES use the `OpenSF__` prefix when referencing SObjects and fields at runtime. This is correct — Apex uses the full namespaced API name.

- **LWC code** also uses `OpenSF__` prefix in field references (e.g., `OpenSF__Subject__c`). This is correct.

If you create new custom objects, custom fields, platform events, or any metadata — do NOT prefix them with `OpenSF__`.

## CLI Usage

Use `powershell.exe -Command "sf ..."` to run Salesforce CLI commands. The bash shell cannot resolve the `sf` path directly on this Windows machine.

## Code Style

- prettier-plugin-apex pinned to v2.1.5 (v2.2.6 breaks SOQL formatting and test class visibility)
