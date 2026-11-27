import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_colors.dart';
import '../data/chat_repository.dart';
import '../services/api_service.dart';
import './chat_thread_page.dart';

/// Peers are the accepted connections of the current user.
Future<List<ChatPeer>> _loadAcceptedPeers() async {
  final api = ApiService();
  final user = await api.fetchCurrentUser();
  final isCoach = user['role'] == 'coach';
  final relationships = await api.fetchRelationships();
  return [
    for (final r in relationships)
      if (r['status'] == 'accepted')
        ChatPeer(
          id: '${r['id']}',
          name: (isCoach ? r['athlete'] : r['coach'])?['user']?['username'] ??
              'Unknown',
        ),
  ];
}

/// Survives tab rebuilds so messages persist while the app runs (mock only).
final ChatRepository _sharedChat =
    InMemoryChatRepository(loadPeers: _loadAcceptedPeers);

/// List of conversations, one per accepted connection.
class ConversationsPage extends StatefulWidget {
  final ChatRepository? repository;

  const ConversationsPage({super.key, this.repository});

  @override
  State<ConversationsPage> createState() => _ConversationsPageState();
}

class _ConversationsPageState extends State<ConversationsPage> {
  late final ChatRepository _repository = widget.repository ?? _sharedChat;

  bool _isLoading = true;
  String? _error;
  List<Conversation> _conversations = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final conversations = await _repository.fetchConversations();
      if (mounted) setState(() => _conversations = conversations);
    } catch (_) {
      if (mounted) setState(() => _error = 'Impossible de charger les messages');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _open(Conversation c) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ChatThreadPage(peer: c.peer, repository: _repository),
      ),
    );
    if (mounted) _load();
  }

  String _time(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  Widget _tile(Conversation c) {
    final last = c.lastMessage;
    return GestureDetector(
      onTap: () => _open(c),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: c.unread > 0 ? AppColors.surfaceRaised : AppColors.surface,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white12),
        ),
        child: Row(
          children: [
            const CircleAvatar(
              backgroundColor: AppColors.accent,
              child: Icon(Icons.person, color: Colors.black),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    c.peer.name,
                    style: GoogleFonts.montserrat(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    last?.text ?? 'Aucun message',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.montserrat(
                      color: c.unread > 0 ? Colors.white : Colors.white54,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (last != null)
                  Text(
                    _time(last.sentAt),
                    style: GoogleFonts.montserrat(
                        color: Colors.white54, fontSize: 11),
                  ),
                if (c.unread > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: AppColors.accent,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${c.unread}',
                      style: GoogleFonts.montserrat(
                        color: Colors.black,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.accent),
      );
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!),
            TextButton(
              style: TextButton.styleFrom(foregroundColor: AppColors.accent),
              onPressed: _load,
              child: const Text('Réessayer'),
            ),
          ],
        ),
      );
    }
    if (_conversations.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Aucune conversation. Connectez-vous à un coach ou un athlète '
            'pour discuter.',
            textAlign: TextAlign.center,
            style: GoogleFonts.montserrat(color: Colors.white70),
          ),
        ),
      );
    }
    return RefreshIndicator(
      color: AppColors.accent,
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: _conversations.map(_tile).toList(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Messages'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        automaticallyImplyLeading: false,
      ),
      body: _body(),
    );
  }
}
