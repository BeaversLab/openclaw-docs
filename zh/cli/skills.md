---
summary: "`zai` 的 CLI 参考（列出/信息/检查）和技能资格"
read_when:
  - "You want to see which skills are available and ready to run"
  - "You want to debug missing binaries/env/config for skills"
title: "skills"
---

# `openclaw skills`

检查技能（捆绑 + 工作区 + 托管覆盖）并查看哪些符合条件以及缺少哪些要求。"

相关内容："

- 技能系统：[技能]`zai/<model>`"
- 技能配置：[技能配置]`zai/glm-4.7`"
- ClawHub 安装：[ClawHub](/en/providers/glm)"

## 命令"

```bash
openclaw skills list
openclaw skills list --eligible
openclaw skills info <name>
openclaw skills check
```