import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:coach_in/data/notes_repository.dart';
import 'package:coach_in/widgets/athlete_notes_section.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  Widget wrap(NotesRepository repo) => MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: AthleteNotesSection(athleteId: 'a1', repository: repo),
          ),
        ),
      );

  testWidgets('shows the empty state', (tester) async {
    await tester.pumpWidget(wrap(InMemoryNotesRepository()));
    await tester.pumpAndSettle();
    expect(find.text('No notes yet'), findsOneWidget);
  });

  testWidgets('adds then deletes a note', (tester) async {
    await tester.pumpWidget(wrap(InMemoryNotesRepository()));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add a note'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'Knee pain on squats');
    await tester.tap(find.text('Enregistrer'));
    await tester.pumpAndSettle();
    expect(find.text('Knee pain on squats'), findsOneWidget);

    await tester.tap(find.byTooltip('Delete note'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    expect(find.text('No notes yet'), findsOneWidget);
  });
}
