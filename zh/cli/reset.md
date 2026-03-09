---
summary: "`openclaw logs` 的 CLI 参考（重置本地状态/配置）"
read_when:
  - "You want to wipe local state while keeping the CLI installed"
  - "You want a dry-run of what would be removed"
title: "reset"
---

# `openclaw reset`

重置本地配置/状态（保持 CLI 已安装）。

```bash
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```