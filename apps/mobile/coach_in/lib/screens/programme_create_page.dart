import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/programme_utils.dart';

/// Programme builder. A coach can assign the programme to one of their
/// athletes (accepted relationship) or save it as a template; an athlete
/// always creates it for themself.
class ProgrammeCreatePage extends StatefulWidget {
  final String role;

  const ProgrammeCreatePage({super.key, required this.role});

  @override
  State<ProgrammeCreatePage> createState() => _ProgrammeCreatePageState();
}

class _ProgrammeCreatePageState extends State<ProgrammeCreatePage> {
  final ApiService _apiService = ApiService();
  final _nameController = TextEditingController();
  final _objectivesController = TextEditingController();

  DateTime? _startDate = DateTime.now();
  DateTime? _endDate;
  String? _athleteId;
  final List<DraftDay> _days = [DraftDay()];

  List<Map<String, dynamic>> _athletes = [];
  List<Map<String, dynamic>> _catalogue = [];

  bool _isSaving = false;
  String? _errorMessage;

  bool get _isCoach => widget.role == 'coach';

  @override
  void initState() {
    super.initState();
    _loadOptions();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _objectivesController.dispose();
    super.dispose();
  }

  Future<void> _loadOptions() async {
    try {
      final exercises = await _apiService.fetchExercises();
      var athletes = <Map<String, dynamic>>[];
      if (_isCoach) {
        final relationships = await _apiService.fetchRelationships();
        athletes = [
          for (final r in relationships)
            if (r['status'] == 'accepted' && r['athlete'] != null)
              Map<String, dynamic>.from(r['athlete']),
        ];
      }
      if (!mounted) return;
      setState(() {
        _catalogue = List<Map<String, dynamic>>.from(exercises);
        _athletes = athletes;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage =
          errorMessage(e, fallback: 'Impossible de charger le catalogue.'));
    }
  }

  Future<void> _pickDate({required bool isStart}) async {
    final initial = (isStart ? _startDate : _endDate) ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );
    if (picked == null) return;
    setState(() => isStart ? _startDate = picked : _endDate = picked);
  }

