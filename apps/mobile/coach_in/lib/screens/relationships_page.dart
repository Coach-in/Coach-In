import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import './athlete_detail_page.dart';
import '../config/app_colors.dart';

class RelationshipsPage extends StatefulWidget {
  const RelationshipsPage({super.key});

  @override
  State<RelationshipsPage> createState() => _RelationshipsPageState();
}

class _RelationshipsPageState extends State<RelationshipsPage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  String? _errorMessage;
  String? _role;
  String? _busyId;
  List<Map<String, dynamic>> _relationships = [];

  @override
  void initState() {
    super.initState();
    _fetchRelationships();
  }

  Future<void> _fetchRelationships() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = await _apiService.fetchCurrentUser();
      final relationships = await _apiService.fetchRelationships();
      if (!mounted) return;
      setState(() {
        _role = user['role'];
        _relationships = List<Map<String, dynamic>>.from(relationships);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Failed to load connections');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _review(Map<String, dynamic> relationship, String action) async {
    setState(() => _busyId = relationship['id']);

    try {
      await _apiService.reviewRelationship(relationship['id'], action);
      if (!mounted) return;
      setState(() {
        relationship['status'] = action == 'accept' ? 'accepted' : 'refused';
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(errorMessage(e, fallback: 'Could not $action the request'))),
      );
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  String _otherName(Map<String, dynamic> relationship) {
    final other = _role == 'coach' ? relationship['athlete'] : relationship['coach'];
    return other?['user']?['username'] ?? 'Unknown';
  }

  Widget _buildActions(Map<String, dynamic> relationship) {
    final isBusy = _busyId == relationship['id'];

    if (isBusy) {
      return const SizedBox(
        width: 20,
        height: 20,
        child: CircularProgressIndicator(
          color: AppColors.accent,
          strokeWidth: 2.5,
        ),
      );
    }

    if (relationship['status'] == 'pending' && _role == 'coach') {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            tooltip: 'Refuse',
            icon: const Icon(Icons.close, color: Colors.redAccent),
            onPressed: () => _review(relationship, 'refuse'),
          ),
          IconButton(
            tooltip: 'Accept',
            icon: const Icon(Icons.check, color: AppColors.accent),
            onPressed: () => _review(relationship, 'accept'),
          ),
        ],
      );
    }

    final status = relationship['status'] as String;
    return Text(
      status[0].toUpperCase() + status.substring(1),
      style: GoogleFonts.montserrat(
        color: status == 'accepted' ? AppColors.accent : Colors.white54,
        fontSize: 12,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _buildTile(Map<String, dynamic> relationship) {
    final athlete = relationship['athlete'];
    final canOpenAthlete = _role == 'coach' && athlete is Map<String, dynamic>;

    return GestureDetector(
      onTap: canOpenAthlete
          ? () => Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AthleteDetailPage(athlete: athlete),
                ),
              )
          : null,
      child: _buildTileBody(relationship),
    );
  }

  Widget _buildTileBody(Map<String, dynamic> relationship) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white12),
      ),
      child: Row(
        children: [
          const Icon(Icons.person, color: Colors.white54),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              _otherName(relationship),
              style: GoogleFonts.montserrat(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          _buildActions(relationship),
        ],
      ),
    );
  }

  Widget _buildSection(String title, String status) {
    final items = _relationships.where((r) => r['status'] == status).toList();
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 8, bottom: 10),
          child: Text(
            title,
            style: GoogleFonts.montserrat(
              color: AppColors.accent,
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
        ),
        ...items.map(_buildTile),
      ],
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.accent),
      );
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_errorMessage!),
            TextButton(
              onPressed: _fetchRelationships,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchRelationships,
      child: _relationships.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 120),
                Center(
                  child: Text(
                    'No connections yet.',
                    style: GoogleFonts.montserrat(color: Colors.white54),
                  ),
                ),
              ],
            )
          : ListView(
              children: [
                _buildSection('PENDING', 'pending'),
                _buildSection('ACCEPTED', 'accepted'),
                _buildSection('REFUSED', 'refused'),
              ],
            ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Connections'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: _buildBody(),
      ),
    );
  }
}
