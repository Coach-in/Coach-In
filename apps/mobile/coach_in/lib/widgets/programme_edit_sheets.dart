import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../utils/date_picker.dart';
import '../utils/programme_utils.dart';

InputDecoration _decoration(BuildContext context, String label) =>
    InputDecoration(
      labelText: label,
      labelStyle: Theme.of(context).textTheme.labelSmall,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
    );

Future<T?> _showSheet<T>(BuildContext context, Widget child) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Theme.of(context).colorScheme.primary,
    builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        MediaQuery.of(ctx).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(child: child),
    ),
  );
}

Widget _saveButton(VoidCallback onPressed, {String label = 'Enregistrer'}) =>
    ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 14),
        backgroundColor: const Color(0xffffd398),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Text(
        label,
        style: GoogleFonts.montserrat(
          color: Colors.black,
          fontWeight: FontWeight.bold,
        ),
      ),
    );

/// Edits name, objectives and dates. Pops with the `PATCH` body, or an empty
/// map when nothing changed.
Future<Map<String, dynamic>?> showProgrammeInfoSheet(
  BuildContext context,
  Map<String, dynamic> programme,
) {
  return _showSheet(context, _ProgrammeInfoForm(programme: programme));
}

class _ProgrammeInfoForm extends StatefulWidget {
  final Map<String, dynamic> programme;

  const _ProgrammeInfoForm({required this.programme});

  @override
  State<_ProgrammeInfoForm> createState() => _ProgrammeInfoFormState();
}

class _ProgrammeInfoFormState extends State<_ProgrammeInfoForm> {
  late final TextEditingController _name =
      TextEditingController(text: widget.programme['name']);
  late final TextEditingController _objectives =
      TextEditingController(text: widget.programme['objectives'] ?? '');
  late DateTime? _start = DateTime.tryParse(widget.programme['startDate'] ?? '');
  late DateTime? _end = DateTime.tryParse(widget.programme['endDate'] ?? '');
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _objectives.dispose();
    super.dispose();
  }

  Future<void> _pick(bool isStart) async {
    final picked = await showAppDatePicker(
      context: context,
      initialDate: (isStart ? _start : _end) ?? DateTime.now(),
    );
    if (picked != null) setState(() => isStart ? _start = picked : _end = picked);
  }

  void _submit() {
    final error = validateProgrammeDraft(
      name: _name.text,
      startDate: _start,
      endDate: _end,
    );
    if (error != null) {
      setState(() => _error = error);
      return;
    }
    Navigator.pop(
      context,
      buildProgrammePatch(
        current: widget.programme,
        name: _name.text,
        objectives: _objectives.text,
        startDate: _start!,
        endDate: _end,
      ),
    );
  }

  Widget _dateButton(String label, DateTime? date, bool isStart) => Expanded(
        child: OutlinedButton(
          onPressed: () => _pick(isStart),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: Color(0xffffd398)),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: Text(
            date == null ? label : '$label : ${formatApiDate(date)}',
            style: GoogleFonts.montserrat(
              color: const Color(0xffffd398),
              fontSize: 12,
            ),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: _name,
          maxLength: 100,
          decoration: _decoration(context, 'Nom du programme'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _objectives,
          maxLines: 2,
          decoration: _decoration(context, 'Objectifs (facultatif)'),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _dateButton('Début', _start, true),
            const SizedBox(width: 10),
            _dateButton('Fin', _end, false),
            if (_end != null)
              IconButton(
                icon: const Icon(Icons.clear, color: Colors.white54),
                tooltip: 'Retirer la date de fin',
                onPressed: () => setState(() => _end = null),
              ),
          ],
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: _saveButton(_submit)),
      ],
    );
  }
}

/// Edits the name and notes of a day. Pops with the `PATCH` body.
Future<Map<String, dynamic>?> showDaySheet(
  BuildContext context,
  Map<String, dynamic> day,
) {
  return _showSheet(context, _DayForm(day: day));
}

class _DayForm extends StatefulWidget {
  final Map<String, dynamic> day;

  const _DayForm({required this.day});

  @override
  State<_DayForm> createState() => _DayFormState();
}

