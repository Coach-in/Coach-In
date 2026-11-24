import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/utils/programme_utils.dart';

void main() {
  group('validateProgrammeDraft', () {
    final start = DateTime(2026, 10, 5);

    test('requires a name and a start date', () {
      expect(validateProgrammeDraft(name: ' ', startDate: start, endDate: null),
          isNotNull);
      expect(validateProgrammeDraft(name: 'Bloc', startDate: null, endDate: null),
          isNotNull);
    });

    test('rejects an end date before the start date', () {
      expect(
        validateProgrammeDraft(
            name: 'Bloc', startDate: start, endDate: DateTime(2026, 10, 1)),
        isNotNull,
      );
    });

    test('accepts a valid draft', () {
      expect(
        validateProgrammeDraft(
            name: 'Bloc', startDate: start, endDate: DateTime(2026, 11, 15)),
        isNull,
      );
    });
  });

  group('buildProgrammePayload', () {
    test('numbers days and exercises from 1 and omits empty fields', () {
      final payload = buildProgrammePayload(
        name: ' Force ',
        objectives: '  ',
        startDate: DateTime(2026, 10, 5),
        days: [
          DraftDay(name: 'Push', exercises: [
            DraftExercise(exerciseId: 'a', name: 'Bench', sets: 4, reps: 8, weight: 80),
            DraftExercise(exerciseId: 'b', name: 'Dips', restSeconds: 90),
          ]),
          DraftDay(),
        ],
      );

      expect(payload['name'], 'Force');
      expect(payload['startDate'], '2026-10-05');
      expect(payload.containsKey('objectives'), isFalse);
      expect(payload.containsKey('endDate'), isFalse);
      expect(payload.containsKey('athleteId'), isFalse);

      final days = payload['days'] as List;
      expect(days[0]['dayIndex'], 1);
      expect(days[1]['dayIndex'], 2);
      expect(days[1].containsKey('exercises'), isFalse);

      final exercises = days[0]['exercises'] as List;
      expect(exercises[0], {
        'exerciseId': 'a', 'order': 1, 'sets': 4, 'reps': 8, 'weight': 80.0,
      });
      expect(exercises[1]['order'], 2);
      expect(exercises[1]['restSeconds'], 90);
    });

    test('includes the athlete when given', () {
      final payload = buildProgrammePayload(
        name: 'x', startDate: DateTime(2026, 1, 2), athleteId: 'ath');
      expect(payload['athleteId'], 'ath');
    });
  });

  test('describeProgrammeExercise formats optional fields', () {
    expect(
      describeProgrammeExercise(
          {'sets': 4, 'reps': 8, 'weight': 80, 'rpe': 8.5, 'restSeconds': 120}),
      '4 × 8 · 80 kg · RPE 8.5 · repos 120 s',
    );
    expect(describeProgrammeExercise({'sets': 3, 'reps': 10}), '3 × 10');
  });

  group('isProgrammeOwner', () {
    test('coach owns a coach programme, athlete owns a personal one', () {
      final coachProgramme = {
        'coach': {'user': {'id': 'c'}},
        'athlete': {'user': {'id': 'a'}},
      };
      expect(isProgrammeOwner(coachProgramme, 'c'), isTrue);
      expect(isProgrammeOwner(coachProgramme, 'a'), isFalse);

      final personal = {
        'coach': null,
        'athlete': {'user': {'id': 'a'}},
      };
      expect(isProgrammeOwner(personal, 'a'), isTrue);
      expect(isProgrammeOwner(personal, null), isFalse);
    });
  });

  test('nextDayIndex and nextExerciseOrder use the highest value + 1', () {
    expect(nextDayIndex([]), 1);
    expect(nextDayIndex([{'dayIndex': 1}, {'dayIndex': 4}]), 5);
    expect(nextExerciseOrder([]), 1);
    expect(nextExerciseOrder([{'order': 2}, {'order': 1}]), 3);
  });

  group('buildProgrammePatch', () {
    final current = {
      'name': 'Force',
      'objectives': 'Squat +10 kg',
      'startDate': '2026-10-05',
      'endDate': '2026-11-15',
    };

    test('is empty when nothing changed', () {
      expect(
        buildProgrammePatch(
          current: current,
          name: ' Force ',
          objectives: 'Squat +10 kg',
          startDate: DateTime(2026, 10, 5),
          endDate: DateTime(2026, 11, 15),
        ),
        isEmpty,
      );
    });

    test('contains only changed fields and nulls a cleared end date', () {
      expect(
        buildProgrammePatch(
          current: current,
          name: 'Force 2',
          objectives: '',
          startDate: DateTime(2026, 10, 5),
          endDate: null,
        ),
        {'name': 'Force 2', 'objectives': '', 'endDate': null},
      );
    });
  });

  group('field builders', () {
    test('day: emptied fields are null on update, omitted on create', () {
      expect(buildDayFields(name: '', notes: ' x '), {'notes': 'x'});
      expect(buildDayFields(name: '', notes: '', clearEmpty: true),
          {'name': null, 'notes': null});
    });

    test('exercise: emptied optionals are null on update, omitted on create', () {
      expect(buildExerciseFields(sets: 3, reps: 10), {'sets': 3, 'reps': 10});
      expect(
        buildExerciseFields(sets: 3, reps: 10, weight: 50, clearEmpty: true),
        {
          'sets': 3,
          'reps': 10,
          'weight': 50.0,
          'rpe': null,
          'restSeconds': null,
          'notes': null,
        },
      );
    });
  });
}
