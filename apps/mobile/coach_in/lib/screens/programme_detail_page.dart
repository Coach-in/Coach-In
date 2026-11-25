import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/programme_utils.dart';

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

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final programme = await _apiService.fetchProgramme(widget.programmeId);
      if (!mounted) return;
      setState(() => _programme = programme);
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage =
          errorMessage(e, fallback: 'Impossible de charger le programme.'));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer ce programme ?'),
        content: const Text('Les jours et exercices seront aussi supprimés.'),
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
    if (confirmed != true) return;

    try {
      await _apiService.deleteProgramme(widget.programmeId);
      if (!mounted) return;
      Navigator.pop(context);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessage(e, fallback: 'Suppression impossible.'))),
      );
    }
  }

  Widget _buildCard(String title, Widget content) {
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
          Text(
            title,
            style: GoogleFonts.montserrat(
              color: const Color(0xffffd398),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _text(e['exercise']?['name'] ?? ''),
                  _text(describeProgrammeExercise(e), muted: true),
                  if (e['notes'] != null) _text(e['notes'], muted: true),
                ],
              ),
            ),
        ],
      ),
    );
  }

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
          if (_programme != null)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Color(0xffffd398)),
              tooltip: 'Supprimer',
              onPressed: _delete,
            ),
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
