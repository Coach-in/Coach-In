import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import './coach_detail_page.dart';
import './start_page.dart';
import './profile_page.dart';

class ExplorePage extends StatefulWidget {
  const ExplorePage({super.key});

  @override
  State<ExplorePage> createState() => _ExplorePageState();
}

class _ExplorePageState extends State<ExplorePage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _errorMessage;

  List<Map<String, dynamic>> _coaches = [];
  String? _role;

  @override
  void initState() {
    super.initState();
    _fetchExplore();
  }

  Future<void> _fetchExplore() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = await _apiService.fetchCurrentUser();
      final role = user['role'];

      if (role == 'coach') {
        setState(() {
          _role = role;
        });
        return;
      }

      final coaches = await _apiService.fetchCoaches();

      final verified = List<Map<String, dynamic>>.from(coaches)
          .where((c) => c['isApproved'] == true)
          .toList();

      setState(() {
        _role = role;
        _coaches = verified;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load coaches';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _logout() async {
    setState(() {
      // _isLoggingOut = true;
      _errorMessage = null;
    });

    await _apiService.clearTokens();

    // final result = await _authService.logout();

    // if (!mounted) return;

    // setState(() => _isLoggingOut = false);

    // if (result['success']) {
    //   if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => const StartPage()),
    );
    // } else {
    //   setState(() {
    //     _errorMessage = result['message'];
    //   });
    // }
  }

  Widget _buildCoachCard(Map<String, dynamic> coach) {
    final user = coach['user'];

    return GestureDetector(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CoachDetailPage(coachId: coach['id']),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white12),
          color: const Color(0xff1b2a41),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: const Color(0xffffd398),
                child: const Icon(Icons.person, color: Colors.black),
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
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),

                    const SizedBox(height: 4),

                    Text(
                      coach['specialty'] ?? '',
                      style: GoogleFonts.montserrat(
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),

                    const SizedBox(height: 8),

                    Wrap(
                      spacing: 6,
                      children: (coach['tags'] as List)
                          .map((t) => _buildTagChip(t['name']))
                          .toList(),
                    )
                  ],
                ),
              ),

              const Icon(
                Icons.chevron_right,
                color: Color(0xffffd398),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTagChip(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xffffd398)),
      ),
      child: Text(
        label,
        style: GoogleFonts.montserrat(
          color: const Color(0xffffd398),
          fontSize: 10,
          fontWeight: FontWeight.w600,
        ),
      ),
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

  @override
  Widget build(BuildContext context) {
    if (_role == 'coach') {
      return Scaffold(
        backgroundColor: Theme.of(context).colorScheme.primary,
        appBar: AppBar(
          title: const Text('Explore'),
          backgroundColor: Theme.of(context).colorScheme.primary,
        ),
        body: Center(
          child: Text(
            'Explore will be available later.',
            style: GoogleFonts.montserrat(color: Colors.white54),
          ),
        ),
        bottomNavigationBar: _buildBottomNav('explore'),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Explore Coaches'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xffffd398)),
            onPressed: _fetchExplore,
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
                : _coaches.isEmpty
                    ? Center(
                        child: Text(
                          'No verified coaches yet.',
                          style: GoogleFonts.montserrat(
                            color: Colors.white54,
                          ),
                        ),
                      )
                    : ListView(
                        children: [
                          Text(
                            '${_coaches.length} verified coaches',
                            style: GoogleFonts.montserrat(
                              color: Colors.white54,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ..._coaches.map(_buildCoachCard),
                        ],
                      ),
      ),
      bottomNavigationBar: _buildBottomNav('explore'),
    );
  }
}
