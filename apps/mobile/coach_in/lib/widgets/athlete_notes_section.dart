import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_colors.dart';
import '../data/notes_repository.dart';
import 'form_error.dart';

/// Coach-only notes block shown on the athlete profile.
class AthleteNotesSection extends StatefulWidget {
  final String athleteId;
  final NotesRepository repository;

  const AthleteNotesSection({
    super.key,
    required this.athleteId,
    required this.repository,
  });

  @override
  State<AthleteNotesSection> createState() => _AthleteNotesSectionState();
}

class _AthleteNotesSectionState extends State<AthleteNotesSection> {
  List<CoachNote>? _notes;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final notes = await widget.repository.fetchNotes(widget.athleteId);
      if (mounted) setState(() => _notes = notes);
    } catch (_) {
      if (mounted) setState(() => _error = 'Failed to load notes');
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      await _load();
    } catch (_) {
      if (mounted) setState(() => _error = 'Action failed, please retry');
    }
  }

  Future<void> _openEditor({CoachNote? note}) async {
    final text = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.primary,
      builder: (_) => _NoteSheet(initial: note?.content),
    );
    if (text == null) return;
    await _run(() async {
      if (note == null) {
        await widget.repository.createNote(widget.athleteId, text);
      } else {
        await widget.repository.updateNote(widget.athleteId, note.id, text);
      }
    });
  }

  Future<void> _confirmDelete(CoachNote note) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(
          'Delete this note?',
          style: GoogleFonts.montserrat(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        actions: [
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.accent),
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.accent),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _run(
          () => widget.repository.deleteNote(widget.athleteId, note.id));
    }
  }

  String _date(DateTime d) =>
      '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';

  @override
  Widget build(BuildContext context) {
    final notes = _notes;
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
          Row(
            children: [
              Expanded(
                child: Text(
                  'PRIVATE NOTES',
                  style: GoogleFonts.montserrat(
                    color: AppColors.accent,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Add a note',
                icon: const Icon(Icons.add, color: AppColors.accent),
                onPressed: () => _openEditor(),
              ),
            ],
          ),
          Text(
            'Only you can see these notes.',
            style: GoogleFonts.montserrat(color: Colors.white54, fontSize: 11),
          ),
          const SizedBox(height: 10),
          FormError(_error),
          if (notes == null && _error == null)
            const Center(child: CircularProgressIndicator())
          else if (notes != null && notes.isEmpty)
            Text(
              'No notes yet',
              style: GoogleFonts.montserrat(color: Colors.white70),
            )
          else if (notes != null)
            for (final n in notes)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(
                  n.content,
                  style: GoogleFonts.montserrat(
                      color: Colors.white, fontSize: 13),
                ),
                subtitle: Text(
                  _date(n.createdAt),
                  style: GoogleFonts.montserrat(
                      color: Colors.white54, fontSize: 11),
                ),
                onTap: () => _openEditor(note: n),
                trailing: IconButton(
                  tooltip: 'Delete note',
                  icon: const Icon(Icons.delete_outline, color: Colors.white54),
                  onPressed: () => _confirmDelete(n),
                ),
              ),
          if (_error != null)
            TextButton(onPressed: _load, child: const Text('Retry')),
        ],
      ),
    );
  }
}

class _NoteSheet extends StatefulWidget {
  final String? initial;
  const _NoteSheet({this.initial});

  @override
  State<_NoteSheet> createState() => _NoteSheetState();
}

class _NoteSheetState extends State<_NoteSheet> {
  late final _controller = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: _controller,
            autofocus: true,
            maxLines: 5,
            style: const TextStyle(color: Colors.white),
            cursorColor: AppColors.accent,
            decoration: InputDecoration(
              hintText: 'Write a note…',
              hintStyle: const TextStyle(color: Colors.white54),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.accent),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: AppColors.accent, width: 2),
              ),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                final text = _controller.text.trim();
                if (text.isNotEmpty) Navigator.pop(context, text);
              },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                backgroundColor: AppColors.accent,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
              child: Text(
                'Enregistrer',
                style: GoogleFonts.montserrat(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
