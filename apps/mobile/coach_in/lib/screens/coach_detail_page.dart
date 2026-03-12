import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';

class CoachDetailPage extends StatefulWidget {
  final String coachId;

  const CoachDetailPage({super.key, required this.coachId});

  @override
  State<CoachDetailPage> createState() => _CoachDetailPageState();
}

class _CoachDetailPageState extends State<CoachDetailPage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _errorMessage;
  Map<String, dynamic>? _coach;

  @override
  void initState() {
    super.initState();
    _fetchCoach();
  }

  Future<void> _fetchCoach() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final coach = await _apiService.fetchCoachById(widget.coachId);

      setState(() {
        _coach = coach;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Failed to load coach';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Widget _buildTagChip(String label) {
    return Container(
      margin: const EdgeInsets.only(right: 6, bottom: 6),
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

  Widget _buildCard(String title, Widget content) {
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
            ),
          ),
          const SizedBox(height: 10),
          content
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Coach Profile'),
        backgroundColor: Theme.of(context).colorScheme.primary,
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
                : _coach == null
                    ? const Center(child: Text('Coach not found'))
                    : ListView(
                        children: [
                          Row(
                            children: [
                              const CircleAvatar(
                                radius: 30,
                                backgroundColor: Color(0xffffd398),
                                child: Icon(Icons.person, color: Colors.black),
                              ),
                              const SizedBox(width: 12),
                              Text(
                                _coach!['user']['username'],
                                style: GoogleFonts.montserrat(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w700,
                                  fontSize: 18,
                                ),
                              )
                            ],
                          ),

                          _buildCard(
                            'SPECIALTY',
                            Text(
                              _coach!['specialty'],
                              style: GoogleFonts.montserrat(
                                color: Colors.white,
                              ),
                            ),
                          ),

                          _buildCard(
                            'BIO',
                            Text(
                              _coach!['bio'],
                              style: GoogleFonts.montserrat(
                                color: Colors.white,
                              ),
                            ),
                          ),

                          _buildCard(
                            'TAGS',
                            Wrap(
                              children: (_coach!['tags'] as List)
                                  .map((t) => _buildTagChip(t['name']))
                                  .toList(),
                            ),
                          ),
                        ],
                      ),
      ),
    );
  }
}
