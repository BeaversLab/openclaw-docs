---
summary: "CLI reference for `openclaw skills` (list/info/check) and skill eligibility"
read_when:
  - You want to see which skills are available and ready to run
  - You want to debug missing binaries/env/config for skills
title: "skills"
---

# `openclaw skills`

Inspect skills (bundled + workspace + managed overrides) and see what’s eligible vs missing requirements.

相關：

- Skills system: [Skills](/zh-Hant/tools/skills)
- Skills config: [Skills config](/zh-Hant/tools/skills-config)
- ClawHub installs: [ClawHub](/zh-Hant/tools/clawhub)

## 命令

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
