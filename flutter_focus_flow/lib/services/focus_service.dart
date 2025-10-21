import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:meta/meta.dart';

// 定义UI状态，用于驱动界面显示
enum FocusUiState { idle, runningFocus, runningRest, pausedFocus, pausedRest, adjusting, goalMet }

// 定义计时器模式
enum FocusMode { work, rest }

// 干扰级别枚举
enum InterferenceLevel { zero, weak, strong }

// 定义计时器状态
class FocusState {
  final int timeInSeconds;
  final bool isActive;
  final FocusMode mode;
  final FocusUiState uiState; // 新增UI状态字段
  final int breakTotalDuration;
  final int minWorkDuration; // 最小工作时长（秒）
  final int sessionPauseCount; // 会话暂停次数
  final int sessionTotalPausedTime; // 会话总暂停时间
  final List<TimeAdjustment> sessionAdjustments; // 会话调整记录
  final int longPressThreshold; // 长按阈值（毫秒）
  final int earnedBreakSeconds; // 积累的可休息时间（秒）
  final bool isBreakUnlocked; // 休息是否已解锁
  final int? timeAdjustment; // 临时时间调整值（秒），null表示无调整
  final int? deltaAdjustment; // Delta时间调整值（秒），用于显示调整变化，null表示无调整
  final bool hasAppliedAdjustment; // 是否应用了时间调整
  
  const FocusState({
    required this.timeInSeconds,
    required this.isActive,
    required this.mode,
    this.uiState = FocusUiState.idle, // 设置默认值
    required this.breakTotalDuration,
    required this.minWorkDuration,
    required this.sessionPauseCount,
    required this.sessionTotalPausedTime,
    required this.sessionAdjustments,
    this.longPressThreshold = 1000, // 默认1秒长按阈值
    this.earnedBreakSeconds = 0,
    this.isBreakUnlocked = false,
    this.timeAdjustment,
    this.deltaAdjustment,
    this.hasAppliedAdjustment = false,
  });

  FocusState copyWith({
    int? timeInSeconds,
    bool? isActive,
    FocusMode? mode,
    FocusUiState? uiState,
    int? breakTotalDuration,
    int? minWorkDuration,
    int? sessionPauseCount,
    int? sessionTotalPausedTime,
    List<TimeAdjustment>? sessionAdjustments,
    int? longPressThreshold,
    int? earnedBreakSeconds,
    bool? isBreakUnlocked,
    int? timeAdjustment,
    int? deltaAdjustment,
    bool? hasAppliedAdjustment,
  }) {
    return FocusState(
      timeInSeconds: timeInSeconds ?? this.timeInSeconds,
      isActive: isActive ?? this.isActive,
      mode: mode ?? this.mode,
      uiState: uiState ?? this.uiState,
      breakTotalDuration: breakTotalDuration ?? this.breakTotalDuration,
      minWorkDuration: minWorkDuration ?? this.minWorkDuration,
      sessionPauseCount: sessionPauseCount ?? this.sessionPauseCount,
      sessionTotalPausedTime: sessionTotalPausedTime ?? this.sessionTotalPausedTime,
      sessionAdjustments: sessionAdjustments ?? this.sessionAdjustments,
      longPressThreshold: longPressThreshold ?? this.longPressThreshold,
      earnedBreakSeconds: earnedBreakSeconds ?? this.earnedBreakSeconds,
      isBreakUnlocked: isBreakUnlocked ?? this.isBreakUnlocked,
      timeAdjustment: timeAdjustment ?? this.timeAdjustment,
      deltaAdjustment: deltaAdjustment ?? this.deltaAdjustment,
      hasAppliedAdjustment: hasAppliedAdjustment ?? this.hasAppliedAdjustment,
    );
  }
}

// 时间调整记录
class TimeAdjustment {
  final int amount;
  final DateTime timestamp;

  TimeAdjustment({required this.amount, required this.timestamp});
}

class FocusService extends ChangeNotifier {
  Timer? _timer;
  FocusState? _previousState;
  Timer? _undoTimer;
  FocusState? get previousState => _previousState;

