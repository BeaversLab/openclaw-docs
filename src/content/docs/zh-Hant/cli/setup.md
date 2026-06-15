---
summary: "`openclaw setup` 的 CLI 參考（初始化設定檔與工作區，並選擇性地執行入門引導）"
read_when:
  - You're doing first-run setup without full CLI onboarding
  - You want to set the default workspace path
  - You need every flag and how setup decides between baseline and wizard mode
title: "設定"
---

# `openclaw setup`

初始化基準設定檔與代理程式工作區。如果出現任何入門引導旗標，也會執行精靈。

<Note>`openclaw setup` 適用於可變配置安裝。在 Nix 模式 (`OPENCLAW_NIX_MODE=1`) 下，OpenClaw 會拒絕設定寫入，因為配置檔案是由 Nix 管理的。請使用第一方 [nix-openclaw Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) 或其他 Nix 套件的對應原始碼配置。</Note>

## 選項

| 旗標                       | 描述                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | 代理程式工作區目錄（預設 `~/.openclaw/workspace`；儲存為 `agents.defaults.workspace`）。 |
| `--wizard`                 | 執行互動式入門引導。                                                                     |
| `--non-interactive`        | 不提示即執行入門引導。                                                                   |
| `--accept-risk`            | 確認全系統代理程式存取風險；與 `--non-interactive` 搭配使用時為必填。                    |
| `--mode <mode>`            | 入門模式：`local` 或 `remote`。                                                          |
| `--import-from <provider>` | 在入門期間執行的移轉提供者。                                                             |
| `--import-source <path>`   | `--import-from` 的來源代理程式家目錄。                                                   |
| `--import-secrets`         | 在入門移轉期間匯入支援的秘密。                                                           |
| `--remote-url <url>`       | 遠端閘道 WebSocket URL。                                                                 |
| `--remote-token <token>`   | 遠端閘道權杖 (選用)。                                                                    |

### 精靈自動觸發

當明確存在下列任何旗標時，`openclaw setup` 會執行精靈，即使沒有 `--wizard` 也是如此：

`--wizard`、`--non-interactive`、`--accept-risk`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`。

## 範例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 備註

- 單純的 `openclaw setup` 會初始化配置和工作區，而不會執行完整的入門流程。
- 在單純設定之後，執行 `openclaw onboard` 以取得完整的引導式旅程，執行 `openclaw configure` 以進行特定變更，或執行 `openclaw channels add` 以新增頻道帳戶。
- 如果偵測到 Hermes 狀態，互動式入門可以自動提供移轉。匯入入門需要全新的設定；請使用 [Migrate](/zh-Hant/cli/migrate) 在入門之外進行試執行計畫、備份和覆寫模式。

## 相關

- [CLI 參考](/zh-Hant/cli)
- [入門 (CLI)](/zh-Hant/start/wizard)
- [開始使用](/zh-Hant/start/getting-started)
- [安裝概覽](/zh-Hant/install)
