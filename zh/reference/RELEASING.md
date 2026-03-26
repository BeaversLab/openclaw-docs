---
title: "发布策略"
summary: "公共发布渠道、版本命名和发布节奏"
read_when:
  - Looking for public release channel definitions
  - Looking for version naming and cadence
---

# 发布策略

OpenClaw 拥有三个公共发布渠道：

- stable（稳定版）：发布到 npm `latest` 的带标签版本
- beta（测试版）：发布到 npm `beta` 的预发布标签
- dev（开发版）：`main` 的动态头部

## 版本命名

- 稳定版版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 不要对月份或日期进行零填充（zero-pad）
- `latest` 表示当前的稳定 npm 版本
- `beta` 表示当前的预发布 npm 版本
- Beta 版本的发布可能会先于 macOS 应用程序的更新

## 发布节奏

- 版本优先在 Beta 渠道发布
- 稳定版仅在最新的 Beta 版本通过验证后发布
- 详细的发布程序、审批、凭据和恢复说明仅限维护者查看

## 公开参考

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

维护者使用
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
中的私有发布文档作为实际的操作手册。

import zh from "/components/footer/zh.mdx";

<zh />