  FocusState _state = const FocusState(
    timeInSeconds: 0,
    isActive: false,
    mode: FocusMode.work,
    breakTotalDuration: 0,
    minWorkDuration: 1500, // 默认25分钟=1500秒
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

  // 记录开始时间
  DateTime? _sessionStartTime;
  DateTime? _pauseStartTime;

  FocusState get state => _state;

  // 获取格式化的时间显示
  String get formattedTime {
    final minutes = (_state.timeInSeconds / 60).floor();
    final seconds = _state.timeInSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  // 是否达到最小工作目标
  bool get isGoalReached => _state.timeInSeconds >= _state.minWorkDuration;

  // 积累的休息时间（每专注5分钟获得1分钟休息时间）
  int get earnedBreakSeconds => (_state.timeInSeconds / 5).floor();
  
  // 休息是否已解锁（达到最小专注时间后解锁）
  bool get isBreakUnlocked => _state.timeInSeconds >= _state.minWorkDuration;
  
  // 获取当前调整后的时间
  int get adjustedTimeInSeconds {
    if (_state.timeAdjustment != null) {
      return _state.timeInSeconds + _state.timeAdjustment!;
    }
    return _state.timeInSeconds;
  }
  
  // 获取格式化调整后的时间显示（包含delta调整）
  String get formattedAdjustedTime {
    final adjustedTime = _state.timeAdjustment != null 
        ? _state.timeInSeconds + _state.timeAdjustment! 
        : _state.timeInSeconds;
    final minutes = (adjustedTime / 60).floor();
    final seconds = adjustedTime % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  
  // 获取格式化的delta时间显示
  String get formattedDeltaAdjustment {
    if (_state.deltaAdjustment == null) {
      return '${(_state.timeInSeconds / 60).floor().toString().padLeft(2, '0')}:${(_state.timeInSeconds % 60).toString().padLeft(2, '0')}';
    }
    final adjustedTime = _state.timeInSeconds + _state.deltaAdjustment!;
    final minutes = (adjustedTime / 60).floor();
    final seconds = adjustedTime % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  
  // 获取delta时间调整
  int get deltaAdjustmentInSeconds {
    if (_state.deltaAdjustment != null) {
      return _state.deltaAdjustment!;
    }
    return 0;
  }
  
  // 之前的状态是否应用了调整
  bool get hasAppliedAdjustment => _state.hasAppliedAdjustment;
  
  // 检查调整后是否达到最小工作目标
  bool get isAdjustedGoalReached => adjustedTimeInSeconds >= _state.minWorkDuration;

  void _updateState({
    int? timeInSeconds,
    bool? isActive,
    FocusMode? mode,
    FocusUiState? uiState, // 新增uiState参数
    int? breakTotalDuration,
    int? minWorkDuration,
    int? sessionPauseCount,
    int? sessionTotalPausedTime,
    List<TimeAdjustment>? sessionAdjustments,
    int? longPressThreshold,
    int? earnedBreakSeconds,
    bool? isBreakUnlocked,
    int? timeAdjustment,
    int? deltaAdjustment,
    bool? hasAppliedAdjustment,
  }) {
    _state = FocusState(
      timeInSeconds: timeInSeconds ?? _state.timeInSeconds,
      isActive: isActive ?? _state.isActive,
      mode: mode ?? _state.mode,
      uiState: uiState ?? _state.uiState, // 更新uiState
      breakTotalDuration: breakTotalDuration ?? _state.breakTotalDuration,
      minWorkDuration: minWorkDuration ?? _state.minWorkDuration,
      sessionPauseCount: sessionPauseCount ?? _state.sessionPauseCount,
      sessionTotalPausedTime: sessionTotalPausedTime ?? _state.sessionTotalPausedTime,
      sessionAdjustments: sessionAdjustments ?? _state.sessionAdjustments,
      longPressThreshold: longPressThreshold ?? _state.longPressThreshold,
      earnedBreakSeconds: earnedBreakSeconds ?? _state.earnedBreakSeconds,
      isBreakUnlocked: isBreakUnlocked ?? _state.isBreakUnlocked,
      timeAdjustment: timeAdjustment ?? _state.timeAdjustment,
      deltaAdjustment: deltaAdjustment ?? _state.deltaAdjustment,
      hasAppliedAdjustment: hasAppliedAdjustment ?? _state.hasAppliedAdjustment,
    );
    notifyListeners();
  }

  // 公开的测试辅助方法，用于测试目的
  @visibleForTesting
  void updateStateForTesting({
    int? timeInSeconds,
    bool? isActive,
    FocusMode? mode,
    FocusUiState? uiState,
    int? breakTotalDuration,
    int? minWorkDuration,
    int? sessionPauseCount,
    int? sessionTotalPausedTime,
    List<TimeAdjustment>? sessionAdjustments,
    int? longPressThreshold,
    int? earnedBreakSeconds,
    bool? isBreakUnlocked,
    int? timeAdjustment,
    int? deltaAdjustment,
    bool? hasAppliedAdjustment,
  }) {
    _updateState(
      timeInSeconds: timeInSeconds,
      isActive: isActive,
      mode: mode,
      uiState: uiState,
      breakTotalDuration: breakTotalDuration,
      minWorkDuration: minWorkDuration,
      sessionPauseCount: sessionPauseCount,
      sessionTotalPausedTime: sessionTotalPausedTime,
      sessionAdjustments: sessionAdjustments,
      longPressThreshold: longPressThreshold,
      earnedBreakSeconds: earnedBreakSeconds,
      isBreakUnlocked: isBreakUnlocked,
      timeAdjustment: timeAdjustment,
      deltaAdjustment: deltaAdjustment,
      hasAppliedAdjustment: hasAppliedAdjustment,
    );
  }
  
  @visibleForTesting
  set previousStateForTesting(FocusState? state) {
    _previousState = state;
  }
  
  @visibleForTesting
  FocusState? get previousStateForTesting => _previousState;

  void startFocus() {
    // 如果已经在运行，先取消当前计时器，避免多个计时器实例
    if (_state.isActive) {
      _timer?.cancel();
    }

    // 如果是首次启动，记录开始时间
    if (_state.timeInSeconds == 0 && _state.mode == FocusMode.work) {
      _sessionStartTime = DateTime.now();
    }

    // 如果之前暂停过，计算暂停时间
    if (_pauseStartTime != null) {
      final pauseDuration = DateTime.now().difference(_pauseStartTime!).inSeconds;
      _updateState(sessionTotalPausedTime: _state.sessionTotalPausedTime + pauseDuration);
      _pauseStartTime = null;
    }

    _updateState(isActive: true, uiState: FocusUiState.runningFocus);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_state.mode == FocusMode.work) {
        final newTime = _state.timeInSeconds + 1;
        final newEarnedBreakSeconds = (newTime / 5).floor();
        final newIsBreakUnlocked = newTime >= _state.minWorkDuration;
        
        _updateState(
          timeInSeconds: newTime,
          earnedBreakSeconds: newEarnedBreakSeconds,
          isBreakUnlocked: newIsBreakUnlocked,
        );
        
        // 检查是否达到最小工作目标
        if (newTime >= _state.minWorkDuration && _state.uiState != FocusUiState.goalMet) {
          _updateState(uiState: FocusUiState.goalMet);
        }
      } else if (_state.mode == FocusMode.rest) {
        if (_state.timeInSeconds > 0) {
          _updateState(timeInSeconds: _state.timeInSeconds - 1);
        } else {
          // 休息时间结束，自动切换回工作模式
          endBreak();
        }
      }
    });
  }

  void pauseFocus() {
    if (!_state.isActive) return; // 如果已经暂停，则不执行操作

    // 在暂停前保存当前状态，以便undo可以恢复到暂停前的运行状态
    _previousState = _state;
    _startUndoLifecycle();

    _timer?.cancel();
    _timer = null;
    _pauseStartTime = DateTime.now();
    _updateState(
      isActive: false,
      sessionPauseCount: _state.sessionPauseCount + 1,
      uiState: FocusUiState.adjusting, // 直接进入调整状态
      deltaAdjustment: 0, // 初始化delta调整值
    );
  }

  void toggleFocus() {
    if (_state.isActive) {
      pauseFocus();
    } else {
      startFocus();
    }
  }

  void resetFocus() {
    _timer?.cancel();
    _timer = null;
    _sessionStartTime = null;
    _pauseStartTime = null;
    _updateState(
      timeInSeconds: _state.mode == FocusMode.work ? 0 : _state.breakTotalDuration,
      isActive: false,
      earnedBreakSeconds: 0,
      isBreakUnlocked: false,
      timeAdjustment: null,
      sessionPauseCount: 0,
      sessionTotalPausedTime: 0,
      sessionAdjustments: [],
      uiState: FocusUiState.idle, // 新增：更新UI状态为初始
    );
  }

  void startBreak() {
    if (_state.mode == FocusMode.work && _state.isBreakUnlocked) {
      // 如果有临时调整，先应用调整
      if (_state.timeAdjustment != null) {
        applyTimeAdjustment();
      }
      
      final breakDuration = _state.earnedBreakSeconds;
      _updateState(
        mode: FocusMode.rest,
        breakTotalDuration: breakDuration,
        timeInSeconds: breakDuration,
        uiState: FocusUiState.runningRest, // 新增：更新UI状态为休息中
      );
      startFocus(); // 自动开始休息计时
    }
  }

  void pauseRest() {
    if (_state.uiState != FocusUiState.runningRest) return;
    _timer?.cancel();
    _timer = null;
    _updateState(
      uiState: FocusUiState.pausedRest, // 进入暂停休息状态，而不是调整状态
      isActive: false,
    );
  }

  void resumeRest() {
    if (_state.uiState != FocusUiState.pausedRest) return;
    _updateState(
      uiState: FocusUiState.runningRest, // 恢复到运行休息状态
      isActive: true,
    );
    startFocus(); // 继续倒计时
  }

  void startNextFocusSession() {
    endBreak();
    startFocus();
  }

  void endBreak() {
    _timer?.cancel();
    _timer = null;
    _sessionStartTime = null;
    _pauseStartTime = null;
    _updateState(
      mode: FocusMode.work,
      timeInSeconds: 0,
      isActive: false,
      breakTotalDuration: 0,
      earnedBreakSeconds: 0,
      isBreakUnlocked: false,
      timeAdjustment: null,
      sessionPauseCount: 0,
      sessionTotalPausedTime: 0,
      sessionAdjustments: [],
      uiState: FocusUiState.idle, // 新增：更新UI状态为初始
    );
  }

  // 设置最小专注时间（在设置页面使用）
  void setMinFocusTime(int seconds) {
    _updateState(minWorkDuration: seconds);
  }

  // 开始时间调整 - 现在不再需要此方法，因为暂停后直接进入调整模式
  // 保留此方法是为了与UI层保持兼容性，但实际已不需要
  void beginTimeAdjustment() {
    if (_state.uiState != FocusUiState.adjusting) return; // 只能在调整时调整
    _updateState(deltaAdjustment: 0);
  }

  // 调整时间（在暂停时）
  void adjustTime(int seconds) {
    if (_state.deltaAdjustment != null) {
      final newDelta = _state.deltaAdjustment! + seconds;
      _updateState(deltaAdjustment: newDelta);
    }
  }

  // 应用时间调整并恢复计时
  void applyTimeAdjustment() {
    if (_state.deltaAdjustment != null) {
      // 使用deltaAdjustment来调整时间
      final adjustedTime = _state.timeInSeconds + _state.deltaAdjustment!;
      final newEarnedBreakSeconds = (adjustedTime / 5).floor();
      final isBreakUnlocked = adjustedTime >= _state.minWorkDuration;
      
      // 在应用调整前保存当前状态，以便提供撤销功能
      _previousState = _state;
      _startUndoLifecycle();

      _updateState(
        timeInSeconds: adjustedTime,
        timeAdjustment: null, // 清除临时调整
        deltaAdjustment: null, // 清除delta调整
        earnedBreakSeconds: newEarnedBreakSeconds,
        isBreakUnlocked: isBreakUnlocked,
        hasAppliedAdjustment: _state.deltaAdjustment != 0, // 设置已应用调整标志
      );
    }
    startFocus(); // 应用后恢复计时
  }

  // 丢弃时间调整并恢复计时
  void discardTimeAdjustment() {
    _updateState(
      timeAdjustment: null, // 清除临时调整
      deltaAdjustment: null, // 清除delta调整
      hasAppliedAdjustment: false, // 重置已应用调整标志
    );
    startFocus(); // 丢弃后恢复计时
  }

  // 高级休息：将当前时间调整到最小专注时间并立即开始休息
  void advancedBreak() {
    if (_state.uiState != FocusUiState.adjusting || _state.mode != FocusMode.work) return; // 只能在调整专注时使用

    // 在执行前保存当前状态，以便undo可以使用
    _previousState = _state;
    _startUndoLifecycle();

    // 调整当前时间到最小专注时间
    final newEarnedBreakSeconds = (_state.minWorkDuration / 5).floor();
    _updateState(
      timeInSeconds: _state.minWorkDuration,
      timeAdjustment: null, // 清除任何临时调整
      deltaAdjustment: null, // 清除任何delta调整
      earnedBreakSeconds: newEarnedBreakSeconds,
      isBreakUnlocked: true,
    );
    
    // 立即开始休息
    startBreak();
  }

  void setTime(int seconds) {
    _updateState(timeInSeconds: seconds);
  }

  // 记录时间调整
  void recordAdjustment(int amount) {
    if (amount == 0) return;
    final newAdjustments = List<TimeAdjustment>.from(_state.sessionAdjustments);
    newAdjustments.add(TimeAdjustment(amount: amount, timestamp: DateTime.now()));
    _updateState(sessionAdjustments: newAdjustments);
  }

  // 获取会话统计数据
  int get sessionActualDuration {
    if (_sessionStartTime == null) return 0;
    final totalDuration = DateTime.now().difference(_sessionStartTime!).inSeconds;
    return totalDuration - _state.sessionTotalPausedTime;
  }

  // 撤销上一步操作
  void undo() {
    if (_previousState != null) {
      // 如果之前的状态是激活的，需要重新启动计时器
      final wasActive = _previousState!.isActive;
      
      _updateState(
        timeInSeconds: _previousState!.timeInSeconds,
        isActive: _previousState!.isActive,
        mode: _previousState!.mode,
        uiState: _previousState!.uiState,
        breakTotalDuration: _previousState!.breakTotalDuration,
        minWorkDuration: _previousState!.minWorkDuration,
        sessionPauseCount: _previousState!.sessionPauseCount,
        sessionTotalPausedTime: _previousState!.sessionTotalPausedTime,
        sessionAdjustments: _previousState!.sessionAdjustments,
        longPressThreshold: _previousState!.longPressThreshold,
        earnedBreakSeconds: _previousState!.earnedBreakSeconds,
        isBreakUnlocked: _previousState!.isBreakUnlocked,
        timeAdjustment: _previousState!.timeAdjustment,
        deltaAdjustment: _previousState!.deltaAdjustment,
        hasAppliedAdjustment: false, // 重置已应用调整标志
      );
      
      _previousState = null;
      _undoTimer?.cancel();
      
      if (wasActive) {
        // 恢复计时器状态 - 重新启动计时器
        startFocus();
      } else {
        // 如果之前是暂停的，确保计时器已停止
        _timer?.cancel();
        _timer = null;
      }
      
      notifyListeners();
    }
  }

  // 启动撤销计时器
  void _startUndoLifecycle() {
    _undoTimer?.cancel();
    _undoTimer = Timer(const Duration(seconds: 10), () {
      _previousState = null;
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _undoTimer?.cancel();
    super.dispose();
  }
}