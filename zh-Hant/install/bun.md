---
summary: "Bun workflow (experimental): installs and gotchas vs pnpm"
read_when:
  - 您想要最快的本機開發迴圈 (bun + watch)
  - 您遇到了 Bun 安裝/修補/生命週期腳本問題
title: "Bun (Experimental)"
---

# Bun (experimental)

目標：使用 **Bun** 執行此儲存庫（可選，不推薦用於 WhatsApp/Telegram）
而不偏離 pnpm 的工作流程。

⚠️ **不推薦用於 Gateway 執行時**（WhatsApp/Telegram 有錯誤）。正式環境請使用 Node。

## 狀態

- Bun 是一個可選的本機執行時，用於直接執行 TypeScript (`bun run …`, `bun --watch …`)。
- `pnpm` 是建構的預設選項，且仍完全受支援（並被部分文件工具使用）。
- Bun 無法使用 `pnpm-lock.yaml`，並將會忽略它。

## 安裝

預設：

```sh
bun install
```

注意：`bun.lock`/`bun.lockb` 已被 git 忽略，因此無論如何都不會有儲存庫變動。如果您想要 _完全不寫入鎖定檔_：

```sh
bun install --no-save
```

## 建構 / 測試 (Bun)

```sh
bun run build
bun run vitest run
```

## Bun 生命週期腳本（預設封鎖）

除非明確信任，否則 Bun 可能會封鎖相依性的生命週期腳本 (`bun pm untrusted` / `bun pm trust`)。
對於此儲存庫，通常被封鎖的腳本並非必要：

- `@whiskeysockets/baileys` `preinstall`：檢查 Node 主版本 >= 20（OpenClaw 預設為 Node 24 且仍支援 Node 22 LTS，目前為 `22.16+`）。
- `protobufjs` `postinstall`：發出關於不相容版本方案的警告（無建構產物）。

如果您遇到需要這些腳本的實際執行時問題，請明確信任它們：

```sh
bun pm trust @whiskeysockets/baileys protobufjs
```

## 注意事項

- 部分腳本仍硬編碼為 pnpm（例如 `docs:build`, `ui:*`, `protocol:check`）。請暫時透過 pnpm 執行這些腳本。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
