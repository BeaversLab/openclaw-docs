---
summary: "`openclaw daemon`（閘道服務管理的舊版別名）的 CLI 參考"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Gateway 服務管理命令的舊版別名。

`openclaw daemon ...` 對映到與 `openclaw gateway ...` 服務命令相同的服務控制介面。

## 用法

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子命令

- `status`：顯示服務安裝狀態並偵測 Gateway 健康狀況
- `install`：安裝服務 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服務
- `start`：啟動服務
- `stop`：停止服務
- `restart`：重新啟動服務

## 通用選項

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- 生命週期 (`uninstall|start|stop|restart`)：`--json`

備註：

- `status` 會在可能的情況下解析針對探測認證所設定的認證 SecretRefs。
- 若此指令路徑中必要的 auth SecretRef 未解析，當探查連線/驗證失敗時，`daemon status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 若探查成功，將會隱藏未解析的 auth-ref 警告以避免誤報。
- 在 Linux systemd 安裝上，`status` token-drift 檢查包含 `Environment=` 和 `EnvironmentFile=` 單元來源。
- 當 token 驗證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 保存至服務環境元資料中。
- 若 token 驗證需要 token 且設定的 token SecretRef 未解析，安裝將會失敗並封閉。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，則安裝將會被阻擋，直到明確設定模式為止。

## 偏好

請使用 [`openclaw gateway`](/zh-Hant/cli/gateway) 查看最新的文件和範例。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
