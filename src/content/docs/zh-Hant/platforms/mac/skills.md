---
summary: "macOS Skills 設定 UI 與閘道支援的狀態"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# Skills (macOS)

macOS 應用程式透過閘道顯示 OpenClaw 技能；它不會在本機解析技能。

## 資料來源

- `skills.status` (gateway) 會傳回所有技能以及資格與缺少的需求
  (包括捆綁技能的許可清單區塊)。
- 需求衍生自每個 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安裝動作

- `metadata.openclaw.install` 定義安裝選項 (brew/node/go/uv)。
- 應用程式會呼叫 `skills.install` 在閘道主機上執行安裝程式。
- 內建預設阻擋 `critical` 危險代碼 `skills.install` 發現；可疑發現仍僅發出警告。危險覆蓋選項存在於網關請求中，但預設的應用程式流程保持「故障時關閉」（fail-closed）。
- 如果每個安裝選項都是 `download`，閘道會顯示所有下載選項。
- 否則，閘道會根據目前的安裝偏好設定和主機二進位檔選擇一個首選安裝程式：首先在啟用 `skills.install.preferBrew` 且存在 `brew` 時優先選擇 Homebrew，然後是 `uv`，接著是 `skills.install.nodeManager` 中設定的節點管理器，最後是 `go` 或 `download` 等後備方案。
- 節點安裝標籤會反映設定的節點管理器，包括 `yarn`。

## Env/API 金鑰

- 應用程式將金鑰儲存在 `~/.openclaw/openclaw.json` 下的 `skills.entries.<skillKey>` 中。
- `skills.update` 會修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝與設定更新會在閘道主機上進行（而非本機 Mac）。
