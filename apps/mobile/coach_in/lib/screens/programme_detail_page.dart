import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/programme_utils.dart';
import '../widgets/exercise_picker.dart';
import '../widgets/programme_edit_sheets.dart';

class ProgrammeDetailPage extends StatefulWidget {
  final String programmeId;

  const ProgrammeDetailPage({super.key, required this.programmeId});

  @override
  State<ProgrammeDetailPage> createState() => _ProgrammeDetailPageState();
}

class _ProgrammeDetailPageState extends State<ProgrammeDetailPage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _programme;
  String? _userId;
  List<Map<String, dynamic>>? _catalogue;

  bool get _isOwner =>
      _programme != null && isProgrammeOwner(_programme!, _userId);

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  /// [silent] keeps the current content on screen while reloading (used after edits).
  Future<void> _fetch({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }
    try {
      _userId ??= (await _apiService.fetchCurrentUser())['id'];
      final programme = await _apiService.fetchProgramme(widget.programmeId);
      if (!mounted) return;
      setState(() => _programme = programme);
    } catch (e) {
      if (!mounted) return;
      if (silent) {
        _showError(e, 'Impossible de recharger le programme.');
      } else {
        setState(() => _errorMessage =
            errorMessage(e, fallback: 'Impossible de charger le programme.'));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(Object e, String fallback) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(errorMessage(e, fallback: fallback))),
    );
  }

  /// Runs an edit call, then reloads the programme.
  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      await _fetch(silent: true);
    } catch (e) {
      if (mounted) _showError(e, 'Modification impossible.');
    }
  }

  Future<void> _editInfo() async {
    final patch = await showProgrammeInfoSheet(context, _programme!);
    if (patch == null || patch.isEmpty) return;
    await _run(() => _apiService.updateProgramme(widget.programmeId, patch));
  }

  Future<void> _addDay() async {
    final fields = await showDaySheet(context, const {});
    if (fields == null) return;
    final days = _programme!['days'] as List? ?? [];
    await _run(() => _apiService.addProgrammeDay(widget.programmeId, {
          'dayIndex': nextDayIndex(days),
          ...fields,
        }));
  }

  Future<void> _editDay(Map<String, dynamic> day) async {
    final fields = await showDaySheet(context, day);
    if (fields == null) return;
    await _run(() =>
        _apiService.updateProgrammeDay(widget.programmeId, day['id'], fields));
  }

  Future<bool> _confirm(String title, String message) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    return ok == true;
  }

  Future<void> _deleteDay(Map<String, dynamic> day) async {
    if (!await _confirm('Supprimer ce jour ?', 'Ses exercices seront supprimés.')) {
      return;
    }
    await _run(() => _apiService.deleteProgrammeDay(widget.programmeId, day['id']));
  }

  Future<void> _addExercise(Map<String, dynamic> day) async {
    try {
      _catalogue ??= List<Map<String, dynamic>>.from(
          await _apiService.fetchExercises());
    } catch (e) {
      if (mounted) _showError(e, 'Impossible de charger le catalogue.');
      return;
    }
    if (!mounted) return;

    final chosen = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.primary,
      builder: (_) => ExercisePicker(catalogue: _catalogue!),
    );
    if (chosen == null || !mounted) return;
    if (!_catalogue!.any((e) => e['id'] == chosen['id'])) _catalogue!.add(chosen);

    final fields = await showExerciseSheet(context, title: chosen['name']);
    if (fields == null) return;

    final existing = day['exercises'] as List? ?? [];
    await _run(() => _apiService.addProgrammeExercise(
          widget.programmeId,
          day['id'],
          {
            'exerciseId': chosen['id'],
            'order': nextExerciseOrder(existing),
            ...fields,
          },
        ));
  }

  Future<void> _editExercise(
      Map<String, dynamic> day, Map<String, dynamic> e) async {
    final fields = await showExerciseSheet(
      context,
      title: e['exercise']?['name'] ?? '',
      existing: e,
    );
    if (fields == null) return;
    await _run(() => _apiService.updateProgrammeExercise(
        widget.programmeId, day['id'], e['id'], fields));
  }

  Future<void> _deleteExercise(
      Map<String, dynamic> day, Map<String, dynamic> e) async {
    if (!await _confirm('Retirer cet exercice ?', e['exercise']?['name'] ?? '')) {
      return;
    }
    await _run(() => _apiService.deleteProgrammeExercise(
        widget.programmeId, day['id'], e['id']));
  }

  Future<void> _delete() async {
    if (!await _confirm('Supprimer ce programme ?',
        'Les jours et exercices seront aussi supprimés.')) {
      return;
    }
    try {
      await _apiService.deleteProgramme(widget.programmeId);
      if (!mounted) return;
      Navigator.pop(context);
    } catch (e) {
      if (mounted) _showError(e, 'Suppression impossible.');
    }
  }

  Widget _buildCard(String title, Widget content, {Widget? trailing}) {
    return Container(
      width: double.infinity,
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
                  title,
                  style: GoogleFonts.montserrat(
                    color: const Color(0xffffd398),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: 10),
          content,
        ],
      ),
    );
  }

  Widget _text(String text, {bool muted = false}) => Text(
        text,
        style: GoogleFonts.montserrat(
          color: muted ? Colors.white54 : Colors.white,
          fontSize: muted ? 12 : 13,
        ),
      );

  Widget _buildDay(Map<String, dynamic> day) {
    final name = day['name'] as String?;
    final title = 'JOUR ${day['dayIndex']}'
        '${name != null && name.isNotEmpty ? ' · ${name.toUpperCase()}' : ''}';
    final exercises = List<Map<String, dynamic>>.from(day['exercises'] ?? []);

    return _buildCard(
      title,
      trailing: _isOwner
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _iconButton(Icons.edit, 'Modifier le jour', () => _editDay(day)),
                _iconButton(
                    Icons.delete_outline, 'Supprimer le jour', () => _deleteDay(day)),
              ],
            )
          : null,
      Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (day['notes'] != null) ...[
            _text(day['notes'], muted: true),
            const SizedBox(height: 8),
          ],
          if (exercises.isEmpty) _text('Aucun exercice.', muted: true),
          for (final e in exercises)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _text(e['exercise']?['name'] ?? ''),
                        _text(describeProgrammeExercise(e), muted: true),
                        if (e['notes'] != null) _text(e['notes'], muted: true),
                      ],
                    ),
                  ),
                  if (_isOwner) ...[
                    _iconButton(Icons.edit, 'Modifier', () => _editExercise(day, e)),
                    _iconButton(
                        Icons.close, 'Retirer', () => _deleteExercise(day, e)),
                  ],
                ],
              ),
            ),
          if (_isOwner)
            TextButton.icon(
              onPressed: () => _addExercise(day),
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

  Widget _iconButton(IconData icon, String tooltip, VoidCallback onPressed) =>
      IconButton(
        icon: Icon(icon, size: 18, color: Colors.white54),
        tooltip: tooltip,
        visualDensity: VisualDensity.compact,
        onPressed: onPressed,
      );

  Widget _buildContent(Map<String, dynamic> p) {
    final coach = p['coach']?['user']?['username'];
    final athlete = p['athlete']?['user']?['username'];
    final dates = [p['startDate'], p['endDate']].whereType<String>().join(' → ');
    final days = List<Map<String, dynamic>>.from(p['days'] ?? []);

    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(
        children: [
          Text(
            p['name'] ?? '',
            style: GoogleFonts.montserrat(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          _text(dates, muted: true),
          if (coach != null) _text('Coach : $coach', muted: true),
          if (athlete != null) _text('Athlète : $athlete', muted: true),
          if (p['objectives'] != null)
            _buildCard('OBJECTIFS', _text(p['objectives'])),
          if (days.isEmpty)
            _buildCard('JOURS', _text('Aucun jour planifié.', muted: true)),
          for (final day in days) _buildDay(day),
          if (_isOwner)
            TextButton.icon(
              onPressed: _addDay,
              icon: const Icon(Icons.add, color: Color(0xffffd398)),
              label: const Text(
                'Ajouter un jour',
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
        title: const Text('Programme'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          if (_isOwner) ...[
            IconButton(
              icon: const Icon(Icons.edit, color: Color(0xffffd398)),
              tooltip: 'Modifier',
              onPressed: _editInfo,
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Color(0xffffd398)),
              tooltip: 'Supprimer',
              onPressed: _delete,
            ),
          ],
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xffffd398)),
              )
            : _errorMessage != null
                ? Center(child: Text(_errorMessage!))
                : _buildContent(_programme!),
      ),
    );
  }
}
