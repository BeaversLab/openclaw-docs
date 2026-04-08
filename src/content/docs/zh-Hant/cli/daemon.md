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
- `status --deep` 增加了盡最大努力的系統層級服務掃描。當它發現其他類似 gateway 的服務時，人類可讀輸出會列印清理提示，並警告每台機器一個 gateway 仍然是正常的建議。
- 在 Linux systemd 安裝上，`status` token 偏差檢查包括 `Environment=` 和 `EnvironmentFile=` 單元來源。
- 偏差檢查使用合併的運行時環境解析 `gateway.auth.token` SecretRef（優先使用服務命令環境，然後是進程環境回退）。
- 如果 token 認證未有效啟用（明確 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或模式未設定且密碼可勝出而沒有 token 候選可勝出），token 偏差檢查將跳過配置 token 解析。
- 當 token 認證需要 token 並且 `gateway.auth.token` 由 SecretRef 管理時，`install` 會驗證 SecretRef 是否可解析，但不會將解析出的 token 持久化到服務環境元數據中。
- 如果 token 認證需要 token 並且配置的 token SecretRef 未解析，安裝將失敗並關閉。
- 如果同時配置了 `gateway.auth.token` 和 `gateway.auth.password` 並且 `gateway.auth.mode` 未設定，安裝將被阻止，直到明確設定模式。
- 如果您有意在一台主機上運行多個 gateway，請隔離連接埠、配置/狀態和工作區；請參閱 [/gateway#multiple-gateways-same-host](/en/gateway#multiple-gateways-same-host)。

## 建議

請使用 [`openclaw gateway`](/en/cli/gateway) 獲取最新的文件和示例。
