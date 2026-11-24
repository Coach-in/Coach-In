import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/utils/date_picker.dart';
import 'package:coach_in/widgets/exercise_picker.dart';

void main() {
  testWidgets('an empty catalogue still offers to create an exercise',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(body: ExercisePicker(catalogue: [])),
    ));

    expect(find.text('Créer un nouvel exercice'), findsOneWidget);
    expect(find.textContaining('catalogue est vide'), findsOneWidget);

    await tester.tap(find.text('Créer un nouvel exercice'));
    await tester.pumpAndSettle();
    expect(find.text('Nouvel exercice'), findsOneWidget);

    // Saving without a name is rejected before any request is made.
    await tester.tap(find.text('Créer'));
    await tester.pump();
    expect(find.text("Le nom de l'exercice est obligatoire."), findsOneWidget);
  });

  testWidgets('date picker confirm button is not drawn in the dark primary',
      (tester) async {
    await tester.pumpWidget(MaterialApp(
      theme: ThemeData(
        colorScheme: const ColorScheme.dark(primary: Color(0xff1c232d)),
      ),
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () => showAppDatePicker(
              context: context, initialDate: DateTime(2026, 11, 24)),
          child: const Text('open'),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('OK'), findsOneWidget);
    final color = Theme.of(tester.element(find.text('OK'))).colorScheme.primary;
    expect(color, const Color(0xffffd398));
  });
}
