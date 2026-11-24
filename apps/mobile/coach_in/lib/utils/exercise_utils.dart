import '../data/default_exercises.dart';

/// Names are compared ignoring case and surrounding spaces, as the API keeps
/// them unique and the web does the same.
bool sameExerciseName(String a, String b) =>
    a.trim().toLowerCase() == b.trim().toLowerCase();

/// Returns the exercise named [name] from [exercises], if any.
Map<String, dynamic>? findExerciseByName(
  Iterable<Map<String, dynamic>> exercises,
  String name,
) {
  for (final e in exercises) {
    if (sameExerciseName(e['name'] as String, name)) return e;
  }
  return null;
}

/// The picker's list: defaults that are not in the catalogue yet (marked
/// `isTemplate`, with no `id`), followed by the catalogue itself.
List<Map<String, dynamic>> mergeWithDefaults(
  List<Map<String, dynamic>> catalogue, {
  List<Map<String, String>> defaults = defaultExercises,
}) {
  return [
    for (final d in defaults)
      if (findExerciseByName(catalogue, d['name']!) == null)
        {'name': d['name'], 'description': d['description'], 'isTemplate': true},
    ...catalogue,
  ];
}
