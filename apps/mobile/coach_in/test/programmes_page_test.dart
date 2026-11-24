import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/screens/programmes_page.dart';

import 'helpers/fake_api.dart';

void main() {
  setUpAll(setUpFakeSession);

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ProgrammesPage()));
    await tester.pumpAndSettle();
  }

  final programme = {
    'id': 'p1',
    'name': 'Force 6 semaines',
    'startDate': '2026-10-05',
    'endDate': '2026-11-15',
    'coach': {'user': {'username': 'jane'}},
    'athlete': {'user': {'username': 'john'}},
  };

  testWidgets('an athlete sees their programmes with the coach name',
      (tester) async {
    final api = FakeApi({
      'GET /users/me': ok({'id': 'ua', 'role': 'athlete'}),
      'GET /programmes': ok([programme]),
    });

    await api.run(() async {
      await pump(tester);

      expect(find.text('Force 6 semaines'), findsOneWidget);
      expect(find.text('Par jane'), findsOneWidget);
      expect(find.text('2026-10-05 → 2026-11-15'), findsOneWidget);
      expect(find.text('Créer'), findsOneWidget);
    });
  });

  testWidgets('a coach sees who a programme is for, or that it is a template',
      (tester) async {
    final api = FakeApi({
      'GET /users/me': ok({'id': 'uc', 'role': 'coach'}),
      'GET /programmes': ok([
        programme,
        {...programme, 'id': 'p2', 'name': 'Modèle force', 'athlete': null},
      ]),
    });

    await api.run(() async {
      await pump(tester);

      expect(find.text('Pour john'), findsOneWidget);
      expect(find.text('Modèle'), findsOneWidget);
    });
  });

  testWidgets('shows an empty state and still offers to create',
      (tester) async {
    final api = FakeApi({
      'GET /users/me': ok({'id': 'ua', 'role': 'athlete'}),
      'GET /programmes': ok([]),
    });

    await api.run(() async {
      await pump(tester);

      expect(find.text('Aucun programme pour le moment.'), findsOneWidget);
      expect(find.text('Créer'), findsOneWidget);
    });
  });

  testWidgets('an API without the programmes route says so and keeps "Créer"',
      (tester) async {
    // GET /programmes is not registered: the fake answers "Cannot GET /programmes".
    final api = FakeApi({'GET /users/me': ok({'id': 'ua', 'role': 'athlete'})});

    await api.run(() async {
      await pump(tester);

      expect(find.textContaining('API trop ancienne'), findsOneWidget);
      expect(find.text('Réessayer'), findsOneWidget);
      expect(find.text('Créer'), findsOneWidget);
    });
  });

  testWidgets('retrying after an error loads the list', (tester) async {
    final routes = <String, FakeResponse>{
      'GET /users/me': ok({'id': 'ua', 'role': 'athlete'}),
      'GET /programmes': failure(500, 'boom'),
    };
    final api = FakeApi(routes);

    await api.run(() async {
      await pump(tester);
      expect(find.text('Réessayer'), findsOneWidget);

      routes['GET /programmes'] = ok([programme]);
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();

      expect(find.text('Force 6 semaines'), findsOneWidget);
    });
  });
}
