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
- 當提供多個安裝程式時，網關僅顯示一個首選安裝程式
  （可用時為 brew，否則為 `skills.install` 的 node 管理器，預設為 npm）。

## Env/API 金鑰

- 應用程式將金鑰儲存在 `~/.openclaw/openclaw.json` 下的 `skills.entries.<skillKey>` 中。
- `skills.update` 會修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝和配置更新會在網關主機上執行（而非在本機 Mac 上）。
