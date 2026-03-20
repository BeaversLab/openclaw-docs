---
summary: "CLI 参考 `openclaw skills`（list/info/check）以及技能适用性"
read_when:
  - 您希望查看哪些技能可用并已准备好运行
  - 您希望调试技能缺失的二进制文件/环境/配置
title: "skills"
---

# `openclaw skills`

检查技能（bundled + workspace + managed overrides），查看哪些符合条件以及缺少哪些要求。

相关：

- Skills 系统：[Skills](/zh/tools/skills)
- Skills 配置：[Skills config](/zh/tools/skills-config)
- ClawHub 安装：[ClawHub](/zh/tools/clawhub)

## 命令

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```

import zh from "/components/footer/zh.mdx";

<zh />
