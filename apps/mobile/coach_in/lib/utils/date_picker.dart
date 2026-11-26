import 'package:flutter/material.dart';
import '../config/app_colors.dart';

/// `showDatePicker` themed for the app's dark palette.
///
/// The app's `colorScheme.primary` is dark navy, which Flutter uses for the
/// dialog's OK/Cancel text and the selected day, making them invisible.
Future<DateTime?> showAppDatePicker({
  required BuildContext context,
  required DateTime initialDate,
}) {
  return showDatePicker(
    context: context,
    initialDate: initialDate,
    firstDate: DateTime(2020),
    lastDate: DateTime(2100),
    cancelText: 'Annuler',
    confirmText: 'OK',
    builder: (ctx, child) {
      final theme = Theme.of(ctx);
      return Theme(
        data: theme.copyWith(
          colorScheme: theme.colorScheme.copyWith(
            primary: AppColors.accent,
            onPrimary: Colors.black,
          ),
        ),
        child: child!,
      );
    },
  );
}
