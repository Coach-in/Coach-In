import 'dart:async';

/// A person the current user can chat with (an accepted connection).
class ChatPeer {
  final String id;
  final String name;

  const ChatPeer({required this.id, required this.name});
}

class ChatMessage {
  final String id;
  final String text;
  final DateTime sentAt;

  /// True when the current user wrote the message.
  final bool mine;

  const ChatMessage({
    required this.id,
    required this.text,
    required this.sentAt,
    required this.mine,
  });
}

class Conversation {
  final ChatPeer peer;
  final ChatMessage? lastMessage;
  final int unread;

  const Conversation({required this.peer, this.lastMessage, this.unread = 0});
}

/// Source of chat data.
///
/// The chat API (issue #73) is not on `dev` yet, so the UI depends on this
/// interface and ships with [InMemoryChatRepository]. An API/websocket-backed
/// implementation replaces it once the contract is published.
abstract class ChatRepository {
  Future<List<Conversation>> fetchConversations();

  /// Messages of a conversation, oldest first. Opening a thread marks it read.
  Future<List<ChatMessage>> fetchMessages(String peerId);

  Future<ChatMessage> sendMessage(String peerId, String text);

  /// Messages received from [peerId] while the stream is listened to.
  Stream<ChatMessage> incoming(String peerId);

  /// Marks [peerId]'s conversation as read (e.g. a message arrived while the
  /// thread was open).
  void markRead(String peerId);
}

/// Volatile implementation used until the backend is available. Peers come
/// from [loadPeers]; each message sent gets an automatic reply after
/// [replyDelay] so the live behaviour can be seen. Pass a null delay to
/// disable replies.
class InMemoryChatRepository implements ChatRepository {
  final Future<List<ChatPeer>> Function() loadPeers;
  final Duration? replyDelay;

  final Map<String, List<ChatMessage>> _messages = {};
  final Map<String, int> _unread = {};
  final Map<String, StreamController<ChatMessage>> _controllers = {};
  int _nextId = 1;

  InMemoryChatRepository({
    required this.loadPeers,
    this.replyDelay = const Duration(seconds: 2),
  });

  StreamController<ChatMessage> _controller(String peerId) =>
      _controllers.putIfAbsent(peerId, StreamController.broadcast);

  ChatMessage _add(String peerId, String text, {required bool mine}) {
    final message = ChatMessage(
      id: '${_nextId++}',
      text: text,
      sentAt: DateTime.now(),
      mine: mine,
    );
    _messages.putIfAbsent(peerId, () => []).add(message);
    return message;
  }

  @override
  Future<List<Conversation>> fetchConversations() async {
    final peers = await loadPeers();
    return [
      for (final p in peers)
        Conversation(
          peer: p,
          lastMessage: _messages[p.id]?.last,
          unread: _unread[p.id] ?? 0,
        ),
    ];
  }

  @override
  Future<List<ChatMessage>> fetchMessages(String peerId) async {
    _unread[peerId] = 0;
    return List.unmodifiable(_messages[peerId] ?? const <ChatMessage>[]);
  }

  @override
  Future<ChatMessage> sendMessage(String peerId, String text) async {
    final sent = _add(peerId, text, mine: true);
    final delay = replyDelay;
    if (delay != null) {
      Timer(delay, () {
        final reply = _add(peerId, 'Bien reçu !', mine: false);
        final controller = _controller(peerId);
        if (controller.hasListener) {
          controller.add(reply);
        } else {
          _unread[peerId] = (_unread[peerId] ?? 0) + 1;
        }
      });
    }
    return sent;
  }

  @override
  Stream<ChatMessage> incoming(String peerId) => _controller(peerId).stream;

  @override
  void markRead(String peerId) => _unread[peerId] = 0;
}
