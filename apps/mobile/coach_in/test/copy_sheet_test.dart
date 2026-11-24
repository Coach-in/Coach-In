import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/widgets/programme_edit_sheets.dart';

void main() {
  final programme = {'name': 'Force', 'startDate': '2026-10-05', 'athlete': null};
  final athletes = [
    {'id': 'a1', 'user': {'username': 'john'}},
  ];

  Future<Map<String, dynamic>?> open(
    WidgetTester tester, {
    required bool assign,
    bool isCoach = true,
  }) async {
    Map<String, dynamic>? result;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () async {
            result = await showCopySheet(
              context,
              programme: programme,
              athletes: athletes,
              assign: assign,
              isCoach: isCoach,
            );
          },
          child: const Text('open'),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    return result;
  }

  testWidgets('assigning requires an athlete', (tester) async {
    await open(tester, assign: true);

    await tester.tap(find.text('Assigner').last);
    await tester.pump();

    expect(find.text('Choisissez un athlète.'), findsOneWidget);
  });

  testWidgets('duplicating with the default name sends only that name',
      (tester) async {
    Map<String, dynamic>? result;
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () async => result = await showCopySheet(
            context,
            programme: programme,
            athletes: athletes,
            assign: false,
            isCoach: true,
          ),
          child: const Text('open'),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Force (copie)'), findsOneWidget);
    await tester.tap(find.text('Dupliquer').last);
    await tester.pumpAndSettle();

    expect(result, {'name': 'Force (copie)'});
  });

  testWidgets('an athlete duplicating sees no athlete picker', (tester) async {
    await open(tester, assign: false, isCoach: false);
    expect(find.text('Athlète'), findsNothing);
    expect(find.text('Nom de la copie'), findsOneWidget);
  });
}
