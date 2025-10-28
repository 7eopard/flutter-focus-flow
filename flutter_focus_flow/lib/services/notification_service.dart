import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  // Channel definitions
  static const String ongoingChannelId = 'focus_timer_channel';
  static const String ongoingChannelName = 'Focus Timer';
  static const String ongoingChannelDescription = 'Notification for the ongoing focus timer.';

  static const String alertChannelId = 'alert_channel';
  static const String alertChannelName = 'Alerts';
  static const String alertChannelDescription = 'Notifications for focus session completions and other alerts.';

  Future<void> init() async {
    try {
      // Initialize for Android
      const AndroidInitializationSettings initializationSettingsAndroid =
          AndroidInitializationSettings('@mipmap/ic_launcher');

      // TODO: Add settings for iOS/macOS if needed
      const InitializationSettings initializationSettings = InitializationSettings(
        android: initializationSettingsAndroid,
      );

      await _notificationsPlugin.initialize(initializationSettings);

      // Create notification channels
      await _createChannels();
    } catch (e) {
      debugPrint('Notification service initialization error: $e');
    }

    // Request permissions for Android 13+
    // await _requestPermissions(); // Temporarily disabled for debugging startup crash
  }

  Future<void> _createChannels() async {
    // Ongoing Timer Channel - High importance for promotion
    const AndroidNotificationChannel ongoingChannel = AndroidNotificationChannel(
      ongoingChannelId,
      ongoingChannelName,
      description: ongoingChannelDescription,
      importance: Importance.high, // Must not be IMPORTANCE_MIN
      showBadge: false,
      enableVibration: false,
      playSound: false,
    );

    // Alert Channel - Default importance
    const AndroidNotificationChannel alertChannel = AndroidNotificationChannel(
      alertChannelId,
      alertChannelName,
      description: alertChannelDescription,
      importance: Importance.defaultImportance,
    );

    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(ongoingChannel);
    
    await _notificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(alertChannel);
  }

  Future<void> requestPermissions() async {
    final plugin = _notificationsPlugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    await plugin?.requestNotificationsPermission();
    // Note: There is no direct way to request POST_PROMOTED_NOTIFICATIONS
    // through the plugin as of now. It's a manifest-only permission.
  }

  static const int _ongoingNotificationId = 0;
  static const int _alertNotificationId = 1;

  Future<void> showProgressNotification({
    required String title,
    required String body,
    required int maxProgress,
    required int progress,
  }) async {
    final AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      ongoingChannelId,
      ongoingChannelName,
      channelDescription: ongoingChannelDescription,
      importance: Importance.high,
      priority: Priority.high,
      ongoing: true,
      autoCancel: false,
      showProgress: true,
      maxProgress: maxProgress,
      progress: progress,
      colorized: false, // Must not be colorized
    );

    final NotificationDetails notificationDetails = NotificationDetails(
      android: androidDetails,
    );

    await _notificationsPlugin.show(
      _ongoingNotificationId,
      title,
      body,
      notificationDetails,
    );
  }

  Future<void> showStandardNotification({
    required String title,
    required String body,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      alertChannelId,
      alertChannelName,
      channelDescription: alertChannelDescription,
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
    );

    const NotificationDetails notificationDetails = NotificationDetails(
      android: androidDetails,
    );

    await _notificationsPlugin.show(
      _alertNotificationId,
      title,
      body,
      notificationDetails,
    );
  }

  Future<void> cancelAllNotifications() async {
    await _notificationsPlugin.cancelAll();
  }

  Future<void> cancelOngoingNotification() async {
    await _notificationsPlugin.cancel(_ongoingNotificationId);
  }
}
