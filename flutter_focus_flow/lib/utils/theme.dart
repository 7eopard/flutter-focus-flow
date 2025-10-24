import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Material 3 Expressive color palette
  static const Color primaryColor = Color(0xFF6750A4);
  static const Color secondaryColor = Color(0xFF625B71);
  static const Color tertiaryColor = Color(0xFF7D5260);
  static const Color surfaceColor = Color(0xFFFFFBFE);
  static const Color surfaceVariant = Color(0xFFE7E0EC);
  static const Color errorColor = Color(0xFFB3261E);
  static const Color successColor = Color(0xFF146C2E);
  static const Color warningColor = Color(0xFF7D5700);
  
  // Expressive design elevation values
  static const double expressLevel1 = 1.0;
  static const double expressLevel2 = 3.0;
  static const double expressLevel3 = 6.0;
  static const double expressLevel4 = 8.0;
  static const double expressLevel5 = 12.0;

  // Animation durations
  static const Duration shortAnimation = Duration(milliseconds: 150);
  static const Duration mediumAnimation = Duration(milliseconds: 300);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        brightness: Brightness.light,
      ),
      textTheme: GoogleFonts.poppinsTextTheme(),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surfaceColor,
        indicatorColor: primaryColor.withOpacity(0.12),
        labelTextStyle: MaterialStateProperty.resolveWith<TextStyle>((states) {
          if (states.contains(MaterialState.selected)) {
            return TextStyle(
              color: primaryColor,
              fontWeight: FontWeight.w600,
            );
          }
          return TextStyle(
            color: secondaryColor,
            fontWeight: FontWeight.w400,
          );
        }),
        iconTheme: MaterialStateProperty.resolveWith<IconThemeData>((states) {
          if (states.contains(MaterialState.selected)) {
            return IconThemeData(
              color: primaryColor,
              size: 24,
            );
          }
          return IconThemeData(
            color: secondaryColor,
            size: 24,
          );
        }),
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
      textTheme: GoogleFonts.poppinsTextTheme(),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: const Color(0xFF1C1B1F),
        indicatorColor: primaryColor.withOpacity(0.2),
        labelTextStyle: MaterialStateProperty.resolveWith<TextStyle>((states) {
          if (states.contains(MaterialState.selected)) {
            return TextStyle(
              color: primaryColor,
              fontWeight: FontWeight.w600,
            );
          }
          return TextStyle(
            color: const Color(0xFFCAC4D0),
            fontWeight: FontWeight.w400,
          );
        }),
        iconTheme: MaterialStateProperty.resolveWith<IconThemeData>((states) {
          if (states.contains(MaterialState.selected)) {
            return IconThemeData(
              color: primaryColor,
              size: 24,
            );
          }
          return IconThemeData(
            color: const Color(0xFFCAC4D0),
            size: 24,
          );
        }),
      ),
    );
  }
}