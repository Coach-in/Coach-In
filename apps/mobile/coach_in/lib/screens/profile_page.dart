import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../widgets/app_bottom_nav.dart';
import './admin_profile_page.dart';
import './edit_profile_page.dart';
import './explore_page.dart';
import './notifications_page.dart';
import './start_page.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  bool _isLoggingOut = false;
  String? _errorMessage;

  List<Map<String, dynamic>> _notifications = [];

  Map<String, dynamic>? _profile;
  String? _role;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  Future<void> _fetchProfile() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = await _apiService.fetchCurrentUser();
      final role = user['role'];

      if (role == 'admin') {
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (_) => const AdminProfilePage()),
        );
        return;
      }

      Map<String, dynamic> profile;

      if (role == 'coach') {
        profile = await _apiService.fetchCoachInfo();
      } else {
        profile = await _apiService.fetchAthleteInfo();
      }

      final notifications = await _apiService.fetchNotifications();

      setState(() {
        _role = role;
        _profile = profile;
        _notifications = List<Map<String, dynamic>>.from(notifications);
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load profile';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _openEditProfile() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => EditProfilePage(
          profile: _profile!,
          isCoach: _role == 'coach',
        ),
      ),
    );
    if (saved == true && mounted) _fetchProfile();
  }

  Future<void> _logout() async {
    setState(() {
      _isLoggingOut = true;
      _errorMessage = null;
    });

    await _apiService.clearTokens();

    if (!mounted) return;

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => StartPage()),
    );
  }

  Future<void> _deleteAccount() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer le compte ?'),
        content: const Text(
            'Cette action est définitive : votre compte et votre profil seront supprimés.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    try {
      await _apiService.deleteAccount(_profile!['user']['id'] as String);
      if (!mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const StartPage()),
        (_) => false,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessage(e, fallback: 'Suppression impossible.'))),
      );
    }
  }

  /// Shown to a coach until an admin accepts their diploma document.
  Widget _buildPendingApprovalBanner() {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange),
      ),
      child: Row(
        children: [
          const Icon(Icons.hourglass_top, color: Colors.orange),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              "Votre diplôme est en cours de vérification. Vous n'apparaîtrez dans le catalogue qu'après validation.",
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic> profile) {
    final user = profile['user'];

    return Row(
      children: [
        CircleAvatar(
          radius: 32,
          backgroundColor: const Color(0xffffd398),
          child: const Icon(Icons.person, color: Colors.black, size: 32),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                user['username'] ?? '',
                style: GoogleFonts.montserrat(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _role == 'coach'
                    ? 'Coach'
                    : 'Athlete • Age ${profile['age'] ?? '-'}',
                style: GoogleFonts.montserrat(
                  color: Colors.white54,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.edit, color: Color(0xffffd398)),
          onPressed: _openEditProfile,
          tooltip: 'Edit profile',
        ),
      ],
    );
  }

  Widget _buildGoalsOrBioCard(Map<String, dynamic> profile) {
    final title = _role == 'coach' ? 'BIO' : 'GOALS';
    final content = _role == 'coach'
        ? profile['bio'] ?? 'No bio yet'
        : profile['goals'] ?? 'No goals yet';

    return Container(
      margin: const EdgeInsets.only(top: 18),
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
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            content,
            style: GoogleFonts.montserrat(
              color: Colors.white,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecialtyCard(Map<String, dynamic> profile) {
    if (_role != 'coach') return const SizedBox();

    return Container(
      margin: const EdgeInsets.only(top: 18),
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
            'SPECIALTY',
            style: GoogleFonts.montserrat(
              color: const Color(0xffffd398),
              fontWeight: FontWeight.w700,
              fontSize: 13,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            profile['specialty'] ?? 'Not specified',
            style: GoogleFonts.montserrat(
              color: Colors.white,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTagsCard(List tags) {
    return Container(
      margin: const EdgeInsets.only(top: 18),
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
            'TAGS',
            style: GoogleFonts.montserrat(
              color: const Color(0xffffd398),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: tags.map<Widget>((tag) {
              return _buildTagChip(tag['name']);
            }).toList(),
          )
        ],
      ),
    );
  }

  Widget _buildTagChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xffffd398)),
      ),
      child: Text(
        label,
        style: GoogleFonts.montserrat(
          color: const Color(0xffffd398),
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _buildAccountCard(Map<String, dynamic> profile) {
    final user = profile['user'];

    return Container(
      margin: const EdgeInsets.only(top: 18),
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
            'ACCOUNT',
            style: GoogleFonts.montserrat(
              color: const Color(0xffffd398),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 12),

          _buildInfoRow('Username', user['username']),
          const SizedBox(height: 6),
          _buildInfoRow('Email', user['email']),
          const SizedBox(height: 6),
          _buildInfoRow('Role', user['role']),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.montserrat(
            color: Colors.white54,
            fontSize: 12,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.montserrat(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationCard(Map<String, dynamic> notif) {
    final isSeen = notif['status'] == 'seen';

    return GestureDetector(
      onTap: () async {
        if (!isSeen) {
          try {
            await _apiService.markNotificationSeen(notif['id']);

            setState(() {
              notif['status'] = 'seen';
            });
          } catch (_) {}
        }
      },
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
                notif['message'],
                style: GoogleFonts.montserrat(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: isSeen ? FontWeight.w400 : FontWeight.w600,
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  Future<void> _openNotifications() async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const NotificationsPage()),
    );
    if (mounted) _fetchProfile();
  }

  Widget _buildNotificationsCard() {
    final unread = _notifications.where((n) => n['status'] != 'seen').length;

    return Container(
      margin: const EdgeInsets.only(top: 18),
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
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                unread > 0 ? 'NOTIFICATIONS ($unread new)' : 'NOTIFICATIONS',
                style: GoogleFonts.montserrat(
                  color: const Color(0xffffd398),
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
              if (_notifications.isNotEmpty)
                GestureDetector(
                  onTap: _openNotifications,
                  child: Text(
                    'View all',
                    style: GoogleFonts.montserrat(
                      color: Colors.white70,
                      fontSize: 12,
                      decoration: TextDecoration.underline,
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 12),

          if (_notifications.isEmpty)
            Text(
              'No notifications yet.',
              style: GoogleFonts.montserrat(color: Colors.white54),
            )
          else
            Column(
              children: _notifications
                  .take(3)
                  .map((n) => _buildNotificationCard(n))
                  .toList(),
            )
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('My Profile'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xffffd398)),
            onPressed: _fetchProfile,
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  color: Color(0xffffd398),
                ),
              )
            : _errorMessage != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_errorMessage!),
                        const SizedBox(height: 20),
                        TextButton(
                          onPressed: _logout,
                          child: const Text('Log out'),
                        ),
                      ],
                    ),
                  )
                : _profile == null
                    ? const Center(child: Text('Profile unavailable'))
                    : RefreshIndicator(
                        onRefresh: _fetchProfile,
                        child: ListView(
                        children: [
                          _buildHeader(_profile!),
                          if (_role == 'coach' && _profile!['isApproved'] != true)
                            _buildPendingApprovalBanner(),
                          _buildNotificationsCard(),
                          _buildGoalsOrBioCard(_profile!),
                          _buildSpecialtyCard(_profile!),
                          _buildTagsCard(_profile!['tags'] ?? []),
                          _buildAccountCard(_profile!),
                          SizedBox(height: 25,),
                          ElevatedButton(
                            onPressed: _isLoggingOut ? null : _logout,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 15),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                              side: const BorderSide(width: 1.3, color: Color(0xffffd398)),
                              backgroundColor: const Color(0xffffd398),
                            ),
                            child: _isLoggingOut
                                ? const SizedBox(
                                    width: 20,
                                    height: 20,
                                    child: CircularProgressIndicator(
                                      color: Colors.black,
                                      strokeWidth: 2.5,
                                    ),
                                  )
                                : Text(
                                    'Log out',
                                    style: GoogleFonts.montserrat(
                                      fontSize: 16,
                                      color: Colors.black,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                            ),
                          TextButton(
                            onPressed: _isLoggingOut ? null : _deleteAccount,
                            child: const Text(
                              'Supprimer mon compte',
                              style: TextStyle(color: Colors.red),
                            ),
                          ),
                          ],
                        ),
                      ),
      ),
      bottomNavigationBar: const AppBottomNav(currentPage: 'profile'),
    );
  }
}
