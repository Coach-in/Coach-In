import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _notifications = [];

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final notifications = await _apiService.fetchNotifications();
      if (!mounted) return;
      setState(() {
        _notifications = List<Map<String, dynamic>>.from(notifications)
          ..sort((a, b) => '${b['sentAt']}'.compareTo('${a['sentAt']}'));
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Failed to load notifications');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _markSeen(Map<String, dynamic> notif) async {
    if (notif['status'] == 'seen') return;

    try {
      await _apiService.markNotificationSeen(notif['id']);
      if (!mounted) return;
      setState(() => notif['status'] = 'seen');
    } catch (e) {
      if (!mounted) return;
      _showError('Could not mark the notification as seen');
    }
  }

  Future<void> _markAllSeen() async {
    final unread =
        _notifications.where((n) => n['status'] != 'seen').toList();

    for (final notif in unread) {
      await _markSeen(notif);
    }
  }

  Future<bool> _delete(Map<String, dynamic> notif) async {
    try {
      await _apiService.deleteNotification(notif['id']);
      if (!mounted) return true;
      setState(() => _notifications.remove(notif));
      return true;
    } catch (e) {
      if (mounted) _showError('Could not delete the notification');
      return false;
    }
  }

  Widget _buildNotificationTile(Map<String, dynamic> notif) {
    final isSeen = notif['status'] == 'seen';

    return Dismissible(
      key: ValueKey(notif['id']),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) => _delete(notif),
      background: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.only(right: 20),
        alignment: Alignment.centerRight,
        decoration: BoxDecoration(
          color: Colors.red.shade900,
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.delete_outline, color: Colors.white),
      ),
      child: GestureDetector(
        onTap: () => _markSeen(notif),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: isSeen ? const Color(0xff1b2a41) : const Color(0xff263859),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSeen ? Colors.white12 : const Color(0xffffd398),
            ),
          ),
          child: Row(
            children: [
              Icon(
                Icons.notifications,
                color: isSeen ? Colors.white38 : const Color(0xffffd398),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  '${notif['message']}',
                  style: GoogleFonts.montserrat(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: isSeen ? FontWeight.w400 : FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xffffd398)),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_errorMessage!),
            TextButton(
              onPressed: _fetchNotifications,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchNotifications,
      child: _notifications.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 120),
                Center(
                  child: Text(
                    'No notifications yet.',
                    style: GoogleFonts.montserrat(color: Colors.white54),
                  ),
                ),
              ],
            )
          : ListView(
              children: _notifications.map(_buildNotificationTile).toList(),
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _notifications.any((n) => n['status'] != 'seen');

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          if (hasUnread)
            IconButton(
              tooltip: 'Mark all as seen',
              icon: const Icon(Icons.done_all, color: Color(0xffffd398)),
              onPressed: _markAllSeen,
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: _buildBody(),
      ),
    );
  }
}
