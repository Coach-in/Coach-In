import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:coach_in/screens/relationships_page.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;

    // Secure storage is empty, so there is no session and the fetch fails.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => null,
    );
  });

  testWidgets('shows an error and a retry button when loading fails',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(home: RelationshipsPage()));
    await tester.pumpAndSettle();

    expect(find.text('Failed to load connections'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
