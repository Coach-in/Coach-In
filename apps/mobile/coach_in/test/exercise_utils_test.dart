import 'package:flutter_test/flutter_test.dart';

import 'package:coach_in/data/default_exercises.dart';
import 'package:coach_in/utils/exercise_utils.dart';

void main() {
  test('names are compared ignoring case and spaces', () {
    expect(sameExerciseName(' Squat Barre ', 'squat barre'), isTrue);
    expect(sameExerciseName('Squat', 'Squat barre'), isFalse);
  });

  test('defaults not yet in the catalogue are offered first, as templates', () {
    final merged = mergeWithDefaults([
      {'id': '1', 'name': 'squat barre'},
      {'id': '2', 'name': 'Tractions'},
    ]);

    expect(merged.length, defaultExercises.length - 1 + 2);
    expect(merged.where((e) => e['isTemplate'] == true).map((e) => e['name']),
        ['Soulevé de terre', 'Développé couché']);
    expect(merged.where((e) => e['isTemplate'] == true).every((e) => e['id'] == null),
        isTrue);
    // The catalogue entries keep their ids and come last.
    expect(merged.last['id'], '2');
  });

  test('findExerciseByName returns null when absent', () {
    expect(findExerciseByName([{'name': 'A'}], 'b'), isNull);
    expect(findExerciseByName([{'name': 'A'}], ' a ')?['name'], 'A');
  });
}
