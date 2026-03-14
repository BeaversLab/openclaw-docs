---
summary: "`openclaw skills` (list/info/check) 和技能资格的 CLI 参考"
read_when:
  - You want to see which skills are available and ready to run
  - You want to debug missing binaries/env/config for skills
title: "技能"
---

# `openclaw skills`

检查技能（内置 + 工作区 + 托管覆盖）并查看哪些具备资格以及哪些缺少要求。

相关：

- 技能系统：[技能](/zh/en/tools/skills)
- 技能配置：[技能配置](/zh/en/tools/skills-config)
- ClawHub 安装：[ClawHub](/zh/en/tools/clawhub)

## 命令

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

import zh from '/components/footer/zh.mdx';

<zh />
