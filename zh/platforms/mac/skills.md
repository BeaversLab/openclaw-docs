---
summary: "macOS 技能设置 UI 和 gateway 支持的状态"
read_when:
  - "更新 macOS 技能设置 UI"
  - "更改技能门槛或安装行为"
title: "技能"
---

# 技能（macOS）

macOS 应用通过 gateway 暴露 OpenClaw 技能；它不在本地解析技能。

## 数据来源

- `skills.status`（gateway）返回所有技能以及资格和缺失需求
  （包括内置技能的允许列表阻止）。
- 需求来自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 %%P5%% 在 gateway 主机上运行安装程序。
- 当提供多个安装程序时，gateway 只显示一个首选安装程序
  （可用时优先 brew，否则来自 %%P6%% 的 node 管理器，默认 npm）。

## 环境变量/API 密钥

- 应用将密钥存储在 %%P7%% 下的 %%P8%% 中。
- %%P9%% 修补 %%P10%%、%%P11%% 和 %%P12%%。

## 远程模式

- 安装 + 配置更新发生在 gateway 主机上（而非本地 Mac）。
