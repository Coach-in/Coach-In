/// A catalogue exercise placed in a programme day, before it is sent to the API.
class DraftExercise {
  final String exerciseId;
  final String name;
  int sets;
  int reps;
  double? weight;
  double? rpe;
  int? restSeconds;

  DraftExercise({
    required this.exerciseId,
    required this.name,
    this.sets = 3,
    this.reps = 10,
    this.weight,
    this.rpe,
    this.restSeconds,
  });
}

class DraftDay {
  String name;
  final List<DraftExercise> exercises;

  DraftDay({this.name = '', List<DraftExercise>? exercises})
      : exercises = exercises ?? [];
}

/// Returns a French error message, or `null` when the draft can be sent.
String? validateProgrammeDraft({
  required String name,
  required DateTime? startDate,
  required DateTime? endDate,
}) {
  if (name.trim().isEmpty) return 'Le nom du programme est obligatoire.';
  if (name.trim().length > 100) {
    return 'Le nom ne doit pas dépasser 100 caractères.';
  }
  if (startDate == null) return 'La date de début est obligatoire.';
  if (endDate != null && endDate.isBefore(startDate)) {
    return 'La date de fin doit être après la date de début.';
  }
  return null;
}

String formatApiDate(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-'
    '${date.month.toString().padLeft(2, '0')}-'
    '${date.day.toString().padLeft(2, '0')}';

/// Builds the body of `POST /programmes`. Days and exercises are numbered
/// from 1 in list order (`dayIndex`, `order`); empty optional fields are omitted.
Map<String, dynamic> buildProgrammePayload({
  required String name,
  String? objectives,
  required DateTime startDate,
  DateTime? endDate,
  String? athleteId,
  List<DraftDay> days = const [],
}) {
  final trimmedObjectives = objectives?.trim() ?? '';

  return {
    'name': name.trim(),
    if (trimmedObjectives.isNotEmpty) 'objectives': trimmedObjectives,
    'startDate': formatApiDate(startDate),
    if (endDate != null) 'endDate': formatApiDate(endDate),
    'athleteId': ?athleteId,
    if (days.isNotEmpty)
      'days': [
        for (var i = 0; i < days.length; i++)
          {
            'dayIndex': i + 1,
            if (days[i].name.trim().isNotEmpty) 'name': days[i].name.trim(),
            if (days[i].exercises.isNotEmpty)
              'exercises': [
                for (var j = 0; j < days[i].exercises.length; j++)
                  {
                    'exerciseId': days[i].exercises[j].exerciseId,
                    'order': j + 1,
                    'sets': days[i].exercises[j].sets,
                    'reps': days[i].exercises[j].reps,
                    if (days[i].exercises[j].weight != null)
                      'weight': days[i].exercises[j].weight,
                    if (days[i].exercises[j].rpe != null)
                      'rpe': days[i].exercises[j].rpe,
                    if (days[i].exercises[j].restSeconds != null)
                      'restSeconds': days[i].exercises[j].restSeconds,
                  },
              ],
          },
      ],
  };
}

/// One-line summary of a programme exercise, e.g. `4 × 8 · 80 kg · RPE 8 · repos 120 s`.
String describeProgrammeExercise(Map<String, dynamic> e) {
  String fmt(dynamic v) {
    final d = (v as num).toDouble();
    return d == d.roundToDouble() ? d.toInt().toString() : d.toString();
  }

  return [
    '${e['sets']} × ${e['reps']}',
    if (e['weight'] != null) '${fmt(e['weight'])} kg',
    if (e['rpe'] != null) 'RPE ${fmt(e['rpe'])}',
    if (e['restSeconds'] != null) 'repos ${e['restSeconds']} s',
  ].join(' · ');
}
