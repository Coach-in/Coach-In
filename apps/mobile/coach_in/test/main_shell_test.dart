import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:coach_in/screens/main_shell.dart';
import 'package:coach_in/widgets/app_bottom_nav.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    GoogleFonts.config.allowRuntimeFetching = false;
    // No stored session: every fetch fails, which is enough to test navigation.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
      (call) async => null,
    );
  });

  testWidgets('tabs switch in place without pushing routes or a back arrow',
      (tester) async {
    final observer = _RouteCounter();
    await tester.pumpWidget(MaterialApp(
      navigatorObservers: [observer],
      home: const MainShell(),
    ));
    await tester.pumpAndSettle();

    final pushesAtStart = observer.pushes;
    expect(find.byType(AppBottomNav), findsOneWidget);
    expect(find.byType(BackButton), findsNothing);

    for (final label in ['Connections', 'Messages', 'Programmes', 'Profile', 'Explore']) {
      await tester.tap(find.text(label));
      await tester.pumpAndSettle();
      expect(find.byType(AppBottomNav), findsOneWidget);
      expect(find.byType(BackButton), findsNothing);
    }

    expect(observer.pushes, pushesAtStart);
  });
}

class _RouteCounter extends NavigatorObserver {
  int pushes = 0;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) => pushes++;
}
