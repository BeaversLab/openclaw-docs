---
summary: "為 Codex 模式 OpenClaw 代理設定 Codex Computer Use"
title: "Codex Computer Use"
read_when:
  - You want Codex-mode OpenClaw agents to use Codex Computer Use
  - You are deciding between Codex Computer Use, PeekabooBridge, and direct cua-driver MCP
  - You are deciding between Codex Computer Use and a direct cua-driver MCP setup
  - You are configuring computerUse for the bundled Codex plugin
  - You are troubleshooting /codex computer-use status or install
---

Computer Use 是一個用於本機桌面控制的 Codex 原生 MCP 外掛。OpenClaw
並不提供桌面應用程式、不執行桌面操作本身，也不會繞過
Codex 權限。內建的 `codex` 外掛僅負責準備 Codex app-server：
它啟用 Codex 外掛支援、尋找或安裝已設定的 Codex
Computer Use 外掛、檢查 `computer-use` MCP 伺服器是否可用，
接著讓 Codex 在 Codex 模式回合中擁有原生的 MCP 工具呼叫。

當 OpenClaw 已經使用原生的 Codex harness 時，請使用此頁面。有關運行時設定本身，請參閱 [Codex harness](/zh-Hant/plugins/codex-harness)。

## OpenClaw.app 和 Peekaboo

OpenClaw.app 的 Peekaboo 整合與 Codex Computer Use 是分開的。
macOS 應用程式可以託管 PeekabooBridge socket，以便 `peekaboo` CLI 能重複使用
該應用程式的本機輔助功能和螢幕錄製權限，供 Peekaboo 自己的
自動化工具使用。該橋接器不會安裝或代理 Codex Computer Use，
且 Codex Computer Use 也不會透過 PeekabooBridge socket 進行呼叫。

當您希望 OpenClaw.app 成為 Peekaboo CLI 自動化的具權限感知的主機時，請使用 [Peekaboo bridge](/zh-Hant/platforms/mac/peekaboo)。當 Codex 模式的 OpenClaw 智慧體應該在回合開始前擁有 Codex 的原生 `computer-use` MCP 外掛程式可用時，請使用此頁面。

## iOS 應用程式

iOS 應用程式與 Codex Computer Use 是分開的。它不會安裝或代理
Codex `computer-use` MCP 伺服器，也不是桌面控制後端。
相反地，iOS 應用程式會作為 OpenClaw 節點連線，並透過節點指令（例如 `canvas.*`、`camera.*`、`screen.*`、
`location.*` 和 `talk.*`）公開行動裝置功能。

當您希望智慧體透過閘道驅動 iPhone 節點時，請使用 [iOS](/zh-Hant/platforms/ios)。當 Codex 模式的智慧體應該透過 Codex 的原生 Computer Use 外掛程式控制本機 macOS 桌面時，請使用此頁面。

## 直接 cua-driver MCP

Codex Computer Use 並非公開桌面控制的唯一方式。如果您希望由 OpenClaw 管理的執行環境直接呼叫 TryCua 的驅動程式，請透過 OpenClaw 的 MCP 登錄表使用上游 `cua-driver mcp` 伺服器，而不是使用 Codex 特定的市集流程。

安裝 `cua-driver` 後，可以向它詢問 OpenClaw 指令：

```bash
cua-driver mcp-config --client openclaw
```

或者自行註冊 stdio 伺服器：

```bash
openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
```

此路徑可保持上游 MCP 工具介面完整無缺，包括驅動程式綱要 (schemas) 和結構化的 MCP 回應。當您希望 CUA 驅動程式作為一般 OpenClaw MCP 伺服器使用時，請採用此方式。當 Codex app-server 應擁有外掛程式安裝、MCP 重新載入以及 Codex 模式回合中的原生工具呼叫時，請使用本頁的 Codex Computer Use 設定。

CUA 的驅動程式專屬於 macOS，且仍然需要其應用程式提示的本機 macOS 權限，例如輔助功能和螢幕錄製。OpenClaw 不會安裝 `cua-driver`、授予這些權限，或繞過上游驅動程式的安全模型。

## 快速設定

