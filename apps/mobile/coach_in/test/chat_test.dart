import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:coach_in/data/chat_repository.dart';
import 'package:coach_in/screens/chat_thread_page.dart';
import 'package:coach_in/screens/conversations_page.dart';

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  const alice = ChatPeer(id: 'r1', name: 'alice');

  InMemoryChatRepository repo({List<ChatPeer> peers = const [alice]}) =>
      InMemoryChatRepository(loadPeers: () async => peers, replyDelay: null);

  testWidgets('lists a conversation per connection with its last message',
      (tester) async {
    final r = repo();
    await r.sendMessage('r1', 'Salut coach');
    await tester.pumpWidget(MaterialApp(home: ConversationsPage(repository: r)));
    await tester.pumpAndSettle();

    expect(find.text('alice'), findsOneWidget);
    expect(find.text('Salut coach'), findsOneWidget);
  });

  testWidgets('shows the empty state without connections', (tester) async {
    await tester.pumpWidget(
        MaterialApp(home: ConversationsPage(repository: repo(peers: []))));
    await tester.pumpAndSettle();

    expect(find.textContaining('Aucune conversation'), findsOneWidget);
  });

  testWidgets('shows an error and a retry button when loading fails',
      (tester) async {
    final failing = InMemoryChatRepository(
      loadPeers: () async => throw Exception('offline'),
      replyDelay: null,
    );
    await tester
        .pumpWidget(MaterialApp(home: ConversationsPage(repository: failing)));
    await tester.pumpAndSettle();

    expect(find.text('Réessayer'), findsOneWidget);
  });

  testWidgets('sends a message and shows it in the thread', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: ChatThreadPage(peer: alice, repository: repo()),
    ));
    await tester.pumpAndSettle();
    expect(find.textContaining('premier message'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'Bonjour');
    await tester.tap(find.byTooltip('Envoyer'));
    await tester.pumpAndSettle();

    expect(find.text('Bonjour'), findsOneWidget);
  });

  testWidgets('an incoming message appears live and unread is cleared',
      (tester) async {
    final r = InMemoryChatRepository(
      loadPeers: () async => [alice],
      replyDelay: const Duration(milliseconds: 100),
    );
    await tester.pumpWidget(MaterialApp(
      home: ChatThreadPage(peer: alice, repository: r),
    ));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Bonjour');
    await tester.tap(find.byTooltip('Envoyer'));
    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();

    expect(find.text('Bien reçu !'), findsOneWidget);
    expect((await r.fetchConversations()).single.unread, 0);
  });
}