  Future<void> _addExercise(DraftDay day) async {
    final chosen = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.primary,
      builder: (_) => _ExercisePicker(catalogue: _catalogue),
    );
    if (chosen == null) return;
    setState(() => day.exercises.add(
          DraftExercise(exerciseId: chosen['id'], name: chosen['name']),
        ));
  }

  Future<void> _save() async {
    final error = validateProgrammeDraft(
      name: _nameController.text,
      startDate: _startDate,
      endDate: _endDate,
    );
    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await _apiService.createProgramme(buildProgrammePayload(
        name: _nameController.text,
        objectives: _objectivesController.text,
        startDate: _startDate!,
        endDate: _endDate,
        athleteId: _isCoach ? _athleteId : null,
        days: _days,
      ));
      if (!mounted) return;
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage =
          errorMessage(e, fallback: 'Création du programme impossible.'));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: Theme.of(context).textTheme.labelSmall,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      );

  Widget _dateButton(String label, DateTime? date, bool isStart) {
    return Expanded(
      child: OutlinedButton(
        onPressed: () => _pickDate(isStart: isStart),
        style: OutlinedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 14),
          side: const BorderSide(color: Color(0xffffd398)),
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
  }

  Widget _numberField({
    required String label,
    required String initial,
    required void Function(String) onChanged,
  }) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(right: 8),
        child: TextFormField(
          initialValue: initial,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: _decoration(label),
          onChanged: onChanged,
        ),
      ),
    );
  }

  Widget _buildExercise(DraftDay day, DraftExercise e) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  e.name,
                  style: GoogleFonts.montserrat(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: Colors.white54),
                tooltip: 'Retirer',
                onPressed: () => setState(() => day.exercises.remove(e)),
              ),
            ],
          ),
          Row(
            children: [
              _numberField(
                label: 'Séries',
                initial: '${e.sets}',
                onChanged: (v) => e.sets = int.tryParse(v) ?? e.sets,
              ),
              _numberField(
                label: 'Reps',
                initial: '${e.reps}',
                onChanged: (v) => e.reps = int.tryParse(v) ?? e.reps,
              ),
              _numberField(
                label: 'Kg',
                initial: '',
                onChanged: (v) => e.weight = double.tryParse(v),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _numberField(
                label: 'RPE (0-10)',
                initial: '',
                onChanged: (v) {
                  final rpe = double.tryParse(v);
                  e.rpe = rpe?.clamp(0, 10).toDouble();
                },
              ),
              _numberField(
                label: 'Repos (s)',
                initial: '',
                onChanged: (v) => e.restSeconds = int.tryParse(v),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildDay(int index) {
    final day = _days[index];

    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xff1b2a41),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'JOUR ${index + 1}',
                  style: GoogleFonts.montserrat(
                    color: const Color(0xffffd398),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
              if (_days.length > 1)
                IconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.white54),
                  tooltip: 'Supprimer le jour',
                  onPressed: () => setState(() => _days.removeAt(index)),
                ),
            ],
          ),
          TextFormField(
            initialValue: day.name,
            decoration: _decoration('Nom du jour (facultatif)'),
            onChanged: (v) => day.name = v,
          ),
          for (final e in day.exercises) _buildExercise(day, e),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _catalogue.isEmpty ? null : () => _addExercise(day),
            icon: const Icon(Icons.add, color: Color(0xffffd398)),
            label: const Text(
              'Ajouter un exercice',
              style: TextStyle(color: Color(0xffffd398)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Nouveau programme'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _nameController,
            maxLength: 100,
            decoration: _decoration('Nom du programme'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _objectivesController,
            maxLines: 2,
            decoration: _decoration('Objectifs (facultatif)'),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _dateButton('Début', _startDate, true),
              const SizedBox(width: 10),
              _dateButton('Fin', _endDate, false),
            ],
          ),
          if (_isCoach) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String?>(
              initialValue: _athleteId,
              decoration: _decoration('Athlète'),
              items: [
                const DropdownMenuItem(
                  value: null,
                  child: Text('Aucun (modèle)'),
                ),
                for (final a in _athletes)
                  DropdownMenuItem(
                    value: a['id'] as String,
                    child: Text(a['user']?['username'] ?? ''),
                  ),
              ],
              onChanged: (v) => setState(() => _athleteId = v),
            ),
          ],
          for (var i = 0; i < _days.length; i++) _buildDay(i),
          TextButton.icon(
            onPressed: () => setState(() => _days.add(DraftDay())),
            icon: const Icon(Icons.add, color: Color(0xffffd398)),
            label: const Text(
              'Ajouter un jour',
              style: TextStyle(color: Color(0xffffd398)),
            ),
          ),
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            ),
          const SizedBox(height: 10),
          ElevatedButton(
            onPressed: _isSaving ? null : _save,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 15),
              backgroundColor: const Color(0xffffd398),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.black,
                      strokeWidth: 2.5,
                    ),
                  )
                : Text(
                    'Enregistrer',
                    style: GoogleFonts.montserrat(
                      fontSize: 16,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

class _ExercisePicker extends StatefulWidget {
  final List<Map<String, dynamic>> catalogue;

  const _ExercisePicker({required this.catalogue});

  @override
  State<_ExercisePicker> createState() => _ExercisePickerState();
}

class _ExercisePickerState extends State<_ExercisePicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final matches = widget.catalogue
        .where((e) =>
            (e['name'] as String).toLowerCase().contains(_query.toLowerCase()))
        .toList();

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            TextField(
              autofocus: true,
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Rechercher un exercice',
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
            Expanded(
              child: matches.isEmpty
                  ? const Center(child: Text('Aucun exercice trouvé.'))
                  : ListView(
                      children: [
                        for (final e in matches)
                          ListTile(
                            title: Text(e['name']),
                            subtitle: e['description'] == null
                                ? null
                                : Text(
                                    e['description'],
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                            onTap: () => Navigator.pop(context, e),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
