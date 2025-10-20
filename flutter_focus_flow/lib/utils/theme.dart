import 'package:flutter/material.dart';

class AppTheme {
  static const Color primaryColor = Color(0xFF6750A4);
  static const Color secondaryColor = Color(0xFF625B71);
  static const Color surfaceColor = Color(0xFFFFFBFE);
  static const Color errorColor = Color(0xFFB3261E);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.light,
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: surfaceColor,
      ),
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: surfaceColor,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.dark,
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: surfaceColor,
      ),
      navigationRailTheme: const NavigationRailThemeData(
        backgroundColor: surfaceColor,
      ),
    );
  }
}