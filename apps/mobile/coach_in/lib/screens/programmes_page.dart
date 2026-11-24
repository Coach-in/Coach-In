import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import './programme_create_page.dart';
import './programme_detail_page.dart';

class ProgrammesPage extends StatefulWidget {
  const ProgrammesPage({super.key});

  @override
  State<ProgrammesPage> createState() => _ProgrammesPageState();
}

class _ProgrammesPageState extends State<ProgrammesPage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = true;
  String? _errorMessage;
  String? _role;
  List<Map<String, dynamic>> _programmes = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final user = await _apiService.fetchCurrentUser();
      if (!mounted) return;
      // Set the role first so "Créer" stays available even if the list fails.
      setState(() => _role = user['role']);
      final programmes = await _apiService.fetchProgrammes();
      if (!mounted) return;
      setState(() => _programmes = List<Map<String, dynamic>>.from(programmes));
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage =
          errorMessage(e, fallback: 'Impossible de charger les programmes.'));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _open(Widget page) async {
    await Navigator.push(context, MaterialPageRoute(builder: (_) => page));
    if (mounted) _fetch();
  }

  /// Who the programme is "with", from the viewer's point of view.
  String _subtitle(Map<String, dynamic> p) {
    if (_role == 'coach') {
      final athlete = p['athlete']?['user']?['username'];
      return athlete == null ? 'Modèle' : 'Pour $athlete';
    }
    final coach = p['coach']?['user']?['username'];
    return coach == null ? 'Programme personnel' : 'Par $coach';
  }

  Widget _buildTile(Map<String, dynamic> p) {
    final dates = [p['startDate'], p['endDate']].whereType<String>().join(' → ');

    return GestureDetector(
      onTap: () => _open(ProgrammeDetailPage(programmeId: p['id'])),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xff1b2a41),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    p['name'] ?? '',
                    style: GoogleFonts.montserrat(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _subtitle(p),
                    style: GoogleFonts.montserrat(
                      color: const Color(0xffffd398),
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    dates,
                    style: GoogleFonts.montserrat(
                      color: Colors.white54,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Color(0xffffd398)),
          ],
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
            Text(_errorMessage!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            TextButton(onPressed: _fetch, child: const Text('Réessayer')),
          ],
        ),
      );
    }
    if (_programmes.isEmpty) {
      return Center(
        child: Text(
          'Aucun programme pour le moment.',
          style: GoogleFonts.montserrat(color: Colors.white54),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _fetch,
      child: ListView(children: _programmes.map(_buildTile).toList()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: const Text('Programmes'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: Padding(padding: const EdgeInsets.all(20), child: _buildBody()),
      floatingActionButton: _role == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _open(ProgrammeCreatePage(role: _role!)),
              backgroundColor: const Color(0xffffd398),
              foregroundColor: Colors.black,
              icon: const Icon(Icons.add),
              label: const Text('Créer'),
            ),
    );
  }
}
