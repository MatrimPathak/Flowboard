import 'package:flutter/material.dart';

import 'colors.dart';

class AppTheme {
  static ThemeData light() {
    final cs = ColorScheme.fromSeed(
      seedColor: FlowboardColors.primary,
      brightness: Brightness.light,
      surface: FlowboardColors.surfaceLight,
    );
    return _base(cs);
  }

  static ThemeData dark() {
    final cs = ColorScheme.fromSeed(
      seedColor: FlowboardColors.primary,
      brightness: Brightness.dark,
      surface: FlowboardColors.surfaceDark,
    );
    return _base(cs);
  }

  static ThemeData _base(ColorScheme cs) {
    return ThemeData(
      useMaterial3: true,
      colorScheme: cs,
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: BorderSide(
            color: cs.brightness == Brightness.light
                ? FlowboardColors.borderLight
                : FlowboardColors.borderDark,
          ),
        ),
      ),
      chipTheme: ChipThemeData(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: cs.surface,
        foregroundColor: cs.onSurface,
      ),
      dividerTheme: DividerThemeData(
        color: cs.brightness == Brightness.light
            ? FlowboardColors.borderLight
            : FlowboardColors.borderDark,
        space: 1,
      ),
    );
  }
}
