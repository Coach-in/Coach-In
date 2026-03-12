import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import './explore_page.dart';
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
        const Icon(Icons.edit, color: Color(0xffffd398))
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

  Widget _buildBottomNav(String currentPage) {
    return Container(
      height: 60,
      decoration: const BoxDecoration(
        color: Color(0xffffd398),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          GestureDetector(
            onTap: () {
              if (currentPage != 'explore') {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const ExplorePage()),
                );
              }
            },
            child: Row(
              children: [
                Icon(
                  Icons.explore,
                  color: currentPage == 'explore'
                      ? Colors.black
                      : Colors.black54,
                ),
                const SizedBox(width: 6),
                Text(
                  'Explore',
                  style: TextStyle(
                    color: currentPage == 'explore'
                        ? Colors.black
                        : Colors.black54,
                    fontWeight: FontWeight.w600,
                  ),
                )
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              if (currentPage != 'profile') {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfilePage()),
                );
              }
            },
            child: Row(
              children: [
                Icon(
                  Icons.person,
                  color: currentPage == 'profile'
                      ? Colors.black
                      : Colors.black54,
                ),
                const SizedBox(width: 6),
                Text(
                  'Profile',
                  style: TextStyle(
                    color: currentPage == 'profile'
                        ? Colors.black
                        : Colors.black54,
                    fontWeight: FontWeight.w600,
                  ),
                )
              ],
            ),
          ),
        ],
      ),
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

  Widget _buildNotificationsCard() {
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
            'NOTIFICATIONS',
            style: GoogleFonts.montserrat(
              color: const Color(0xffffd398),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
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
                ? Center(child: Text(_errorMessage!))
                : _profile == null
                    ? const Center(child: Text('Profile unavailable'))
                    : RefreshIndicator(
                        onRefresh: _fetchProfile,
                        child: ListView(
                        children: [
                          _buildHeader(_profile!),
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
                          ],
                        ),
                      ),
      ),
      bottomNavigationBar: _buildBottomNav('profile'),
    );
  }
}
