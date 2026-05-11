---
summary: "macOS Skills 設定 UI 與閘道支援的狀態"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

macOS 應用程式透過閘道顯示 OpenClaw 技能；它不會在本機解析技能。

## 資料來源

- `skills.status` (閘道) 會傳回所有技能以及資格與缺失需求
  (包括套件技能的允許清單區塊)。
- 需求是衍生自每個 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安裝動作

- `metadata.openclaw.install` 定義安裝選項 (brew/node/go/uv)。
- 應用程式會呼叫 `skills.install` 以在閘道主機上執行安裝程式。
- 內建危險程式碼 `critical` 的發現結果預設會封鎖 `skills.install`；可疑的發現結果仍僅會發出警告。危險覆寫存在於閘道請求中，但預設應用程式流程保持失效關閉 (fail-closed)。
- 如果每個安裝選項都是 `download`，閘道會顯示所有下載
  選項。
- 否則，閘道會使用目前的安裝偏好設定和主機二元檔選擇一個首選安裝程式：首先在
  `skills.install.preferBrew` 啟用且 `brew` 存在時使用 Homebrew，然後是 `uv`，然後是
  來自 `skills.install.nodeManager` 的已設定 node 管理員，之後是
  類似 `go` 或 `download` 的後備選項。
- Node 安裝標籤會反映已設定的 node 管理員，包括 `yarn`。

## Env/API 金鑰

- 應用程式會將金鑰儲存在 `skills.entries.<skillKey>` 下的 `~/.openclaw/openclaw.json` 中。
- `skills.update` 會修補 `enabled`、`apiKey` 和 `env`。

## 遠端模式

- 安裝和設定更新會在閘道主機上進行 (而非在本機 Mac 上)。

## 相關

- [技能](/zh-Hant/tools/skills)
- [macOS 應用程式](/zh-Hant/platforms/macos)
