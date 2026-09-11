---
summary: "Index of the Skill Workshop documentation, one page per reader job"
read_when:
  - You want the agent to create or update a skill from chat
  - You need to review, apply, reject, or quarantine a generated skill draft
  - You are configuring Skill Workshop approval, autonomy, storage, or limits
  - You are looking for the Skill Workshop page that matches your task
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop is OpenClaw's governed path for creating and updating its own
generated skills. Through this path, agents and operators create a **proposal** (pending
draft with content, target binding, scanner state, hashes, and rollback
metadata) that becomes a live skill only when applied.

Automatic background learning and weekly collection review instead maintain the
Workshop directory with normal agent file tools. These direct edits do not create
proposals or automatic rollback snapshots. Choose `propose` mode when each new
skill change needs review before publication.

By default, Skill Workshop writes only under the active agent's
`<state-dir>/agents/<agentId>/agent/workshop-skills`. When `agents.entries.<id>.agentDir` is
configured, it writes under `<agentDir>/workshop-skills` instead. Operators edit
bundled, plugin, ClawHub, extra-root, managed, personal-agent, project, and
workspace skills through their owning tools or files. The same authoring tool
also supports [personal library skills](/en/tools/skills#personal-skills-on-a-shared-gateway)
when the Gateway supplies an authorized library target. Those operations publish
managed revisions rather than Workshop proposals.

Workshop storage is installation-managed and separate from the session
workspace and managed skill library. `OPENCLAW_STATE_DIR` selects the state
directory. `~/.openclaw` is the default.

This page is an index. Skill Workshop is documented on eight pages, one per
reader job. Open the page that matches your task.

| Page                                                                                   | Read it when                                                                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [Personal library authoring](/en/tools/skill-workshop/personal-library)                   | You are authoring a profile-owned personal skill on a shared Gateway.              |
| [How Skill Workshop works](/en/tools/skill-workshop/how-it-works)                         | You need the proposal rules, the Control UI review surfaces, or the state diagram. |
| [Collection review](/en/tools/skill-workshop/collection-review)                           | You are enabling weekly review, or recovering a skill from a retained backup.      |
| [Chat and CLI authoring](/en/tools/skill-workshop/authoring)                              | You are creating, revising, or applying a proposal from chat or the CLI.           |
| [Proposal content, support files, and the agent tool](/en/tools/skill-workshop/proposals) | You are writing `PROPOSAL.md`, adding support files, or calling `skill_workshop`.  |
| [Self-learning and approval settings](/en/tools/skill-workshop/configuration)             | You are configuring autonomy, approval policy, or Workshop size caps.              |
| [Gateway methods, storage, and limits](/en/tools/skill-workshop/reference)                | You need the Gateway method list, the on-disk layout, or the hard limits.          |
| [Skill Workshop troubleshooting](/en/tools/skill-workshop/troubleshooting)                | A proposal fails, does not appear, or the agent cannot call the tool.              |

## Where each section moved

Every section heading id from the previous single-page version keeps its
anchor here, so an existing link such as
`/tools/skill-workshop#collection-review` still resolves. Each entry points at
the page that now holds the content.

- <a id="personal-library-authoring" />[Personal library authoring](/en/tools/skill-workshop/personal-library#personal-library-authoring)
- <a id="how-it-works" />[How it works](/en/tools/skill-workshop/how-it-works#how-it-works)
- <a id="review-in-the-control-ui" />[Review in the Control UI](/en/tools/skill-workshop/how-it-works#review-in-the-control-ui)
- <a id="lifecycle" />[Lifecycle](/en/tools/skill-workshop/how-it-works#lifecycle)
- <a id="collection-review" />[Collection review](/en/tools/skill-workshop/collection-review#collection-review)
- <a id="changes-and-recovery" />[Changes and recovery](/en/tools/skill-workshop/collection-review#changes-and-recovery)
- <a id="when-an-older-backup-cannot-be-restored-automatically" />[When an older backup cannot be restored automatically](/en/tools/skill-workshop/collection-review#when-an-older-backup-cannot-be-restored-automatically)
- <a id="chat" />[Chat](/en/tools/skill-workshop/authoring#chat)
- <a id="learn-from-recent-work" />[Learn from recent work](/en/tools/skill-workshop/authoring#learn-from-recent-work)
- <a id="cli" />[CLI](/en/tools/skill-workshop/authoring#cli)
- <a id="plugin-evaluation-and-lifecycle-hooks" />[Plugin evaluation and lifecycle hooks](/en/tools/skill-workshop/proposals#plugin-evaluation-and-lifecycle-hooks)
- <a id="proposal-content" />[Proposal content](/en/tools/skill-workshop/proposals#proposal-content)
- <a id="support-files" />[Support files](/en/tools/skill-workshop/proposals#support-files)
- <a id="agent-tool" />[Agent tool](/en/tools/skill-workshop/proposals#agent-tool)
- <a id="self-learning" />[Self-learning](/en/tools/skill-workshop/configuration#self-learning)
- <a id="scan-past-sessions" />[Scan past sessions](/en/tools/skill-workshop/configuration#scan-past-sessions)
- <a id="approval-and-autonomy" />[Approval and autonomy](/en/tools/skill-workshop/configuration#approval-and-autonomy)
- <a id="gateway-methods" />[Gateway methods](/en/tools/skill-workshop/reference#gateway-methods)
- <a id="storage" />[Storage](/en/tools/skill-workshop/reference#storage)
- <a id="limits" />[Limits](/en/tools/skill-workshop/reference#limits)
- <a id="troubleshooting" />[Troubleshooting](/en/tools/skill-workshop/troubleshooting#troubleshooting)
- <a id="tool-policy-diagnostic" />[Tool-policy diagnostic](/en/tools/skill-workshop/troubleshooting#tool-policy-diagnostic)

## Related

- [Skills](/en/tools/skills) for load order, precedence, and visibility
- [Self-learning](/en/tools/self-learning) for conservative post-run skill proposals
- [Creating skills](/en/tools/creating-skills) for hand-written `SKILL.md`
  basics
- [Skills config](/en/tools/skills-config) for the full `skills.workshop` schema
- [Skills CLI](/en/cli/skills) for `openclaw skills` commands
