import 'dart:async';
import 'package:flutter/foundation.dart';

// 定义UI状态，用于驱动界面显示
enum FocusUiState { idle, running, paused, goalMet, adjusting, restingRunning, restingPaused }

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
  
  // 获取格式化调整后的时间显示
  String get formattedAdjustedTime {
    final minutes = (adjustedTimeInSeconds / 60).floor();
    final seconds = adjustedTimeInSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }
  
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
    );
    notifyListeners();
  }

  void startFocus() {
    if (_state.isActive) return; // 如果已经在运行，则不执行操作

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

    _updateState(isActive: true, uiState: FocusUiState.running);
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

    _previousState = _state;
    _startUndoLifecycle();

    _timer?.cancel();
    _timer = null;
    _pauseStartTime = DateTime.now();
    _updateState(
      isActive: false,
      sessionPauseCount: _state.sessionPauseCount + 1,
      uiState: FocusUiState.paused, // 新增：更新UI状态为暂停
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
        uiState: FocusUiState.restingRunning, // 新增：更新UI状态为休息中
      );
      startFocus(); // 自动开始休息计时
    }
  }

  void pauseRest() {
    if (_state.uiState != FocusUiState.restingRunning) return;
    _timer?.cancel();
    _timer = null;
    _updateState(uiState: FocusUiState.restingPaused);
  }

  void resumeRest() {
    if (_state.uiState != FocusUiState.restingPaused) return;
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

  // 开始时间调整
  void beginTimeAdjustment() {
    if (_state.uiState != FocusUiState.paused) return; // 只能在暂停时调整
    _updateState(timeAdjustment: 0, uiState: FocusUiState.adjusting);
  }

  // 调整时间（在暂停时）
  void adjustTime(int seconds) {
    if (_state.timeAdjustment != null) {
      _updateState(timeAdjustment: _state.timeAdjustment! + seconds);
    }
  }

  // 应用时间调整并恢复计时
  void applyTimeAdjustment() {
    if (_state.timeAdjustment != null) {
      final adjustedTime = _state.timeInSeconds + _state.timeAdjustment!;
      final newEarnedBreakSeconds = (adjustedTime / 5).floor();
      final isBreakUnlocked = adjustedTime >= _state.minWorkDuration;
      
      _updateState(
        timeInSeconds: adjustedTime,
        timeAdjustment: null, // 清除临时调整
        earnedBreakSeconds: newEarnedBreakSeconds,
        isBreakUnlocked: isBreakUnlocked,
      );
    }
    startFocus(); // 应用后恢复计时
  }

  // 丢弃时间调整并恢复计时
  void discardTimeAdjustment() {
    _updateState(timeAdjustment: null);
    startFocus(); // 丢弃后恢复计时
  }

  // 高级休息：将当前时间调整到最小专注时间并立即开始休息
  void advancedBreak() {
    if (_state.uiState != FocusUiState.paused) return; // 只能在暂停时使用

    // 调整当前时间到最小专注时间
    final newEarnedBreakSeconds = (_state.minWorkDuration / 5).floor();
    _updateState(
      timeInSeconds: _state.minWorkDuration,
      timeAdjustment: null, // 清除任何临时调整
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
      _state = _previousState!;
      _previousState = null;
      _undoTimer?.cancel();
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