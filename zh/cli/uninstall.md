---
summary: "`openclaw uninstall` 的 CLI 参考（卸载网关服务 + 本地数据）"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "uninstall"
---

# `openclaw uninstall`

卸载网关服务 + 本地数据（CLI 保留）。

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

如果在删除状态或工作区之前需要可恢复的快照，请先运行 `openclaw backup create`。
