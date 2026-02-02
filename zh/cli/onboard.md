---
summary: "`openclaw onboard` 的 CLI 参考（交互式 onboarding 向导）"
read_when:
  - 需要为 gateway、工作区、认证、频道与技能做引导式设置
title: "onboard"
---

# `openclaw onboard`

交互式 onboarding 向导（本地或远程 Gateway 设置）。

相关：
- 向导指南：[Onboarding](/zh/start/onboarding)

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url ws://gateway-host:18789
```

流程说明：
- `quickstart`：最少提示，自动生成 gateway token。
- `manual`：完整端口/bind/auth 提示（`advanced` 的别名）。
- 最快开始聊天：`openclaw dashboard`（Control UI，无需频道设置）。
