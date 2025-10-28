import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_focus_flow/services/timer_service.dart'; // Assuming FocusState is defined here

class UndoService extends ChangeNotifier {
  FocusState? _previousState;
  FocusState? _prePauseState; // State specifically saved when pausing, for undoing to pre-pause state
  Timer? _undoTimer;

  FocusState? get previousState => _previousState;

  void saveState(FocusState state) {
    _previousState = state;
    _startUndoLifecycle();
  }

  void savePrePauseState(FocusState state) {
    _prePauseState = state;
    _previousState = state; // Also update general undo state
    _startUndoLifecycle();
  }

  FocusState? restoreState() {
    final stateToRestore = _prePauseState ?? _previousState;
    if (stateToRestore != null) {
      _previousState = null;
      if (_prePauseState != null) {
        _prePauseState = null; // Clear pre-pause state only if it was used
      }
      _undoTimer?.cancel();
      notifyListeners();
    }
    return stateToRestore;
  }

  void _startUndoLifecycle() {
    _undoTimer?.cancel();
    _undoTimer = Timer(const Duration(seconds: 10), () {
      _previousState = null;
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _undoTimer?.cancel();
    super.dispose();
  }
}