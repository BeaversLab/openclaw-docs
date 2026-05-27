---
summary: "Bun 工作流程（實驗性）：安裝以及與 pnpm 的差異"
read_when:
  - You want the fastest local dev loop (bun + watch)
  - You hit Bun install/patch/lifecycle script issues
title: "Bun (實驗性)"
---

<Warning>Bun **不建議用於 gateway runtime** (已知 WhatsApp 和 Telegram 的問題)。生產環境請使用 Node。</Warning>

Bun 是一個可選的本機執行環境，用於直接執行 TypeScript (`bun run ...`, `bun --watch ...`)。預設的套件管理器維持為 `pnpm`，其受到完全支援並被文件工具所使用。Bun 無法使用 `pnpm-lock.yaml` 且會將其忽略。

## 安裝

<Steps>
  <Step title="安裝相依套件">
    ```sh
    bun install
    ```

    `bun.lock` / `bun.lockb` 已被 gitignore，因此不會造成 repo 變更。若要完全跳過 lockfile 寫入：

    ```sh
    bun install --no-save
    ```

  </Step>
  <Step title="建置與測試">
    ```sh
    bun run build
    bun run vitest run
    ```
  </Step>
</Steps>

## 生命週期腳本

除非明確信任，否則 Bun 會阻擋相依套件的生命週期腳本。對於此 repo，通常被阻擋的腳本並非必要：

- `baileys` `preinstall` -- 檢查 Node 主要版本 >= 20（OpenClaw 預設為 Node 24 且仍支援 Node 22 LTS，目前為 `22.19+`）
- `protobufjs` `postinstall` -- 針對不相容的版本機制發出警告 (無建構產物)

如果您遇到需要這些腳本的執行時期問題，請明確信任它們：

```sh
bun pm trust baileys protobufjs
```

## 注意事項

部分腳本仍然硬編碼使用 pnpm（例如 `check:docs`、`ui:*`、`protocol:check`）。請暫時透過 pnpm 執行這些腳本。

## 相關

- [安裝概覽](/zh-Hant/install)
- [Node.js](/zh-Hant/install/node)
- [更新](/zh-Hant/install/updating)
