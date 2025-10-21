# Flutter Focus Flow - 测试文档

## 目录
1. [概述](#概述)
2. [测试策略](#测试策略)
3. [单元测试规范](#单元测试规范)
4. [集成测试规范](#集成测试规范)
5. [验收标准](#验收标准)
6. [测试执行指南](#测试执行指南)

## 概述

本文档详细描述了Flutter Focus Flow应用的测试策略、规范和验收标准。它涵盖了单元测试、集成测试和端到端测试的完整测试方案。

## 测试策略

### 测试金字塔
```
        [E2E Tests] - 5-10%
           |
    [Integration Tests] - 15-20%
           |
     [Unit Tests] - 70-80%
```

### 测试层级
- **单元测试**: 测试单个函数、类或小部件
- **集成测试**: 测试多个组件之间的交互
- **端到端测试**: 测试用户工作流程

## 单元测试规范

### FocusState 模型测试

#### 测试用例: FocusState 构造函数
- **路径**: `lib/models/focus_state.dart`
- **输入**: 所有可能的构造参数
- **预期行为**:
  - 所有参数应正确初始化
  - 默认值应正确设置
  - 枚举值应符合预期

```dart
test('FocusState should initialize all properties correctly', () {
  const state = FocusState(
    timeInSeconds: 120,
    isActive: true,
    mode: FocusMode.work,
    uiState: FocusUiState.runningFocus,
    breakTotalDuration: 300,
    minWorkDuration: 1500,
    sessionPauseCount: 1,
    sessionTotalPausedTime: 10,
    sessionAdjustments: [TimeAdjustment(amount: 30, timestamp: DateTime.now())],
    longPressThreshold: 1000,
    earnedBreakSeconds: 24,
    isBreakUnlocked: true,
    timeAdjustment: null,
    deltaAdjustment: null,
    hasAppliedAdjustment: false,
  );

  expect(state.timeInSeconds, 120);
  expect(state.isActive, true);
  expect(state.mode, FocusMode.work);
  expect(state.uiState, FocusUiState.runningFocus);
  expect(state.earnedBreakSeconds, 24);
  expect(state.isBreakUnlocked, true);
});
```

#### 测试用例: copyWith 方法
- **路径**: `lib/models/focus_state.dart`
- **输入**: 各种属性的修改参数
- **预期行为**:
  - 未指定的属性应保持不变
  - 指定的属性应被更新
  - 新对象应与原对象不同

```dart
test('copyWith should create new instance with modified properties', () {
  const original = FocusState(
    timeInSeconds: 120,
    isActive: true,
    mode: FocusMode.work,
    uiState: FocusUiState.runningFocus,
    breakTotalDuration: 300,
    minWorkDuration: 1500,
    sessionPauseCount: 0,
    sessionTotalPausedTime: 0,
    sessionAdjustments: [],
    longPressThreshold: 1000,
    earnedBreakSeconds: 0,
    isBreakUnlocked: false,
    timeAdjustment: null,
    deltaAdjustment: null,
    hasAppliedAdjustment: false,
  );

  const modified = FocusState(
    timeInSeconds: 180,
    isActive: false,
    mode: FocusMode.rest,
    uiState: FocusUiState.idle,
    breakTotalDuration: 600,
    minWorkDuration: 1800,
    sessionPauseCount: 1,
    sessionTotalPausedTime: 5,
    sessionAdjustments: [TimeAdjustment(amount: 30, timestamp: DateTime.now())],
    longPressThreshold: 1500,
    earnedBreakSeconds: 36,
    isBreakUnlocked: true,
    timeAdjustment: 60,
    deltaAdjustment: 30,
    hasAppliedAdjustment: true,
  );

  final result = original.copyWith(
    timeInSeconds: modified.timeInSeconds,
    isActive: modified.isActive,
    mode: modified.mode,
    uiState: modified.uiState,
    breakTotalDuration: modified.breakTotalDuration,
    minWorkDuration: modified.minWorkDuration,
    sessionPauseCount: modified.sessionPauseCount,
    sessionTotalPausedTime: modified.sessionTotalPausedTime,
    sessionAdjustments: modified.sessionAdjustments,
    longPressThreshold: modified.longPressThreshold,
    earnedBreakSeconds: modified.earnedBreakSeconds,
    isBreakUnlocked: modified.isBreakUnlocked,
    timeAdjustment: modified.timeAdjustment,
    deltaAdjustment: modified.deltaAdjustment,
    hasAppliedAdjustment: modified.hasAppliedAdjustment,
  );

  expect(result.timeInSeconds, modified.timeInSeconds);
  expect(result.isActive, modified.isActive);
  expect(result.mode, modified.mode);
  expect(result.uiState, modified.uiState);
  expect(result, isNot(equals(original)));
});
```

### FocusService 核心功能测试

#### 测试用例: startFocus 方法
- **路径**: `lib/services/focus_service.dart`
- **前置条件**: 计时器未运行
- **输入**: 无
- **预期行为**:
  - 计时器开始运行
  - isActive 变为 true
  - UI 状态变为 runningFocus

```dart
test('startFocus should start the timer and update state', () {
  final service = FocusService();
  
  service.startFocus();
  
  expect(service.state.isActive, true);
  expect(service.state.uiState, FocusUiState.runningFocus);
  
  // 验证时间是否在增加
  int initialTime = service.state.timeInSeconds;
  // 模拟等待1秒
  service._updateState(timeInSeconds: initialTime + 1);
  
  expect(service.state.timeInSeconds, greaterThan(initialTime));
});
```

#### 测试用例: pauseFocus 方法
- **路径**: `lib/services/focus_service.dart`
- **前置条件**: 计时器正在运行
- **输入**: 无
- **预期行为**:
  - 计时器停止
  - isActive 变为 false
  - 保存当前状态到 previousState
  - UI 状态变为 adjusting

```dart
test('pauseFocus should pause timer and save state', () {
  final service = FocusService();
  
  // 首先启动专注
  service.startFocus();
  service._updateState(timeInSeconds: 300); // 设置5分钟
  
  // 暂停专注
  service.pauseFocus();
  
  expect(service.state.isActive, false);
  expect(service.state.uiState, FocusUiState.adjusting);
  expect(service.previousState, isNotNull);
  expect(service.previousState!.timeInSeconds, 300);
});
```

#### 测试用例: applyTimeAdjustment 方法
- **路径**: `lib/services/focus_service.dart`
- **前置条件**: 处于调整状态，有 delta 调整值
- **输入**: 无 (使用当前 deltaAdjustment)
- **预期行为**:
  - 时间调整被应用
  - deltaAdjustment 被清除
  - previousState 被设置
  - 计时器重新开始

```dart
test('applyTimeAdjustment should apply adjustment and restart timer', () {
  final service = FocusService();
  
  // 设置调整状态
  service._updateState(
    timeInSeconds: 600, // 10分钟
    uiState: FocusUiState.adjusting,
    deltaAdjustment: 120, // 调整+2分钟
  );
  
  int originalTime = service.state.timeInSeconds;
  service.applyTimeAdjustment();
  
  expect(service.state.timeInSeconds, originalTime + 120);
  expect(service.state.deltaAdjustment, null);
  expect(service.state.uiState, FocusUiState.runningFocus);
  expect(service.previousState, isNotNull);
  expect(service.state.isActive, true);
});
```

#### 测试用例: undo 方法
- **路径**: `lib/services/focus_service.dart`
- **前置条件**: previousState 不为 null
- **输入**: 无
- **预期行为**:
  - 恢复到 previousState
  - previousState 被清除
  - 计时器状态与恢复状态一致

```dart
test('undo should restore previous state', () {
  final service = FocusService();
  
  // 保存一个状态
  FocusState originalState = service.state;
  service._updateState(
    timeInSeconds: 600,
    isActive: true,
    mode: FocusMode.rest,
    uiState: FocusUiState.runningRest,
  );
  
  FocusState newState = service.state;
  service._previousState = originalState;
  
  // 执行撤销
  service.undo();
  
  expect(service.state.timeInSeconds, originalState.timeInSeconds);
  expect(service.state.isActive, originalState.isActive);
  expect(service.state.mode, originalState.mode);
  expect(service.state.uiState, originalState.uiState);
  expect(service._previousState, null);
});
```

### UI 组件测试

#### FocusView 测试

##### 测试用例: runningFocus 状态下的UI
- **路径**: `lib/views/focus_view.dart`
- **前置条件**: FocusService 处于 runningFocus 状态
- **输入**: 无
- **预期行为**:
  - 显示 "Focus Time" 标签
  - 显示 "Pause" 按钮
  - 显示 "Stop" 按钮

```dart
testWidgets('FocusView shows correct UI for runningFocus state', (WidgetTester tester) async {
  final service = FocusService();
  service._updateState(
    uiState: FocusUiState.runningFocus,
    timeInSeconds: 300, // 5分钟
    mode: FocusMode.work,
    isActive: true,
  );
  
  await tester.pumpWidget(
    MaterialApp(
      home: ChangeNotifierProvider.value(
        value: service,
        child: FocusView(),
      ),
    ),
  );
  
  expect(find.text('Focus Time'), findsOneWidget);
  expect(find.text('Pause'), findsOneWidget);
  expect(find.text('Stop'), findsOneWidget);
});
```

##### 测试用例: runningRest 状态下的UI
- **路径**: `lib/views/focus_view.dart`
- **前置条件**: FocusService 处于 runningRest 状态
- **输入**: 无
- **预期行为**:
  - 显示 "Rest Time" 标签
  - 显示 "Back to Focus" 按钮
  - 显示 "Skip & Focus" 按钮

```dart
testWidgets('FocusView shows correct UI for runningRest state', (WidgetTester tester) async {
  final service = FocusService();
  service._updateState(
    uiState: FocusUiState.runningRest,
    timeInSeconds: 300, // 5分钟剩余
    mode: FocusMode.rest,
    isActive: true,
  );
  
  await tester.pumpWidget(
    MaterialApp(
      home: ChangeNotifierProvider.value(
        value: service,
        child: FocusView(),
      ),
    ),
  );
  
  expect(find.text('Rest Time'), findsOneWidget);
  expect(find.text('Back to Focus'), findsOneWidget);
  expect(find.text('Skip & Focus'), findsOneWidget);
});
```

## 集成测试规范

### 完整工作流程测试

#### 测试用例: 专注到休息的完整流程
- **路径**: `lib/views/focus_view.dart` + `lib/services/focus_service.dart`
- **前置条件**: 应用处于初始状态
- **输入**: 用户执行完整的工作流程
- **预期行为**:
  - 从 idle 到 runningFocus 状态转换
  - 时间达到最小工作时间后状态变为 goalMet
  - 点击开始休息后状态变为 runningRest
  - 点击返回专注后状态回到 runningFocus

```dart
testWidgets('Complete focus to rest flow works correctly', (WidgetTester tester) async {
  final service = FocusService();
  
  await tester.pumpWidget(
    MaterialApp(
      home: ChangeNotifierProvider.value(
        value: service,
        child: FocusView(),
      ),
    ),
  );
  
  // 初始状态: idle
  expect(find.text('Set Goal'), findsOneWidget);
  expect(find.text('Start'), findsOneWidget);
  
  // 开始专注
  await tester.tap(find.text('Start'));
  await tester.pumpAndSettle();
  
  // 状态: runningFocus
  expect(service.state.uiState, FocusUiState.runningFocus);
  expect(find.text('Pause'), findsOneWidget);
  
  // 模拟时间达到最小工作要求
  service._updateState(
    timeInSeconds: service.state.minWorkDuration,
    uiState: FocusUiState.goalMet,
  );
  await tester.pump();
  
  // 状态: goalMet
  expect(find.text('Start Rest'), findsOneWidget);
  
  // 开始休息
  await tester.tap(find.text('Start Rest'));
  await tester.pumpAndSettle();
  
  // 状态: runningRest
  expect(service.state.uiState, FocusUiState.runningRest);
  expect(find.text('Back to Focus'), findsOneWidget);
  expect(find.text('Skip & Focus'), findsOneWidget);
  
  // 返回专注
  await tester.tap(find.text('Back to Focus'));
  await tester.pumpAndSettle();
  
  // 状态: runningFocus (回到专注)
  expect(service.state.uiState, FocusUiState.runningFocus);
  expect(find.text('Pause'), findsOneWidget);
});
```

#### 测试用例: 时间调整功能
- **路径**: `lib/views/focus_view.dart` + `lib/services/focus_service.dart`
- **前置条件**: 应用在专注或休息状态
- **输入**: 用户暂停并调整时间
- **预期行为**:
  - 暂停时进入调整模式
  - 调整时间按钮响应正确
  - 应用后时间正确更新
  - 撤销功能按预期工作

```dart
testWidgets('Time adjustment functionality works correctly', (WidgetTester tester) async {
  final service = FocusService();
  
  await tester.pumpWidget(
    MaterialApp(
      home: ChangeNotifierProvider.value(
        value: service,
        child: FocusView(),
      ),
    ),
  );
  
  // 开始专注
  service.startFocus();
  service._updateState(timeInSeconds: 300); // 5分钟
  await tester.pump();
  
  // 暂停专注 - 进入调整模式
  service.pauseFocus();
  await tester.pump();
  
  // 确认在调整模式
  expect(service.state.uiState, FocusUiState.adjusting);
  expect(find.byType(OutlinedButton), findsNWidgets(2)); // -30s 和 +30s 按钮
  
  // 记录原始时间
  int originalTime = service.state.timeInSeconds;
  int originalDelta = service.state.deltaAdjustment ?? 0;
  
  // 调整时间 +30s
  await tester.tap(find.text('+30s'));
  await tester.pump();
  
  // 验证 delta 时间已更新
  expect(service.state.deltaAdjustment, originalDelta + 30);
  
  // 应用调整
  await tester.tap(find.text('Apply'));
  await tester.pump();
  
  // 验证时间已应用
  expect(service.state.timeInSeconds, originalTime + 30);
  expect(service.state.deltaAdjustment, null);
  
  // 验证有历史状态可用于撤销
  expect(service.previousState, isNotNull);
  
  // 撤销
  await tester.tap(find.text('Undo'));
  await tester.pump();
  
  // 验证回到原始时间
  expect(service.state.timeInSeconds, originalTime);
  expect(service.previousState, null);
});
```

## 验收标准

### 功能性验收

#### 核心功能
- [ ] 专注计时功能
  - [ ] 计时器准确运行
  - [ ] 时间显示正确
  - [ ] 可以启动、暂停、重置
- [ ] 休息计时功能
  - [ ] 休息时间正确计算（每专注5分钟获得1分钟休息）
  - [ ] 休息时间可解锁
  - [ ] 休息模式切换正常
- [ ] 时间调整功能
  - [ ] 暂停时可以调整时间
  - [ ] 调整后应用正常
  - [ ] 支持撤销功能
- [ ] Undo 功能
  - [ ] 在应用调整后显示Undo按钮
  - [ ] 点击Undo恢复到之前状态
  - [ ] Undo操作有效

#### UI/UX功能
- [ ] 状态显示正确
  - [ ] 不同状态显示对应的UI
  - [ ] 时间显示格式正确 (MM:SS)
  - [ ] 状态转换流畅
- [ ] 按钮交互
  - [ ] 按钮响应及时
  - [ ] 按钮状态正确（启用/禁用）
  - [ ] 按钮标签准确
- [ ] 用户反馈
  - [ ] 操作有即时反馈
  - [ ] 状态变化有视觉提示

### 性能验收

#### 启动性能
- [ ] 应用启动时间 < 2秒
- [ ] UI渲染时间 < 100ms

#### 运行性能
- [ ] 计时器更新流畅（60fps）
- [ ] 状态切换无延迟
- [ ] 内存占用 < 100MB

#### 响应性
- [ ] 按钮点击响应 < 16ms
- [ ] 状态变更更新 < 16ms

### 兼容性验收

#### Flutter版本
- [ ] Flutter 3.16+ 兼容
- [ ] Dart 3.0+ 兼容

#### 平台兼容
- [ ] Android 6.0+
- [ ] iOS 12+
- [ ] Web (Chrome, Firefox, Safari)
- [ ] Windows
- [ ] macOS
- [ ] Linux

### 质量验收

#### 代码质量
- [ ] 单元测试覆盖率 > 85%
- [ ] 重要业务逻辑覆盖率 > 95%
- [ ] 无严重代码质量问题
- [ ] 遵循Flutter/Dart编码规范

#### 文档质量
- [ ] 所有公共API有文档注释
- [ ] 复杂逻辑有注释说明
- [ ] README文档完整

## 测试执行指南

### 1. 运行单元测试
```bash
flutter test
```

### 2. 运行特定测试文件
```bash
flutter test test/unit_test.dart
```

### 3. 运行集成测试
```bash
flutter test integration_test/app_test.dart
```

### 4. 运行覆盖率测试
```bash
flutter test --coverage
# 生成覆盖率报告
genhtml coverage/lcov.info -o coverage/html
```

### 5. 持续集成配置示例

#### GitHub Actions
```yaml
name: Flutter Test
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.16.0'
    - run: flutter pub get
    - run: flutter test
    - run: flutter test --coverage
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
```

### 6. 代码审查清单
- [ ] 所有测试通过
- [ ] 代码遵循项目编码规范
- [ ] 新功能有相应的单元测试
- [ ] 边界条件得到测试
- [ ] 错误处理得到测试
- [ ] 文档更新完成
- [ ] 注释清晰准确
- [ ] 性能要求满足