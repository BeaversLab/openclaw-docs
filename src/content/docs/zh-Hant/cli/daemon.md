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
- Drift 檢查使用合併的運行時環境（優先使用服務指令環境，然後回退到進程環境）來解析 `gateway.auth.token` SecretRefs。
- 如果 Token 認證未實際生效（明確設定 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或在未設定模式且密碼可優先且沒有 Token 候選可優先的情況下），Token-Drift 檢查將跳過配置 Token 解析。
- 當 Token 認證需要 Token 且 `gateway.auth.token` 由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析出的 Token 持久化到服務環境元數據中。
- 如果 Token 認證需要 Token 且配置的 Token SecretRef 未解析，安裝將以失敗告終。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將被阻止，直到明確設定模式。

## 優先使用

有關當前文檔和示例，請使用 [`openclaw gateway`](/en/cli/gateway)。
