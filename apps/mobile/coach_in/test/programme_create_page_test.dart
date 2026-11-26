import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/screens/programme_create_page.dart';

import 'helpers/fake_api.dart';

void main() {
  setUpAll(setUpFakeSession);

  FakeApi apiFor({Map<String, FakeResponse> extra = const {}}) => FakeApi({
        'GET /exercices': ok([]),
        'GET /relationships': ok([
          {'status': 'accepted', 'athlete': {'id': 'a1', 'user': {'username': 'john'}}},
          {'status': 'pending', 'athlete': {'id': 'a2', 'user': {'username': 'paul'}}},
        ]),
        ...extra,
      });

  /// Opens the builder from a launcher so that a successful save (which pops)
  /// can be observed.
  Future<void> open(WidgetTester tester, String role) async {
    // Tall enough that the whole form is built (ListView builds lazily).
    tester.view.physicalSize = const Size(800, 4000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => ProgrammeCreatePage(role: role)),
          ),
          child: const Text('open'),
        ),
      ),
    ));
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
  }

  Future<void> save(WidgetTester tester) async {
    await tester.tap(find.text('Enregistrer'));
    await tester.pumpAndSettle();
  }

  testWidgets('a programme without a name is rejected before any request',
      (tester) async {
    final api = apiFor();
    await api.run(() async {
      await open(tester, 'athlete');
      await save(tester);

      expect(find.text('Le nom du programme est obligatoire.'), findsOneWidget);
      expect(api.lastRequest('POST', '/programmes'), isNull);
      expect(find.byType(ProgrammeCreatePage), findsOneWidget);
    });
  });

  testWidgets('an athlete creates a programme for themself', (tester) async {
    final api = apiFor(extra: {'POST /programmes': created({'id': 'p9'})});
    await api.run(() async {
      await open(tester, 'athlete');

      await tester.enterText(find.byType(TextField).first, 'Mon bloc');
      await save(tester);

      final body = api.lastJsonBody('POST', '/programmes')!;
      expect(body['name'], 'Mon bloc');
      expect(body['startDate'], matches(r'^\d{4}-\d{2}-\d{2}$'));
      expect(body.containsKey('athleteId'), isFalse);
      // An athlete never loads or sends an athlete list.
      expect(api.lastRequest('GET', '/relationships'), isNull);
      expect(find.byType(ProgrammeCreatePage), findsNothing);
    });
  });

  testWidgets('a coach can only pick athletes with an accepted relationship',
      (tester) async {
    await apiFor().run(() async {
      await open(tester, 'coach');

      await tester.tap(find.text('Aucun (modèle)'));
      await tester.pumpAndSettle();

      expect(find.text('john'), findsOneWidget);
      expect(find.text('paul'), findsNothing);
    });
  });

  testWidgets('a coach assigns the programme to a chosen athlete',
      (tester) async {
    final api = apiFor(extra: {'POST /programmes': created({'id': 'p9'})});
    await api.run(() async {
      await open(tester, 'coach');

      await tester.enterText(find.byType(TextField).first, 'Bloc pour John');
      await tester.tap(find.text('Aucun (modèle)'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('john').last);
      await tester.pumpAndSettle();
      await save(tester);

      final body = api.lastJsonBody('POST', '/programmes')!;
      expect(body['name'], 'Bloc pour John');
      expect(body['athleteId'], 'a1');
    });
  });

  testWidgets('a day with a default exercise is sent with its catalogue id',
      (tester) async {
    final api = apiFor(extra: {
      'POST /exercices': created({'id': 'e-squat', 'name': 'Squat barre'}),
      'POST /programmes': created({'id': 'p9'}),
    });
    await api.run(() async {
      await open(tester, 'athlete');

      await tester.enterText(find.byType(TextField).first, 'Jambes');
      await tester.tap(find.text('Ajouter un exercice'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Squat barre'));
      await tester.pumpAndSettle();

      // The suggestion was copied into the catalogue and is now in the day.
      expect(api.lastJsonBody('POST', '/exercices')!['name'], 'Squat barre');
      expect(find.text('Squat barre'), findsOneWidget);

      await save(tester);

      final day = (api.lastJsonBody('POST', '/programmes')!['days'] as List).single;
      expect(day['dayIndex'], 1);
      final exercise = (day['exercises'] as List).single;
      expect(exercise['exerciseId'], 'e-squat');
      expect(exercise['order'], 1);
      expect(exercise['sets'], 3);
      expect(exercise['reps'], 10);
    });
  });

  testWidgets('API errors are shown and the page stays open', (tester) async {
    final api = apiFor(extra: {
      'POST /programmes': failure(403, 'No accepted relationship with this athlete'),
    });
    await api.run(() async {
      await open(tester, 'athlete');

      await tester.enterText(find.byType(TextField).first, 'Mon bloc');
      await save(tester);

      expect(find.text('No accepted relationship with this athlete'), findsOneWidget);
      expect(find.byType(ProgrammeCreatePage), findsOneWidget);
    });
  });
}