當 Codex 模式回合必須在對話開始前有 Computer Use 可用時，設定 `plugins.entries.codex.config.computerUse`。`autoInstall: true` 會啟用 Computer Use 並讓 OpenClaw 在回合前安裝或重新啟用它：

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          computerUse: {
            autoInstall: true,
          },
        },
      },
    },
  },
  agents: {
    defaults: {
      model: "openai/gpt-5.5",
    },
  },
}
```

使用此設定，OpenClaw 會在每次 Codex 模式回合之前檢查 Codex app-server。如果缺少 Computer Use 但 Codex app-server 已經發現可安裝的市集，OpenClaw 會要求 Codex app-server 安裝或重新啟用該外掛程式並重新載入 MCP 伺服器。在 macOS 上，當沒有註冊相符的市集且存在標準的 Codex app bundle 時，OpenClaw 也會嘗試從 `/Applications/Codex.app/Contents/Resources/plugins/openai-bundled` 註冊捆綁的 Codex 市集，然後才會失敗。如果設定仍然無法讓 MCP 伺服器可用，該回合將會在對話開始前失敗。

變更 Computer Use 設定後，在測試現有 Codex 對話是否已經開始之前，請在受影響的聊天中使用 `/new` 或 `/reset`。

## 指令

從任何提供 `codex` 外掛程式指令介面的聊天介面使用 `/codex computer-use` 指令。這些是 OpenClaw 聊天/執行時指令，而非 `openclaw codex ...` CLI 子指令：

```text
/codex computer-use status
/codex computer-use install
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
/codex computer-use install --marketplace <name>
```

`status` 是唯讀的。它不會新增市集來源、安裝外掛程式或啟用 Codex 外掛程式支援。如果沒有設定啟用 Computer Use，即使在一次性安裝指令之後，`status` 仍可能回報為已停用。

`install` 啟用 Codex 應用程式伺服器外掛程式支援，可選地新增已設定的 marketplace 來源，透過 Codex 應用程式伺服器安裝或重新啟用已設定的外掛程式，重新載入 MCP 伺服器，並驗證 MCP 伺服器是否公開工具。

## 市集選項

OpenClaw 使用與 Codex 本身公開的相同應用程式伺服器 API。Marketplace 欄位選擇 Codex 應在何處尋找 `computer-use`。

| 欄位                | 使用時機                                        | 安裝支援                                         |
| ------------------- | ----------------------------------------------- | ------------------------------------------------ |
| 無市集欄位          | 您希望 Codex app-server 使用它已知的市集。      | 是，當 app-server 傳回本地市集時。               |
| `marketplaceSource` | 您有一個 app-server 可以新增的 Codex 市集來源。 | 是的，針對明確的 `/codex computer-use install`。 |
| `marketplacePath`   | 您已經知道主機上的本地市集檔案路徑。            | 是，針對明確安裝和回合開始的自動安裝。           |
| `marketplaceName`   | 您想要依名稱選擇一個已註冊的市集。              | 僅當選取的市集具有本地路徑時為是。               |

全新的 Codex 主目錄可能需要片刻時間來植入其官方 marketplace。在安裝期間，OpenClaw 會輪詢 `plugin/list` 長達 `marketplaceDiscoveryTimeoutMs` 毫秒。預設值為 60 秒。

如果多個已知的 marketplace 包含 Computer Use，OpenClaw 會優先選擇 `openai-bundled`，然後是 `openai-curated`，接著是 `local`。未知的模糊匹配會以失敗封閉處理，並要求您設定 `marketplaceName` 或 `marketplacePath`。

## 隨附的 macOS 市集

最近的 Codex 桌面版本在此處隨附了 Computer Use：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled/plugins/computer-use
```

當 `computerUse.autoInstall` 為 true 且未註冊包含 `computer-use` 的 marketplace 時，OpenClaw 會嘗試自動新增標準的隨附 marketplace 根目錄：

