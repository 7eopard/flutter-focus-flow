import 'package:flutter/foundation.dart';
import 'package:flutter_focus_flow/services/timer_service.dart'; // For FocusMode and DisplayMode

class SettingsService extends ChangeNotifier {
  int _minWorkDuration = 1500; // Default 25 minutes = 1500 seconds
  DisplayMode _displayMode = DisplayMode.countdown; // Default countdown mode

  int get minWorkDuration => _minWorkDuration;
  DisplayMode get displayMode => _displayMode;

  void setMinWorkDuration(int seconds) {
    if (_minWorkDuration != seconds) {
      _minWorkDuration = seconds;
      notifyListeners();
    }
  }

  void setDisplayMode(DisplayMode mode) {
    if (_displayMode != mode) {
      _displayMode = mode;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    super.dispose();
  }
}