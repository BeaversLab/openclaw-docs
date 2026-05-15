---
summary: "CLI 參考，用於 `openclaw daemon`（閘道服務管理的舊版別名）"
read_when:
  - You still use `openclaw daemon ...` in scripts
  - You need service lifecycle commands (install/start/stop/restart/status)
title: "Daemon"
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
- `restart`：`--safe`、`--skip-deferral`、`--force`、`--wait <duration>`、`--json`
- lifecycle (`uninstall|start|stop`)：`--json`

備註：

- `status` 會在可行時為探測認證解析已設定的認證 SecretRefs。
- 如果在這個指令路徑中所需的認證 SecretRef 未被解析，當探測連線/認證失敗時，`daemon status --json` 會回報 `rpc.authWarning`；請明確傳遞 `--token`/`--password` 或先解析 secret 來源。
- 如果探測成功，會抑制未解析的 auth-ref 警告以避免誤報。
- `status --deep` 會新增一個盡力而為的系統層級服務掃描。當它發現其他類似 gateway 的服務時，人類可讀的輸出會列印清理提示，並警告每台機器一個 gateway 仍然是正常的建議。
- 在 Linux systemd 安裝中，`status` token-drift 檢查包含 `Environment=` 和 `EnvironmentFile=` unit 來源。
- Drift 檢查使用合併的執行時環境（優先使用服務指令環境，然後是程序環境備選）來解析 `gateway.auth.token` SecretRefs。
- 如果 token 認證未實際啟用（明確設定 `gateway.auth.mode` 為 `password`/`none`/`trusted-proxy`，或模式未設定且密碼可能優先而沒有 token 候選者可能優先），token-drift 檢查會跳過設定 token 解析。
- 當 token 認證需要 token 且 `gateway.auth.token` 是由 SecretRef 管理時，`install` 會驗證該 SecretRef 可被解析，但不會將解析後的 token 保存到服務環境元資料中。
- 如果 token 認證需要 token 且設定的 token SecretRef 未被解析，安裝將會失敗封閉。
- 如果同時設定了 `gateway.auth.token` 和 `gateway.auth.password` 且未設定 `gateway.auth.mode`，安裝將會被阻擋，直到模式被明確設定。
- 在 macOS 上，`install` 將 LaunchAgent plist 檔案保持僅限所有者存取，並透過僅限所有者的檔案和包裝器載入受管理的服務環境值，而不是將 API 金鑰或 auth-profile 環境參照序列化到 `EnvironmentVariables` 中。
- 如果您有意在一台主機上執行多個 gateway，請隔離連接埠、配置/狀態和工作區；請參閱 [/gateway#multiple-gateways-same-host](/zh-Hant/gateway#multiple-gateways-same-host)。
- `restart --safe` 會要求正在執行的 Gateway 對活動工作進行預檢，並在活動工作排空後排程一次合併重新啟動。單純的 `restart` 則保留現有的服務管理員行為；`--force` 仍然是立即覆寫路徑。
- `restart --safe --skip-deferral` 執行具備 OpenClaw 感知的安全重新啟動，但會繞過活動工作延遲閘門，因此即使回報有阻擋項目，Gateway 也會立即發出重新啟動指令。當卡住的任務執行造成安全重新啟動無法進行時，操作員可使用此逃生艙；需要 `--safe`。

## 建議改用

請使用 [`openclaw gateway`](/zh-Hant/cli/gateway) 以取得最新的文件和範例。

## 相關

- [CLI 參考資料](/zh-Hant/cli)
- [Gateway 手冊](/zh-Hant/gateway)