class _DayFormState extends State<_DayForm> {
  late final TextEditingController _name =
      TextEditingController(text: widget.day['name'] ?? '');
  late final TextEditingController _notes =
      TextEditingController(text: widget.day['notes'] ?? '');

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        TextField(
          controller: _name,
          maxLength: 100,
          decoration: _decoration(context, 'Nom du jour (facultatif)'),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _notes,
          maxLines: 3,
          decoration: _decoration(context, 'Notes (facultatif)'),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: _saveButton(() => Navigator.pop(
                context,
                buildDayFields(
                  name: _name.text,
                  notes: _notes.text,
                  clearEmpty: true,
                ),
              )),
        ),
      ],
    );
  }
}

/// Edits the prescription of an exercise. Pops with the fields; [existing]
/// is `null` when adding, in which case emptied fields are omitted.
Future<Map<String, dynamic>?> showExerciseSheet(
  BuildContext context, {
  required String title,
  Map<String, dynamic>? existing,
}) {
  return _showSheet(context, _ExerciseForm(title: title, existing: existing));
}

class _ExerciseForm extends StatefulWidget {
  final String title;
  final Map<String, dynamic>? existing;

  const _ExerciseForm({required this.title, this.existing});

  @override
  State<_ExerciseForm> createState() => _ExerciseFormState();
}

class _ExerciseFormState extends State<_ExerciseForm> {
  String _fmt(dynamic v) {
    if (v == null) return '';
    final d = (v as num).toDouble();
    return d == d.roundToDouble() ? d.toInt().toString() : d.toString();
  }

  late final _sets = TextEditingController(text: _fmt(widget.existing?['sets'] ?? 3));
  late final _reps = TextEditingController(text: _fmt(widget.existing?['reps'] ?? 10));
  late final _weight = TextEditingController(text: _fmt(widget.existing?['weight']));
  late final _rpe = TextEditingController(text: _fmt(widget.existing?['rpe']));
  late final _rest = TextEditingController(text: _fmt(widget.existing?['restSeconds']));
  late final _notes = TextEditingController(text: widget.existing?['notes'] ?? '');
  String? _error;

  @override
  void dispose() {
    for (final c in [_sets, _reps, _weight, _rpe, _rest, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  void _submit() {
    final sets = int.tryParse(_sets.text);
    final reps = int.tryParse(_reps.text);
    final weight = double.tryParse(_weight.text);
    final rpe = double.tryParse(_rpe.text);
    final rest = int.tryParse(_rest.text);

    if (sets == null || sets < 1 || reps == null || reps < 1) {
      setState(() => _error = 'Séries et répétitions : nombre entier ≥ 1.');
      return;
    }
    if ((weight != null && weight < 0) ||
        (rpe != null && (rpe < 0 || rpe > 10)) ||
        (rest != null && rest < 0)) {
      setState(() => _error = 'Valeurs invalides (RPE entre 0 et 10).');
      return;
    }

    Navigator.pop(
      context,
      buildExerciseFields(
        sets: sets,
        reps: reps,
        weight: weight,
        rpe: rpe,
        restSeconds: rest,
        notes: _notes.text,
        clearEmpty: widget.existing != null,
      ),
    );
  }

  Widget _field(TextEditingController c, String label, {bool decimal = false}) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 8),
        child: TextField(
          controller: c,
          keyboardType: TextInputType.numberWithOptions(decimal: decimal),
          decoration: _decoration(context, label),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 14),
        Row(children: [
          _field(_sets, 'Séries'),
          _field(_reps, 'Reps'),
          _field(_weight, 'Kg', decimal: true),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          _field(_rpe, 'RPE (0-10)', decimal: true),
          _field(_rest, 'Repos (s)'),
        ]),
        const SizedBox(height: 12),
        TextField(
          controller: _notes,
          maxLines: 2,
          decoration: _decoration(context, 'Notes (facultatif)'),
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: _saveButton(_submit)),
      ],
    );
  }
}

/// Asks how to copy a programme. With [assign] the coach picks the athlete
/// (required) and the copy keeps the source's name; otherwise it is a
/// duplicate with an editable name and, for a coach, an optional other athlete.
/// Pops with the request body for `assign` / `duplicate`.
Future<Map<String, dynamic>?> showCopySheet(
  BuildContext context, {
  required Map<String, dynamic> programme,
  required List<Map<String, dynamic>> athletes,
  required bool assign,
  required bool isCoach,
}) {
  return _showSheet(
    context,
    _CopyForm(
      programme: programme,
      athletes: athletes,
      assign: assign,
      isCoach: isCoach,
    ),
  );
}

class _CopyForm extends StatefulWidget {
  final Map<String, dynamic> programme;
  final List<Map<String, dynamic>> athletes;
  final bool assign;
  final bool isCoach;

