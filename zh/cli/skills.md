---
summary: "`openclaw skills` 的 CLI 参考（list/info/check）与技能就绪情况"
read_when:
  - 需要查看哪些技能可用且已就绪
  - 需要排查技能缺失的二进制/环境/配置
title: "skills"
---

# `openclaw skills`

检查技能（内置 + 工作区 + 托管覆盖）并查看哪些就绪/缺失依赖。

相关：
- 技能系统：[Skills](/zh/tools/skills)
- 技能配置：[Skills config](/zh/tools/skills-config)
- ClawdHub 安装：[ClawdHub](/zh/tools/clawdhub)

## 命令

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```
