---
summary: "`openclaw reset` 的 CLI 参考（重置本地状态/配置）"
read_when:
  - 想在保留 CLI 的情况下清理本地状态
  - 想查看将被移除内容的 dry-run
---

# `openclaw reset`

重置本地配置/状态（保留 CLI）。

```bash
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive
```
