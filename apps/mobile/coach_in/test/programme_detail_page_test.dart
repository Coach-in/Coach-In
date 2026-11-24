import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/screens/programme_detail_page.dart';

import 'helpers/fake_api.dart';

void main() {
  setUpAll(setUpFakeSession);

  final programme = {
    'id': 'p1',
    'name': 'Force 6 semaines',
    'objectives': 'Squat +10 kg',
    'startDate': '2026-10-05',
    'endDate': '2026-11-15',
    'coach': {'id': 'c1', 'user': {'id': 'uc', 'username': 'jane'}},
    'athlete': {'id': 'a1', 'user': {'id': 'ua', 'username': 'john'}},
    'days': [
      {
        'id': 'd1',
        'dayIndex': 1,
        'name': 'Push',
        'notes': null,
        'exercises': [
          {
            'id': 'pe1', 'order': 1, 'sets': 4, 'reps': 8, 'weight': 80,
            'rpe': 8, 'restSeconds': 120, 'notes': null,
            'exercise': {'id': 'e1', 'name': 'Développé couché'},
          },
          {
            'id': 'pe2', 'order': 2, 'sets': 3, 'reps': 12, 'weight': null,
            'rpe': null, 'restSeconds': null, 'notes': 'Lent',
            'exercise': {'id': 'e2', 'name': 'Dips'},
          },
        ],
      },
      {
        'id': 'd2',
        'dayIndex': 2,
        'name': null,
        'notes': 'Repos actif',
        'exercises': <Map<String, dynamic>>[],
      },
    ],
  };

  FakeApi apiFor(String userId, {Map<String, FakeResponse> extra = const {}}) =>
      FakeApi({
        'GET /users/me': ok({'id': userId, 'role': 'coach'}),
        'GET /programmes/p1': ok(programme),
        ...extra,
      });

  Future<void> pump(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 4000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(
      const MaterialApp(home: ProgrammeDetailPage(programmeId: 'p1')),
    );
    await tester.pumpAndSettle();
  }

  testWidgets('shows the programme, its days and exercises in order',
      (tester) async {
    await apiFor('ua').run(() async {
      await pump(tester);

      expect(find.text('Force 6 semaines'), findsOneWidget);
      expect(find.text('Coach : jane'), findsOneWidget);
      expect(find.text('Athlète : john'), findsOneWidget);
      expect(find.text('Squat +10 kg'), findsOneWidget);
      expect(find.text('JOUR 1 · PUSH'), findsOneWidget);
      expect(find.text('4 × 8 · 80 kg · RPE 8 · repos 120 s'), findsOneWidget);
      expect(find.text('3 × 12'), findsOneWidget);
      expect(find.text('Lent'), findsOneWidget);
      expect(find.text('JOUR 2'), findsOneWidget);
      expect(find.text('Repos actif'), findsOneWidget);
      expect(find.text('Aucun exercice.'), findsOneWidget);

      final bench = tester.getTopLeft(find.text('Développé couché')).dy;
      final dips = tester.getTopLeft(find.text('Dips')).dy;
      expect(bench, lessThan(dips));
    });
  });

  testWidgets('the athlete is not the owner: no edit controls', (tester) async {
    await apiFor('ua').run(() async {
      await pump(tester);

      expect(find.byIcon(Icons.edit), findsNothing);
      expect(find.byIcon(Icons.more_vert), findsNothing);
      expect(find.text('Ajouter un jour'), findsNothing);
      expect(find.text('Ajouter un exercice'), findsNothing);
    });
  });

  testWidgets('the owning coach gets edit, day and exercise controls',
      (tester) async {
    await apiFor('uc').run(() async {
      await pump(tester);

      expect(find.byIcon(Icons.edit), findsWidgets);
      expect(find.byIcon(Icons.more_vert), findsOneWidget);
      expect(find.text('Ajouter un exercice'), findsNWidgets(2));
      expect(find.text('Ajouter un jour'), findsOneWidget);
    });
  });

  testWidgets('the menu offers duplicate, assign and delete to a coach',
      (tester) async {
    await apiFor('uc').run(() async {
      await pump(tester);

      await tester.tap(find.byIcon(Icons.more_vert));
      await tester.pumpAndSettle();

      expect(find.text('Dupliquer'), findsOneWidget);
      expect(find.text('Assigner à un athlète'), findsOneWidget);
      expect(find.text('Supprimer'), findsOneWidget);
    });
  });

  testWidgets('shows the API error when the programme cannot be loaded',
      (tester) async {
    final api = FakeApi({
      'GET /users/me': ok({'id': 'ua', 'role': 'athlete'}),
      'GET /programmes/p1': failure(403, 'You do not have access to this programme'),
    });

    await api.run(() async {
      await pump(tester);

      expect(find.text('You do not have access to this programme'), findsOneWidget);
      expect(find.text('Force 6 semaines'), findsNothing);
    });
  });

  testWidgets('deleting asks for confirmation, then deletes and leaves',
      (tester) async {
    final api = apiFor('uc', extra: {'DELETE /programmes/p1': noContent()});

    await api.run(() async {
      await tester.pumpWidget(MaterialApp(
        home: Builder(
          builder: (context) => TextButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ProgrammeDetailPage(programmeId: 'p1'),
              ),
            ),
            child: const Text('open'),
          ),
        ),
      ));
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      await tester.tap(find.byIcon(Icons.more_vert));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Supprimer'));
      await tester.pumpAndSettle();

      expect(find.text('Supprimer ce programme ?'), findsOneWidget);
      expect(api.lastRequest('DELETE', '/programmes/p1'), isNull);

      await tester.tap(find.widgetWithText(TextButton, 'Supprimer'));
      await tester.pumpAndSettle();

      expect(api.lastRequest('DELETE', '/programmes/p1'), isNotNull);
      expect(find.byType(ProgrammeDetailPage), findsNothing);
    });
  });

  testWidgets('cancelling the delete confirmation keeps the programme',
      (tester) async {
    final api = apiFor('uc', extra: {'DELETE /programmes/p1': noContent()});

    await api.run(() async {
      await pump(tester);

      await tester.tap(find.byIcon(Icons.more_vert));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Supprimer'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Annuler'));
      await tester.pumpAndSettle();

      expect(api.lastRequest('DELETE', '/programmes/p1'), isNull);
      expect(find.byType(ProgrammeDetailPage), findsOneWidget);
    });
  });
}
