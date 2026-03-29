---
summary: "CLI 參考，用於 `openclaw daemon`（閘道服務管理的舊版別名）"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

閘道服務管理命令的舊版別名。

`openclaw daemon ...` 對應到與 `openclaw gateway ...` 服務命令相同的服務控制介面。

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

- `status`：顯示服務安裝狀態並探查閘道健康狀況
- `install`：安裝服務 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服務
- `start`：啟動服務
- `stop`：停止服務
- `restart`：重新啟動服務

## 常用選項

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- lifecycle (`uninstall|start|stop|restart`)：`--json`

備註：

- `status` 會盡可能解析探查身分驗證的已設定 SecretRefs。
- 如果在此命令路徑中無法解析所需身分驗證 SecretRef，當探查連線/身分驗證失敗時，`daemon status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探查成功，將會抑制未解析身分驗證參照的警告，以避免誤判。
- 在 Linux systemd 安裝中，`status` token-drift 檢查包括 `Environment=` 和 `EnvironmentFile=` 單元來源。
- 當 token auth 需要 token 且 `gateway.auth.token` 由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析後的 token 保存至服務環境元資料中。
- 如果 token auth 需要 token 且設定的 token SecretRef 無法解析，安裝將會失敗封閉（fails closed）。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password`，且未設定 `gateway.auth.mode`，安裝將會被阻擋，直到明確設定模式。

## 建議改用

請使用 [`openclaw gateway`](/en/cli/gateway) 查看目前的文件與範例。
