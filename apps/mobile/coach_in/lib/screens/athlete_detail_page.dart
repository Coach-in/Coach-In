import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../config/app_colors.dart';
import '../data/notes_repository.dart';
import '../widgets/athlete_notes_section.dart';

/// Read-only athlete profile for coaches.
///
/// Built from the athlete object embedded in `GET /relationships`, because
/// `GET /athletes/:id` is restricted to the athlete themself or an admin.
class AthleteDetailPage extends StatelessWidget {
  final Map<String, dynamic> athlete;

  /// Notes source. Defaults to an in-memory store until the notes API (#72)
  /// is available.
  final NotesRepository? notesRepository;

  const AthleteDetailPage({
    super.key,
    required this.athlete,
    this.notesRepository,
  });

  Widget _buildCard(String title, Widget content) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(top: 18),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.montserrat(
              color: AppColors.accent,
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

  Widget _buildText(String text) => Text(
        text,
        style: GoogleFonts.montserrat(color: Colors.white, fontSize: 13),
      );

  Widget _buildTagChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.accent),
      ),
      child: Text(
        label,
        style: GoogleFonts.montserrat(
          color: AppColors.accent,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final username = athlete['user']?['username'] as String? ?? 'Unknown';
    final age = athlete['age'];
    final goals = athlete['goals'] as String?;
    final tags = athlete['tags'] as List? ?? [];

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Athlete Profile'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(
            username,
            style: GoogleFonts.montserrat(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (age != null) _buildCard('AGE', _buildText('$age')),
          if (goals != null && goals.isNotEmpty)
            _buildCard('GOALS', _buildText(goals)),
          if (tags.isNotEmpty)
            _buildCard(
              'TAGS',
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children:
                    tags.map<Widget>((t) => _buildTagChip(t['name'])).toList(),
              ),
            ),
          AthleteNotesSection(
            athleteId: '${athlete['id']}',
            repository: notesRepository ?? _sharedNotes,
          ),
        ],
      ),
    );
  }
}

/// Survives page rebuilds so notes persist while the app runs (mock only).
final NotesRepository _sharedNotes = InMemoryNotesRepository();
