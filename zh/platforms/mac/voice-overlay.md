---
summary: "唤醒词和按住说话重叠时的语音覆盖生命周期"
read_when:
  - Adjusting voice overlay behavior
title: "语音覆盖"
---

# 语音叠加层生命周期 (macOS)

受众：macOS 应用贡献者。目标：在唤醒词和按键通话重叠时保持语音叠加层的可预测性。

## 当前意图

- 如果叠加层已因唤醒词而显示，且用户按下热键，则热键会话将*采用*现有文本，而不是重置它。在按住热键时，叠加层保持显示。当用户释放时：如果有修剪后的文本则发送，否则关闭。
- 仅靠唤醒词仍会在静音时自动发送；按键通话会在释放时立即发送。

## 已实现 (2025年12月9日)

- 叠加层会话现在为每次捕获（唤醒词或按键通话）携带一个令牌。当令牌不匹配时，部分/最终/发送/关闭/电平更新会被丢弃，以避免过时的回调。
- 按键通话将任何可见的叠加层文本作为前缀采用（因此，当唤醒叠加层显示时按下热键会保留文本并追加新的语音）。它最多等待 1.5 秒以获取最终转录结果，然后再回退到当前文本。
- 提示音/覆盖日志在 `info` 发出，类别为 `voicewake.overlay`、`voicewake.ptt` 和 `voicewake.chime`（会话开始、部分、最终、发送、关闭、提示音原因）。

## 后续步骤

1. **VoiceSessionCoordinator (actor)**
   - 一次仅拥有一个 `VoiceSession`。
   - API（基于令牌）：`beginWakeCapture`、`beginPushToTalk`、`updatePartial`、`endCapture`、`cancel`、`applyCooldown`。
   - 丢弃携带过期令牌的回调（防止旧的识别器重新打开覆盖层）。
2. **VoiceSession (模型)**
   - 字段：`token`、`source` (wakeWord|pushToTalk)、已提交/易变文本、提示音标志、计时器（自动发送、空闲）、`overlayMode` (display|editing|sending)、冷却截止时间。
3. **覆盖层绑定**
   - `VoiceSessionPublisher` (`ObservableObject`) 将活动会话镜像到 SwiftUI。
   - `VoiceWakeOverlayView` 仅通过发布者进行渲染；它从不直接改变全局单例。
   - 覆盖层用户操作 (`sendNow`、`dismiss`、`edit`) 使用会话令牌回调协调器。
4. **统一发送路径**
   - 在 `endCapture` 上：如果去除首尾空格后的文本为空 → 解除；否则 `performSend(session:)`（播放一次发送提示音、转发、解除）。
   - 按住通话：无延迟；唤醒词：自动发送的可选延迟。
   - 在按住通话结束后，对唤醒运行时应用短暂的冷却，以免唤醒词立即再次触发。
5. **日志记录**
   - 协调器在子系统 `ai.openclaw` 和类别 `voicewake.overlay` 及 `voicewake.chime` 中发出 `.info` 日志。
   - 关键事件：`session_started`、`adopted_by_push_to_talk`、`partial`、`finalized`、`send`、`dismiss`、`cancel`、`cooldown`。

## 调试清单

- 在重现粘性覆盖层时流式传输日志：

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- 验证只有一个活动的会话令牌；过时的回调应该由协调器丢弃。
- 确保按住通话释放时总是使用活动令牌调用 `endCapture`；如果文本为空，则期望没有提示音或发送的 `dismiss`。

## 迁移步骤（建议）

1. 添加 `VoiceSessionCoordinator`、`VoiceSession` 和 `VoiceSessionPublisher`。
2. 重构 `VoiceWakeRuntime` 以创建/更新/结束会话，而不是直接操作 `VoiceWakeOverlayController`。
3. 重构 `VoicePushToTalk` 以采用现有会话并在释放时调用 `endCapture`；应用运行时冷却。
4. 将 `VoiceWakeOverlayController` 连接到发布器；移除来自运行时/PTT 的直接调用。
5. 添加针对会话采用、冷却和空文本关闭的集成测试。

import zh from "/components/footer/zh.mdx";

<zh />
