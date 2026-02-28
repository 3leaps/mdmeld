# Role Catalog

Baseline role prompts for AI agent sessions on mdmeld.

**Schema**: [`role-prompt.schema.json`](https://schemas.3leaps.dev/agentic/v0/role-prompt.schema.json)

**Source**: Roles are copied from the [3leaps/crucible](https://github.com/3leaps/crucible) and [fulmenhq/crucible](https://github.com/fulmenhq/crucible) catalogs.

## Available Roles

| Role                                | Slug      | Category | Use When                                            |
| ----------------------------------- | --------- | -------- | --------------------------------------------------- |
| [Development Lead](devlead.yaml)    | `devlead` | agentic  | Building features, fixing bugs, implementation work |
| [Development Reviewer](devrev.yaml) | `devrev`  | review   | Code review, four-eyes audit                        |
| [Quality Assurance](qa.yaml)        | `qa`      | review   | Test design, coverage analysis, quality gates       |
| [UX Developer](uxdev.yaml)          | `uxdev`   | agentic  | Web tool UI, frontend work, accessibility           |

**Default to `devlead`** for most implementation work.

## When to Use Which Role

| Task                                     | Role      |
| ---------------------------------------- | --------- |
| Implement a feature or fix a bug         | `devlead` |
| Review code changes                      | `devrev`  |
| Design tests or analyze coverage         | `qa`      |
| Work on the web tool or future Tauri app | `uxdev`   |

## Usage

Reference roles by slug in commit attribution:

```
Role: devlead
```

## Updating Roles

To update roles from upstream crucible:

```bash
# 3leaps roles (devlead, devrev, qa)
cp ~/dev/3leaps/crucible/config/agentic/roles/{devlead,devrev,qa}.yaml config/agentic/roles/

# fulmenhq roles (uxdev)
cp ~/dev/fulmenhq/crucible/config/agentic/roles/uxdev.yaml config/agentic/roles/
```
