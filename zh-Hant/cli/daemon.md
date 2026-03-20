---
summary: "CLI reference for `openclaw daemon` (legacy alias for gateway service management)"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Legacy alias for Gateway service management commands.

`openclaw daemon ...` maps to the same service control surface as `openclaw gateway ...` service commands.

## Usage

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## Subcommands

- `status`: show service install state and probe Gateway health
- `install`: install service (`launchd`/`systemd`/`schtasks`)
- `uninstall`: remove service
- `start`: start service
- `stop`: stop service
- `restart`：重新啟動服務

## 通用選項

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- 生命週期（`uninstall|start|stop|restart`）：`--json`

備註：

- `status` 會在可能的情況下解析針對探針驗證所設定的 auth SecretRefs。
- 如果在此命令路徑中所需的 auth SecretRef 無法解析，當探測連線/驗證失敗時，`daemon status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探測成功，將隱藏未解析的 auth-ref 警告以避免誤報。
- 在 Linux systemd 安裝上，`status` token-drift 檢查包含 `Environment=` 和 `EnvironmentFile=` 單位來源。
- 當 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析後的 token 持久化到服務環境中繼資料中。
- 如果 token 驗證需要 token 且設定的 token SecretRef 無法解析，安裝將會失敗並封閉。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則安裝將會被封鎖，直到明確設定模式。

## 建議

請使用 [`openclaw gateway`](/zh-Hant/cli/gateway) 查看最新的文件與範例。

import en from "/components/footer/en.mdx";

<en />
