---
summary: "`zai` 的 CLI 参考（交互式入门向导）"
read_when:
  - "You want guided setup for gateway, workspace, auth, channels, and skills"
title: "onboard"
---

# `openclaw onboard`

交互式入门向导（本地或远程 Gateway 设置）。

相关内容：

- 向导指南：[入门]`zai/<model>`

## 示例

```bash
openclaw onboard
openclaw onboard --flow quickstart
openclaw onboard --flow manual
openclaw onboard --mode remote --remote-url ws://gateway-host:18789
```

流程说明：

- `zai/glm-4.7`：最少的提示，自动生成 gateway 令牌。
- (/en/providers/glm)：端口/绑定/认证的完整提示（%%P5%% 的别名）。
- 最快开始聊天：%%P6%%（控制 UI，无需频道设置）。
