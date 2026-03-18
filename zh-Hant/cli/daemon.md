---
summary: "CLI 參考資料 for `openclaw daemon` (gateway 服務管理的舊版別名)"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "daemon"
---

# `openclaw daemon`

Gateway 服務管理指令的舊版別名。

`openclaw daemon ...` 對應到與 `openclaw gateway ...` 服務指令相同的服務控制介面。

## 使用方式

```bash
openclaw daemon status
openclaw daemon install
openclaw daemon start
openclaw daemon stop
openclaw daemon restart
openclaw daemon uninstall
```

## 子指令

- `status`：顯示服務安裝狀態並探查 Gateway 健康狀況
- `install`：安裝服務 (`launchd`/`systemd`/`schtasks`)
- `uninstall`：移除服務
- `start`：啟動服務
- `stop`：停止服務
- `restart`：重新啟動服務

## 常見選項

- `status`：`--url`、`--token`、`--password`、`--timeout`、`--no-probe`、`--require-rpc`、`--deep`、`--json`
- `install`：`--port`、`--runtime <node|bun>`、`--token`、`--force`、`--json`
- lifecycle (`uninstall|start|stop|restart`)：`--json`

備註：

- `status` 會在可能的情況下為探查驗證解析已設定的驗證 SecretRef。
- 如果在此指令路徑中必要的驗證 SecretRef 未解析，當探查連線/驗證失敗時，`daemon status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探查成功，將會隱藏未解析的 auth-ref 警告，以避免誤判。
- 在 Linux systemd 安裝上，`status` token-drift 檢查包含 `Environment=` 和 `EnvironmentFile=` 單元來源。
- 當權杖驗證需要權杖且 `gateway.auth.token` 由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析出的權杖儲存到服務環境元資料中。
- 如果權杖驗證需要權杖且已設定的權杖 SecretRef 無法解析，安裝將會失敗並關閉。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被封鎖，直到明確設定模式為止。

## 建議

請使用 [`openclaw gateway`](/zh-Hant/cli/gateway) 查看最新的文件和範例。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
