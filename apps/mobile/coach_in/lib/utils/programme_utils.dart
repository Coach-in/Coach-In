import 'dart:math' as math;

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

/// The owner is the coach, or the athlete for a programme they created
/// themself. The API enforces the same rule on every modification route.
bool isProgrammeOwner(Map<String, dynamic> programme, String? userId) {
  final owner = programme['coach'] ?? programme['athlete'];
  return userId != null && owner?['user']?['id'] == userId;
}

/// Next free 1-based `dayIndex` (the API rejects duplicates with a 409).
int nextDayIndex(List<dynamic> days) =>
    days.fold<int>(0, (m, d) => math.max(m, d['dayIndex'] as int)) + 1;

/// Next `order` for an exercise appended to a day.
int nextExerciseOrder(List<dynamic> exercises) =>
    exercises.fold<int>(0, (m, e) => math.max(m, e['order'] as int)) + 1;

/// Body of `PATCH /programmes/:id`: only the fields that changed.
/// A cleared end date is sent as `null`.
Map<String, dynamic> buildProgrammePatch({
  required Map<String, dynamic> current,
  required String name,
  String? objectives,
  required DateTime startDate,
  DateTime? endDate,
}) {
  final newObjectives = objectives?.trim() ?? '';
  final newStart = formatApiDate(startDate);
  final newEnd = endDate == null ? null : formatApiDate(endDate);

  return {
    if (name.trim() != current['name']) 'name': name.trim(),
    if (newObjectives != (current['objectives'] ?? ''))
      'objectives': newObjectives,
    if (newStart != current['startDate']) 'startDate': newStart,
    if (newEnd != current['endDate']) 'endDate': newEnd,
  };
}

/// Fields of a day. For an update ([clearEmpty]) an emptied field is sent as
/// `null`, because the API rejects an empty `name`; for a create it is omitted.
Map<String, dynamic> buildDayFields({
  required String name,
  required String notes,
  bool clearEmpty = false,
}) {
  final n = name.trim();
  final t = notes.trim();
  return {
    if (n.isNotEmpty) 'name': n else if (clearEmpty) 'name': null,
    if (t.isNotEmpty) 'notes': t else if (clearEmpty) 'notes': null,
  };
}

/// Prescription fields of a programme exercise (same [clearEmpty] rule as
/// [buildDayFields]).
Map<String, dynamic> buildExerciseFields({
  required int sets,
  required int reps,
  double? weight,
  double? rpe,
  int? restSeconds,
  String notes = '',
  bool clearEmpty = false,
}) {
  final t = notes.trim();
  return {
    'sets': sets,
    'reps': reps,
    if (weight != null) 'weight': weight else if (clearEmpty) 'weight': null,
    if (rpe != null) 'rpe': rpe else if (clearEmpty) 'rpe': null,
    if (restSeconds != null)
      'restSeconds': restSeconds
    else if (clearEmpty)
      'restSeconds': null,
    if (t.isNotEmpty) 'notes': t else if (clearEmpty) 'notes': null,
  };
}