  const _CopyForm({
    required this.programme,
    required this.athletes,
    required this.assign,
    required this.isCoach,
  });

  @override
  State<_CopyForm> createState() => _CopyFormState();
}

class _CopyFormState extends State<_CopyForm> {
  late final TextEditingController _name =
      TextEditingController(text: defaultCopyName(widget.programme['name']));
  String? _athleteId;
  DateTime? _start;
  DateTime? _end;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _pick(bool isStart) async {
    final fallback = DateTime.tryParse(
            widget.programme[isStart ? 'startDate' : 'endDate'] ?? '') ??
        DateTime.now();
    final picked = await showAppDatePicker(
      context: context,
      initialDate: (isStart ? _start : _end) ?? fallback,
    );
    if (picked != null) setState(() => isStart ? _start = picked : _end = picked);
  }

  void _submit() {
    if (widget.assign && _athleteId == null) {
      setState(() => _error = 'Choisissez un athlète.');
      return;
    }
    if (!widget.assign) {
      final n = _name.text.trim();
      if (n.isEmpty || n.length > 100) {
        setState(() => _error = 'Le nom doit faire entre 1 et 100 caractères.');
        return;
      }
    }
    if (_start != null && _end != null && _end!.isBefore(_start!)) {
      setState(() => _error = 'La date de fin doit être après la date de début.');
      return;
    }

    Navigator.pop(
      context,
      widget.assign
          ? buildAssignPayload(
              athleteId: _athleteId!,
              startDate: _start,
              endDate: _end,
            )
          : buildDuplicatePayload(
              name: _name.text,
              athleteId: _athleteId,
              startDate: _start,
              endDate: _end,
            ),
    );
  }

  Widget _dateButton(String label, DateTime? date, bool isStart, VoidCallback onClear) {
    return Expanded(
      child: Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => _pick(isStart),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xffffd398)),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              child: Text(
                date == null ? label : '$label : ${formatApiDate(date)}',
                style: GoogleFonts.montserrat(
                  color: const Color(0xffffd398),
                  fontSize: 11,
                ),
              ),
            ),
          ),
          if (date != null)
            IconButton(
              icon: const Icon(Icons.clear, size: 18, color: Colors.white54),
              tooltip: 'Réinitialiser',
              onPressed: onClear,
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasAthlete = widget.programme['athlete'] != null;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.assign ? 'Assigner à un athlète' : 'Dupliquer le programme',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 6),
        Text(
          widget.assign
              ? "Une copie est créée pour l'athlète, qui est notifié. L'original reste inchangé."
              : "Une copie avec tous les jours et exercices est créée. L'original reste inchangé.",
          style: GoogleFonts.montserrat(color: Colors.white54, fontSize: 12),
        ),
        const SizedBox(height: 14),
        if (!widget.assign) ...[
          TextField(
            controller: _name,
            maxLength: 100,
            decoration: _decoration(context, 'Nom de la copie'),
          ),
          const SizedBox(height: 4),
        ],
        if (widget.isCoach) ...[
          DropdownButtonFormField<String?>(
            initialValue: _athleteId,
            decoration: _decoration(context, 'Athlète'),
            items: [
              if (!widget.assign)
                DropdownMenuItem(
                  value: null,
                  child: Text(hasAthlete ? "Comme l'original" : 'Aucun (modèle)'),
                ),
              for (final a in widget.athletes)
                DropdownMenuItem(
                  value: a['id'] as String,
                  child: Text(a['user']?['username'] ?? ''),
                ),
            ],
            onChanged: (v) => setState(() => _athleteId = v),
          ),
          if (widget.athletes.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                "Aucun athlète avec une relation acceptée pour l'instant.",
                style: GoogleFonts.montserrat(color: Colors.white54, fontSize: 12),
              ),
            ),
          const SizedBox(height: 12),
        ],
        Text(
          "Dates (facultatif, par défaut celles de l'original)",
          style: GoogleFonts.montserrat(color: Colors.white54, fontSize: 12),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            _dateButton('Début', _start, true, () => setState(() => _start = null)),
            const SizedBox(width: 8),
            _dateButton('Fin', _end, false, () => setState(() => _end = null)),
          ],
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: 10),
            child: Text(_error!, style: const TextStyle(color: Colors.red)),
          ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          child: _saveButton(_submit, label: widget.assign ? 'Assigner' : 'Dupliquer'),
        ),
      ],
    );
  }
}
