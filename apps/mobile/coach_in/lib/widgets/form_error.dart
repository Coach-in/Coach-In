import 'package:flutter/material.dart';

/// Inline error shown above a form's submit button. Renders nothing when
/// [message] is null.
class FormError extends StatelessWidget {
  const FormError(this.message, {super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final text = message;
    if (text == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(text, style: const TextStyle(color: Colors.red)),
    );
  }
}
