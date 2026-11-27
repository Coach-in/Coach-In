/// A private note a coach keeps about an athlete.
class CoachNote {
  final String id;
  final String content;
  final DateTime createdAt;

  const CoachNote({
    required this.id,
    required this.content,
    required this.createdAt,
  });

  CoachNote copyWith({String? content}) =>
      CoachNote(id: id, content: content ?? this.content, createdAt: createdAt);
}

/// Source of coach notes.
///
/// The notes API (issue #72) is not on `dev` yet, so the UI depends on this
/// interface and ships with [InMemoryNotesRepository]. An API-backed
/// implementation replaces it once the contract is published.
abstract class NotesRepository {
  Future<List<CoachNote>> fetchNotes(String athleteId);
  Future<CoachNote> createNote(String athleteId, String content);
  Future<CoachNote> updateNote(String athleteId, String noteId, String content);
  Future<void> deleteNote(String athleteId, String noteId);
}

/// Volatile implementation used until the backend is available.
class InMemoryNotesRepository implements NotesRepository {
  final Map<String, List<CoachNote>> _notes = {};
  int _nextId = 1;

  @override
  Future<List<CoachNote>> fetchNotes(String athleteId) async =>
      List.unmodifiable(_notes[athleteId] ?? const <CoachNote>[]);

  @override
  Future<CoachNote> createNote(String athleteId, String content) async {
    final note = CoachNote(
      id: '${_nextId++}',
      content: content,
      createdAt: DateTime.now(),
    );
    _notes.putIfAbsent(athleteId, () => []).insert(0, note);
    return note;
  }

  @override
  Future<CoachNote> updateNote(
      String athleteId, String noteId, String content) async {
    final list = _notes[athleteId] ?? [];
    final i = list.indexWhere((n) => n.id == noteId);
    if (i == -1) throw Exception('Note not found');
    return list[i] = list[i].copyWith(content: content);
  }

  @override
  Future<void> deleteNote(String athleteId, String noteId) async {
    _notes[athleteId]?.removeWhere((n) => n.id == noteId);
  }
}
