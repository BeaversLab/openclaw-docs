---
title: "發布策略"
summary: "公開發布管道、版本命名和發布節奏"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 發布策略

OpenClaw 有三個公開發布管道：

- stable：發布至 npm `latest` 的標記版本
- beta：發布至 npm `beta` 的預發布標記
- dev：`main` 的移動指標

## 版本命名

- 穩定發布版本：`YYYY.M.D`
  - Git 標籤：`vYYYY.M.D`
- Beta 預發布版本：`YYYY.M.D-beta.N`
  - Git 標籤：`vYYYY.M.D-beta.N`
- 不要將月份或日期補零
- `latest` 指的是目前的穩定 npm 發布版本
- `beta` 指的是目前的預發布 npm 版本
- Beta 版本可能會在 macOS 應用程式追趕上來之前發布

## 發布節奏

- 發布採取 beta 優先
- 只有在最新的 beta 版本驗證通過後才會發布穩定版
- 詳細的發布程序、核准、憑證和恢復說明僅限維護者查看

## 公開參考資料

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

維護者使用[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)中的私有發布文件
作為實際的操作手冊。

import footerZhHant from "/components/footer/zh-Hant.mdx";

<footerZhHant />