```text
/Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

您也可以透過 Shell 使用 Codex 明確註冊它：

```bash
codex plugin marketplace add /Applications/Codex.app/Contents/Resources/plugins/openai-bundled
```

如果您使用非標準的 Codex 應用程式路徑，請執行 `/codex computer-use install
--source <marketplace-root>` once or set `computerUse.marketplacePath` 至本機 marketplace 檔案路徑。僅當您擁有 marketplace JSON 檔案路徑（而非隨附的 marketplace 根目錄）時，才使用 `--marketplace-path`。

## 遠端目錄限制

Codex 應用程式伺服器可以列出並讀取僅限遠端的目錄條目，但目前不支援遠端 `plugin/install`。這意味著 `marketplaceName` 可以選擇僅限遠端的 marketplace 進行狀態檢查，但安裝和重新啟用仍需要透過 `marketplaceSource` 或 `marketplacePath` 使用本機 marketplace。

如果狀態顯示外掛程式在遠端 Codex 市集中可用，但不支援遠端安裝，請使用來源或路徑執行安裝：

```text
/codex computer-use install --source <marketplace-source>
/codex computer-use install --marketplace-path <path>
```

## 設定參考

| 欄位                            | 預設值         | 含義                                                       |
| ------------------------------- | -------------- | ---------------------------------------------------------- |
| `enabled`                       | 推斷           | 需要電腦使用。當設定另一個電腦使用欄位時，預設為 true。    |
| `autoInstall`                   | false          | 在回合開始時從已發現的市集安裝或重新啟用。                 |
| `marketplaceDiscoveryTimeoutMs` | 60000          | 安裝等待 Codex 應用程式伺服器市集發現的時間。              |
| `marketplaceSource`             | 未設定         | 傳遞給 Codex 應用程式伺服器 `marketplace/add` 的來源字串。 |
| `marketplacePath`               | 未設定         | 包含該外掛程式的本地 Codex 市集檔案路徑。                  |
| `marketplaceName`               | 未設定         | 要選取的已註冊 Codex 市集名稱。                            |
| `pluginName`                    | `computer-use` | Codex 市集外掛程式名稱。                                   |
| `mcpServerName`                 | `computer-use` | 已安裝的外掛程式暴露的 MCP 伺服器名稱。                    |

回合開始的自動安裝會刻意拒絕已設定的 `marketplaceSource`
數值。新增來源是一項明確的設定操作，因此請使用
`/codex computer-use install --source <marketplace-source>` 一次，然後讓
`autoInstall` 處理後續從探索到的本機市集重新啟用的作業。
回合開始的自動安裝可以使用已設定的 `marketplacePath`，因為這
已經是主機上的本機路徑。

## OpenClaw 檢查的內容

OpenClaw 會在內部報告穩定的設定原因，並為聊天格式化使用者可見的狀態：

| 原因                         | 含義                                           | 下一步                                          |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `disabled`                   | `computerUse.enabled` 解析為 false。           | 設定 `enabled` 或其他 Computer Use 欄位。       |
| `marketplace_missing`        | 沒有可用的相符市集。                           | 設定來源、路徑或市集名稱。                      |
| `plugin_not_installed`       | 市集存在，但外掛尚未安裝。                     | 執行安裝或啟用 `autoInstall`。                  |
| `plugin_disabled`            | 外掛已安裝，但在 Codex 設定中已停用。          | 執行安裝以重新啟用它。                          |
| `remote_install_unsupported` | 選取的市集僅支援遠端。                         | 使用 `marketplaceSource` 或 `marketplacePath`。 |
| `mcp_missing`                | 外掛已啟用，但 MCP 伺服器無法使用。            | 檢查 Codex Computer Use 和作業系統權限。        |
| `ready`                      | 外掛和 MCP 工具均可使用。                      | 開始 Codex 模式回合。                           |
| `check_failed`               | 在狀態檢查期間，Codex 應用程式伺服器請求失敗。 | 檢查應用程式伺服器的連線和日誌。                |
| `auto_install_blocked`       | 回合開始設定需要新增新的來源。                 | 請先執行明確的安裝。                            |

聊天輸出包含外掛狀態、MCP 伺服器狀態、市集、可用的工具，以及失敗設定步驟的特定訊息。

## macOS 權限

Computer Use 是 macOS 專用的。Codex 擁有的 MCP 伺服器可能需要本機作業系統權限才能檢查或控制應用程式。如果 OpenClaw 顯示 Computer Use 已安裝但 MCP 伺服器無法使用，請先驗證 Codex 端的 Computer Use 設定：

- Codex 應用程式伺服器正在應進行桌面控制的相同主機上執行。
- Computer Use 外掛已在 Codex 設定中啟用。
- `computer-use` MCP 伺服器出現在 Codex app-server MCP 狀態中。
- macOS 已授予桌面控制應用程式所需的權限。
- 目前的主機工作階段可以存取受控的桌面。

當 `computerUse.enabled` 為 true 時，OpenClaw 會刻意以失敗收場。
在缺少設定所需的原生桌面工具的情況下，Codex 模式的回合不應靜默繼續執行。

## 疑難排解

**狀態顯示未安裝。** 執行 `/codex computer-use install`。如果
未探索到市集，請傳遞 `--source` 或 `--marketplace-path`。

**狀態顯示已安裝但已停用。** 再次執行 `/codex computer-use install`。
Codex app-server 安裝會將外掛程式設定寫回為已啟用狀態。

**Status says remote install is unsupported.** Use a local marketplace source or
path. Remote-only catalog entries can be inspected but not installed through the
current app-server API.

**Status says the MCP server is unavailable.** Re-run install once so MCP
servers reload. If it remains unavailable, fix the Codex Computer Use app,
Codex app-server MCP status, or macOS permissions.

**狀態或探查在 `computer-use.list_apps` 上逾時。** 外掛程式和 MCP
伺服器存在，但本機 Computer Use 橋接器沒有回應。請退出或
重新啟動 Codex Computer Use，如果需要請重新啟動 Codex Desktop，然後在新的
OpenClaw 工作階段中重試。

**Computer Use 工具回報 `Native hook relay unavailable`。** Codex 原生工具掛鉤無法透過本機橋接器或 Gateway 備援連線到有效的 OpenClaw 中繼。請使用 `/new` 或 `/reset` 啟動一個全新的 OpenClaw 工作階段。如果它成功運作一次，但在後續的工具呼叫中再次失敗，表示 `/new` 僅清除了當前的嘗試；請重新啟動 Codex app-server 或 OpenClaw Gateway，以捨棄舊的執行緒與掛鉤註冊，然後在新的工作階段中重試。

**回合開始的自動安裝拒絕了來源。** 這是預期的行為。請先使用明確的 `/codex computer-use install --source <marketplace-source>` 加入來源，之後回合開始的自動安裝即可使用探索到的本機市集。

## 相關

- [Codex harness](/zh-Hant/plugins/codex-harness)
- [Peekaboo bridge](/zh-Hant/platforms/mac/peekaboo)
- [iOS app](/zh-Hant/platforms/ios)
