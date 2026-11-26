import 'package:flutter/material.dart';

/// Opens [page] as the new root of the navigator, so the system back button
/// can no longer return to the start/login/register screens.
Future<T?> openAsRoot<T>(BuildContext context, Widget page) {
  return Navigator.pushAndRemoveUntil<T>(
    context,
    MaterialPageRoute(builder: (_) => page),
    (route) => false,
  );
}
