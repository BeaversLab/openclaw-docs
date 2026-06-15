---
summary: "`openclaw uninstall`（移除网关服务 + 本地数据）的 CLI 参考文档"
read_when:
  - You want to remove the gateway service and/or local state
  - You want a dry-run first
title: "卸载"
---

# `openclaw uninstall`

卸载网关服务 + 本地数据（CLI 保留）。

选项：

- `--service`：移除网关服务
- `--state`：移除状态和配置
- `--workspace`：移除工作区目录
- `--app`：移除 macOS 应用
- `--all`：移除服务、状态、工作区和应用
- `--yes`：跳过确认提示
- `--non-interactive`：禁用提示；需要 `--yes`
- `--dry-run`：打印操作而不删除文件

示例：

```bash
openclaw backup create
openclaw uninstall
openclaw uninstall --service --yes --non-interactive
openclaw uninstall --state --workspace --yes --non-interactive
openclaw uninstall --all --yes
openclaw uninstall --dry-run
```

注意：

- 如果您在移除状态或工作区之前需要可恢复的快照，请先运行 `openclaw backup create`。
- `--state` 会保留已配置的工作区目录，除非同时选择了 `--workspace`。
- `--all` 是同时删除服务、状态、工作区和应用程序的简写形式。
- `--non-interactive` 需要 `--yes`。

## 相关

- [CLI 参考](CLI/en/cli)
- [卸载](/zh/install/uninstall)
