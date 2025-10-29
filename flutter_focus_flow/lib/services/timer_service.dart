import 'dart:async';
import 'package:flutter/foundation.dart';

// 定义UI状态，用于驱动界面显示
enum FocusUiState { idle, runningFocus, runningRest, pausedFocus, pausedRest, adjusting, goalMet }

// 定义计时器模式
enum FocusMode { work, rest }

// 显示模式枚举
enum DisplayMode { countdown, countup }

// 定义一个哨兵对象，用于区分“未提供”和“提供null”
const _sentinel = Object();

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
  final DisplayMode displayMode; // 显示模式（倒计时/正计时）
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
    this.displayMode = DisplayMode.countdown, // 默认倒计时模式
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
    DisplayMode? displayMode,
    dynamic timeAdjustment = _sentinel,
    dynamic deltaAdjustment = _sentinel,
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
      displayMode: displayMode ?? this.displayMode,
      timeAdjustment: timeAdjustment == _sentinel ? this.timeAdjustment : timeAdjustment as int?,
      deltaAdjustment: deltaAdjustment == _sentinel ? this.deltaAdjustment : deltaAdjustment as int?,
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

class TimerService extends ChangeNotifier {
  Timer? _timer;
  int _millisecondCounter = 0;

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

  FocusState get state => _state;

  void _updateState({
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
    DisplayMode? displayMode,
    dynamic timeAdjustment = _sentinel,
    dynamic deltaAdjustment = _sentinel,
    bool? hasAppliedAdjustment,
  }) {
    _state = _state.copyWith(
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
      displayMode: displayMode,
      timeAdjustment: timeAdjustment,
      deltaAdjustment: deltaAdjustment,
      hasAppliedAdjustment: hasAppliedAdjustment,
    );
    notifyListeners();
  }

  void startTimer() {
    if (_state.isActive) {
      _timer?.cancel();
    }

    _updateState(isActive: true);
    
    _timer = Timer.periodic(const Duration(milliseconds: 100), (timer) {
      _millisecondCounter += 100;

      if (_millisecondCounter % 1000 == 0) {
        if (_state.mode == FocusMode.work) {
          final newTime = _state.timeInSeconds + 1;
          _updateState(timeInSeconds: newTime);
        } else if (_state.mode == FocusMode.rest) {
          if (_state.timeInSeconds > 0) {
            _updateState(timeInSeconds: _state.timeInSeconds - 1);
          } else {
            // Timer finished, handle completion outside this service
          }
        }
      }
    });
  }

  void pauseTimer() {
    if (!_state.isActive) return;
    _timer?.cancel();
    _timer = null;
    _updateState(isActive: false);
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
    _millisecondCounter = 0;
    _updateState(
      timeInSeconds: 0,
      isActive: false,
      earnedBreakSeconds: 0,
      isBreakUnlocked: false,
      timeAdjustment: null,
      sessionPauseCount: 0,
      sessionTotalPausedTime: 0,
      sessionAdjustments: [],
      uiState: FocusUiState.idle,
    );
  }

  void setTime(int seconds) {
    _updateState(timeInSeconds: seconds);
  }

  void setMode(FocusMode mode) {
    _updateState(mode: mode);
  }

  void setMinWorkDuration(int seconds) {
    _updateState(minWorkDuration: seconds);
  }

  void setBreakTotalDuration(int seconds) {
    _updateState(breakTotalDuration: seconds);
  }

  void setHasAppliedAdjustment(bool hasApplied) {
    _updateState(hasAppliedAdjustment: hasApplied);
  }

  void setDeltaAdjustment(int? deltaAdjustment) {
    _updateState(deltaAdjustment: deltaAdjustment);
  }

  void setSessionAdjustments(List<TimeAdjustment> adjustments) {
    _updateState(sessionAdjustments: adjustments);
  }

  void setSessionTotalPausedTime(int time) {
    _updateState(sessionTotalPausedTime: time);
  }

  void setSessionPauseCount(int count) {
    _updateState(sessionPauseCount: count);
  }

  void setTimeAdjustment(int? adjustment) {
    _updateState(timeAdjustment: adjustment);
  }

  void setIsBreakUnlocked(bool isUnlocked) {
    _updateState(isBreakUnlocked: isUnlocked);
  }

  void setEarnedBreakSeconds(int seconds) {
    _updateState(earnedBreakSeconds: seconds);
  }

  void setDisplayMode(DisplayMode mode) {
    _updateState(displayMode: mode);
  }

  void setUiState(FocusUiState uiState) {
    _updateState(uiState: uiState);
  }

  // Reset millisecond counter (call when mode switches or precise timing needs reset)
  void resetMillisecondCounter() {
    _millisecondCounter = 0;
  }

  // Get current progress bar value (0.0-1.0), considering millisecond precision
  double get progressValue {
    double fractionalSeconds = _millisecondCounter % 1000 / 1000.0;
    double preciseTimeInSeconds;
    
    if (_state.mode == FocusMode.work) {
      preciseTimeInSeconds = _state.timeInSeconds.toDouble() + fractionalSeconds;
    } else {
      preciseTimeInSeconds = _state.timeInSeconds.toDouble() - fractionalSeconds;
    }
    
    double value;
    if (_state.displayMode == DisplayMode.countdown) {
      if (_state.mode == FocusMode.work) {
        double adjustedTime = _state.timeInSeconds + fractionalSeconds;
        value = (_state.minWorkDuration > 0) 
            ? (_state.minWorkDuration - adjustedTime) / _state.minWorkDuration 
            : 0.0;
      } else {
        value = (_state.breakTotalDuration > 0) 
            ? preciseTimeInSeconds / _state.breakTotalDuration 
            : 0.0;
      }
    } else {
      if (_state.mode == FocusMode.work) {
        double adjustedTime = _state.timeInSeconds + fractionalSeconds;
        value = (_state.minWorkDuration > 0) 
            ? adjustedTime / _state.minWorkDuration 
            : 0.0;
      } else {
        value = (_state.breakTotalDuration > 0) 
            ? (_state.breakTotalDuration - preciseTimeInSeconds) / _state.breakTotalDuration 
            : 0.0;
      }
    }

    // Log for debugging
    if (kDebugMode) {
      print('--- Progress Calculation ---');
      print('Mode: ${_state.mode}, Display: ${_state.displayMode}');
      print('TimeInSeconds: ${_state.timeInSeconds}, MinWork: ${_state.minWorkDuration}, BreakTotal: ${_state.breakTotalDuration}');
      print('Calculated Progress Value: $value');
      print('--------------------------');
    }

    return value.clamp(0.0, 1.0);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
}