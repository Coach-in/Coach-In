import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/exercise_utils.dart';

/// Searchable bottom-sheet content listing the exercise catalogue. Pops with
/// the chosen exercise map, which may be a freshly created one: the catalogue
/// starts empty on a new database, so exercises can be added from here.
class ExercisePicker extends StatefulWidget {
  final List<Map<String, dynamic>> catalogue;

  const ExercisePicker({super.key, required this.catalogue});

  @override
  State<ExercisePicker> createState() => _ExercisePickerState();
}

class _ExercisePickerState extends State<ExercisePicker> {
  final ApiService _apiService = ApiService();
  String _query = '';
  String? _busyName;

  /// A default is copied into the catalogue the first time it is chosen.
  Future<void> _choose(Map<String, dynamic> exercise) async {
    if (exercise['isTemplate'] != true) {
      Navigator.pop(context, exercise);
      return;
    }
    setState(() => _busyName = exercise['name']);
    try {
      final created = await _apiService.materializeExercise(exercise);
      if (mounted) Navigator.pop(context, created);
    } catch (e) {
      if (!mounted) return;
      setState(() => _busyName = null);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage(e, fallback: "Impossible d'ajouter l'exercice.")),
        ),
      );
    }
  }

  Future<void> _createExercise() async {
    final created = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _NewExerciseDialog(
        apiService: _apiService,
        initialName: _query,
      ),
    );
    if (created != null && mounted) Navigator.pop(context, created);
  }

  @override
  Widget build(BuildContext context) {
    final matches = mergeWithDefaults(widget.catalogue)
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
            ListTile(
              leading: const Icon(Icons.add_circle_outline,
                  color: Color(0xffffd398)),
              title: Text(
                'Créer un nouvel exercice',
                style: GoogleFonts.montserrat(
                  color: const Color(0xffffd398),
                  fontWeight: FontWeight.w600,
                ),
              ),
              onTap: _createExercise,
            ),
            Expanded(
              child: matches.isEmpty
                  ? Center(
                      child: Text(
                        'Aucun exercice trouvé. Créez-le avec le bouton ci-dessus.',
                        textAlign: TextAlign.center,
                      ),
                    )
                  : ListView(
                      children: [
                        for (final e in matches)
                          ListTile(
                            enabled: _busyName == null,
                            title: Text(e['name']),
                            subtitle: e['description'] == null
                                ? null
                                : Text(
                                    e['description'],
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                            trailing: _busyName == e['name']
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Color(0xffffd398),
                                    ),
                                  )
                                : e['isTemplate'] == true
                                    ? const Text(
                                        'Suggestion',
                                        style: TextStyle(
                                          color: Color(0xffffd398),
                                          fontSize: 11,
                                        ),
                                      )
                                    : null,
                            onTap: () => _choose(e),
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

class _NewExerciseDialog extends StatefulWidget {
  final ApiService apiService;
  final String initialName;

  const _NewExerciseDialog({
    required this.apiService,
    required this.initialName,
  });

  @override
  State<_NewExerciseDialog> createState() => _NewExerciseDialogState();
}

class _NewExerciseDialogState extends State<_NewExerciseDialog> {
  late final TextEditingController _name =
      TextEditingController(text: widget.initialName);
  final TextEditingController _description = TextEditingController();
  bool _isSaving = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_name.text.trim().isEmpty) {
      setState(() => _error = "Le nom de l'exercice est obligatoire.");
      return;
    }
    setState(() {
      _isSaving = true;
      _error = null;
    });
    try {
      final created = await widget.apiService
          .createExercise(_name.text, description: _description.text);
      if (mounted) Navigator.pop(context, created);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _error = errorMessage(e, fallback: "Création de l'exercice impossible.");
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nouvel exercice'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _name,
            autofocus: true,
            maxLength: 100,
            decoration: const InputDecoration(labelText: 'Nom'),
          ),
          TextField(
            controller: _description,
            maxLines: 3,
            decoration:
                const InputDecoration(labelText: 'Description (facultatif)'),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _isSaving ? null : () => Navigator.pop(context),
          child: const Text('Annuler'),
        ),
        TextButton(
          onPressed: _isSaving ? null : _save,
          child: _isSaving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Créer'),
        ),
      ],
    );
  }
}
