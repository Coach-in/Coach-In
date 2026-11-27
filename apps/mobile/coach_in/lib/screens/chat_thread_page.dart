import 'dart:async';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../config/app_colors.dart';
import '../data/chat_repository.dart';
import '../widgets/form_error.dart';

/// One conversation: message bubbles and an input bar. New messages are
/// appended live from [ChatRepository.incoming].
class ChatThreadPage extends StatefulWidget {
  final ChatPeer peer;
  final ChatRepository repository;

  const ChatThreadPage({
    super.key,
    required this.peer,
    required this.repository,
  });

  @override
  State<ChatThreadPage> createState() => _ChatThreadPageState();
}

class _ChatThreadPageState extends State<ChatThreadPage> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  StreamSubscription<ChatMessage>? _subscription;

  List<ChatMessage>? _messages;
  String? _error;

  @override
  void initState() {
    super.initState();
    _subscription = widget.repository.incoming(widget.peer.id).listen((m) {
      if (!mounted) return;
      setState(() => _messages = [...?_messages, m]);
      widget.repository.markRead(widget.peer.id);
      _scrollToEnd();
    });
    _load();
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final messages = await widget.repository.fetchMessages(widget.peer.id);
      if (!mounted) return;
      setState(() => _messages = messages);
      _scrollToEnd();
    } catch (_) {
      if (mounted) setState(() => _error = 'Impossible de charger la conversation');
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    _input.clear();
    try {
      final sent = await widget.repository.sendMessage(widget.peer.id, text);
      if (!mounted) return;
      setState(() {
        _error = null;
        _messages = [...?_messages, sent];
      });
      _scrollToEnd();
    } catch (_) {
      if (!mounted) return;
      _input.text = text;
      setState(() => _error = "Le message n'a pas pu être envoyé");
    }
  }

  String _time(DateTime d) =>
      '${d.hour.toString().padLeft(2, '0')}:${d.minute.toString().padLeft(2, '0')}';

  Widget _bubble(ChatMessage m) {
    return Align(
      alignment: m.mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.75,
        ),
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: m.mine ? AppColors.accent : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: m.mine ? null : Border.all(color: Colors.white12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              m.text,
              style: GoogleFonts.montserrat(
                color: m.mine ? Colors.black : Colors.white,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              _time(m.sentAt),
              style: GoogleFonts.montserrat(
                color: m.mine ? Colors.black54 : Colors.white54,
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _list() {
    final messages = _messages;
    if (messages == null) {
      return _error != null
          ? Center(
              child: TextButton(
                style: TextButton.styleFrom(foregroundColor: AppColors.accent),
                onPressed: _load,
                child: Text('$_error. Réessayer'),
              ),
            )
          : const Center(
              child: CircularProgressIndicator(color: AppColors.accent),
            );
    }
    if (messages.isEmpty) {
      return Center(
        child: Text(
          'Envoyez le premier message à ${widget.peer.name}',
          style: GoogleFonts.montserrat(color: Colors.white70),
        ),
      );
    }
    return ListView(
      controller: _scroll,
      padding: const EdgeInsets.all(16),
      children: messages.map(_bubble).toList(),
    );
  }

  Widget _inputBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: _input,
                minLines: 1,
                maxLines: 4,
                style: const TextStyle(color: Colors.white),
                cursorColor: AppColors.accent,
                textInputAction: TextInputAction.send,
                onSubmitted: (_) => _send(),
                decoration: InputDecoration(
                  hintText: 'Votre message…',
                  hintStyle: const TextStyle(color: Colors.white54),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: const BorderSide(color: AppColors.accent),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide:
                        const BorderSide(color: AppColors.accent, width: 2),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              tooltip: 'Envoyer',
              style: IconButton.styleFrom(backgroundColor: AppColors.accent),
              icon: const Icon(Icons.send, color: Colors.black),
              onPressed: _send,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: Text(widget.peer.name),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: Column(
        children: [
          Expanded(child: _list()),
          if (_messages != null && _error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: FormError(_error),
            ),
          _inputBar(),
        ],
      ),
    );
  }
}
