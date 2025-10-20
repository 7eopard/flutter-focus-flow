import 'dart:async';
import 'package:flutter/foundation.dart';

// 定义计时器模式
enum TimerMode { work, rest }

// 干扰级别枚举
enum InterferenceLevel { zero, weak, strong }

// 定义计时器状态
class TimerState {
  final int timeInSeconds;
  final bool isActive;
  final TimerMode mode;
  final int breakTotalDuration;
  final int minWorkDuration; // 最小工作时长（秒）
  final int sessionPauseCount; // 会话暂停次数
  final int sessionTotalPausedTime; // 会话总暂停时间
  final List<TimeAdjustment> sessionAdjustments; // 会话调整记录
  final int longPressThreshold; // 长按阈值（毫秒）
  
  const TimerState({
    required this.timeInSeconds,
    required this.isActive,
    required this.mode,
    required this.breakTotalDuration,
    required this.minWorkDuration,
    required this.sessionPauseCount,
    required this.sessionTotalPausedTime,
    required this.sessionAdjustments,
    this.longPressThreshold = 1000, // 默认1秒长按阈值
  });
}

// 时间调整记录
class TimeAdjustment {
  final int amount;
  final DateTime timestamp;

  TimeAdjustment({required this.amount, required this.timestamp});
}

class TimerService extends ChangeNotifier {
  Timer? _timer;
  TimerState _state = const TimerState(
    timeInSeconds: 0,
    isActive: false,
    mode: TimerMode.work,
    breakTotalDuration: 0,
    minWorkDuration: 1500, // 默认25分钟=1500秒
    sessionPauseCount: 0,
    sessionTotalPausedTime: 0,
    sessionAdjustments: [],
    longPressThreshold: 1000,
  );

  // 记录开始时间
  DateTime? _sessionStartTime;
  DateTime? _pauseStartTime;

  TimerState get state => _state;

  // 获取格式化的时间显示
  String get formattedTime {
    final minutes = (_state.timeInSeconds / 60).floor();
    final seconds = _state.timeInSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  // 是否达到最小工作目标
  bool get isGoalReached => _state.timeInSeconds >= _state.minWorkDuration;

  // 休息时间（根据工作时间计算）
  int get earnedBreakDuration => (_state.timeInSeconds / 5).floor();

  void _updateState({
    int? timeInSeconds,
    bool? isActive,
    TimerMode? mode,
    int? breakTotalDuration,
    int? minWorkDuration,
    int? sessionPauseCount,
    int? sessionTotalPausedTime,
    List<TimeAdjustment>? sessionAdjustments,
    int? longPressThreshold,
  }) {
    _state = TimerState(
      timeInSeconds: timeInSeconds ?? _state.timeInSeconds,
      isActive: isActive ?? _state.isActive,
      mode: mode ?? _state.mode,
      breakTotalDuration: breakTotalDuration ?? _state.breakTotalDuration,
      minWorkDuration: minWorkDuration ?? _state.minWorkDuration,
      sessionPauseCount: sessionPauseCount ?? _state.sessionPauseCount,
      sessionTotalPausedTime: sessionTotalPausedTime ?? _state.sessionTotalPausedTime,
      sessionAdjustments: sessionAdjustments ?? _state.sessionAdjustments,
      longPressThreshold: longPressThreshold ?? _state.longPressThreshold,
    );
    notifyListeners();
  }

  void startTimer() {
    if (_state.isActive) return; // 如果已经在运行，则不执行操作

    // 如果是首次启动，记录开始时间
    if (_state.timeInSeconds == 0 && _state.mode == TimerMode.work) {
      _sessionStartTime = DateTime.now();
    }

    // 如果之前暂停过，计算暂停时间
    if (_pauseStartTime != null) {
      final pauseDuration = DateTime.now().difference(_pauseStartTime!).inSeconds;
      _updateState(sessionTotalPausedTime: _state.sessionTotalPausedTime + pauseDuration);
      _pauseStartTime = null;
    }

    _updateState(isActive: true);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_state.mode == TimerMode.work) {
        _updateState(timeInSeconds: _state.timeInSeconds + 1);
        
        // 检查是否达到最小工作目标
        if (_state.timeInSeconds >= _state.minWorkDuration && _state.mode == TimerMode.work) {
          // 可以在这里添加达到目标的反馈
        }
      } else if (_state.mode == TimerMode.rest) {
        if (_state.timeInSeconds > 0) {
          _updateState(timeInSeconds: _state.timeInSeconds - 1);
        } else {
          // 休息时间结束，自动切换回工作模式
          endBreak();
        }
      }
    });
  }

  void pauseTimer() {
    if (!_state.isActive) return; // 如果已经暂停，则不执行操作

    _timer?.cancel();
    _timer = null;
    _pauseStartTime = DateTime.now();
    _updateState(
      isActive: false,
      sessionPauseCount: _state.sessionPauseCount + 1,
    );
  }

  void toggleTimer() {
    if (_state.isActive) {
      pauseTimer();
    } else {
      startTimer();
    }
  }

  void resetTimer() {
    _timer?.cancel();
    _timer = null;
    _sessionStartTime = null;
    _pauseStartTime = null;
    _updateState(
      timeInSeconds: _state.mode == TimerMode.work ? 0 : _state.breakTotalDuration,
      isActive: false,
      sessionPauseCount: 0,
      sessionTotalPausedTime: 0,
      sessionAdjustments: [],
    );
  }

  void startBreak() {
    if (_state.mode == TimerMode.work && isGoalReached) {
      final breakDuration = earnedBreakDuration;
      _updateState(
        mode: TimerMode.rest,
        breakTotalDuration: breakDuration,
        timeInSeconds: breakDuration,
      );
      startTimer(); // 自动开始休息计时
    }
  }

  void endBreak() {
    _timer?.cancel();
    _timer = null;
    _sessionStartTime = null;
    _pauseStartTime = null;
    _updateState(
      mode: TimerMode.work,
      timeInSeconds: 0,
      isActive: false,
      breakTotalDuration: 0,
      sessionPauseCount: 0,
      sessionTotalPausedTime: 0,
      sessionAdjustments: [],
    );
  }

  void setGoal(int seconds) {
    _updateState(minWorkDuration: seconds);
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

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}