import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../screens/exercise_create_page.dart';
import '../services/api_service.dart';
import '../utils/exercise_utils.dart';
import '../config/app_colors.dart';

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
    final created = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => ExerciseCreatePage(initialName: _query),
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
                  color: AppColors.accent),
              title: Text(
                'Créer un nouvel exercice',
                style: GoogleFonts.montserrat(
                  color: AppColors.accent,
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
                            leading: e['imageUrl'] == null
                                ? null
                                : ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: Image.network(
                                      e['imageUrl'],
                                      width: 48,
                                      height: 48,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, _, _) =>
                                          const SizedBox(width: 48, height: 48),
                                    ),
                                  ),
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
                                      color: AppColors.accent,
                                    ),
                                  )
                                : e['isTemplate'] == true
                                    ? const Text(
                                        'Suggestion',
                                        style: TextStyle(
                                          color: AppColors.accent,
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
