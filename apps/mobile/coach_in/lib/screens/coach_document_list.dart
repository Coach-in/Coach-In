import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import './coach_document_detail.dart';

class CoachDocumentsPage extends StatefulWidget {
  const CoachDocumentsPage({super.key});

  @override
  State<CoachDocumentsPage> createState() => _CoachDocumentsPageState();
}

class _CoachDocumentsPageState extends State<CoachDocumentsPage> {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _documents = [];

  @override
  void initState() {
    super.initState();
    _fetchDocuments();
  }

  Future<void> _fetchDocuments() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });
    try {
      final docs = await _apiService.fetchCoachDocuments();
      setState(() => _documents = List<Map<String, dynamic>>.from(docs));
    } catch (e) {
      setState(() => _errorMessage = 'Failed to load documents. Please try again.');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  String _formatDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }

  Widget _buildStatusBadge(bool isApproved) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isApproved
            ? Colors.green.withOpacity(0.15)
            : Colors.orange.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isApproved ? Colors.green : Colors.orange,
          width: 1,
        ),
      ),
      child: Text(
        isApproved ? 'Approved' : 'Pending',
        style: GoogleFonts.montserrat(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: isApproved ? Colors.green : Colors.orange,
        ),
      ),
    );
  }

  Widget _buildDocumentCard(Map<String, dynamic> doc) {
    final coach = doc['coach'] as Map<String, dynamic>;
    final isApproved = coach['isApproved'] as bool? ?? false;
    final mimeType = doc['mimeType'] as String? ?? '';
    final isImage = mimeType.startsWith('image/');

    return GestureDetector(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => CoachDocumentDetailPage(document: doc),
          ),
        );
        // Refresh list when returning from detail (status may have changed)
        _fetchDocuments();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white12),
          borderRadius: BorderRadius.circular(10),
          color: Colors.white.withOpacity(0.05),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // File type icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xffffd398).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  isImage ? Icons.image_outlined : Icons.picture_as_pdf_outlined,
                  color: const Color(0xffffd398),
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              // Doc info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      doc['originalName'] as String? ?? 'Unknown file',
                      style: GoogleFonts.montserrat(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Specialty: ${coach['specialty'] ?? 'N/A'}',
                      style: GoogleFonts.montserrat(
                        color: Colors.white54,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Uploaded: ${_formatDate(doc['uploadedAt'] as String? ?? '')}',
                      style: GoogleFonts.montserrat(
                        color: Colors.white38,
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  _buildStatusBadge(isApproved),
                  const SizedBox(height: 8),
                  const Icon(
                    Icons.chevron_right,
                    color: Color(0xffffd398),
                    size: 20,
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Coach Documents',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        backgroundColor: Theme.of(context).colorScheme.primary,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xffffd398)),
            onPressed: _fetchDocuments,
            tooltip: 'Refresh',
          ),
        ],
      ),
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xffffd398)),
              )
            : _errorMessage != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _errorMessage!,
                          style: const TextStyle(color: Colors.red),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: _fetchDocuments,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xffffd398),
                          ),
                          child: Text(
                            'Retry',
                            style: GoogleFonts.montserrat(color: Colors.black),
                          ),
                        ),
                      ],
                    ),
                  )
                : _documents.isEmpty
                    ? Center(
                        child: Text(
                          'No documents to review.',
                          style: GoogleFonts.montserrat(
                            color: Colors.white54,
                            fontSize: 15,
                          ),
                        ),
                      )
                    : ListView(
                        children: [
                          const SizedBox(height: 4),
                          Text(
                            '${_documents.length} document${_documents.length != 1 ? 's' : ''} pending review',
                            style: GoogleFonts.montserrat(
                              color: Colors.white54,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ..._documents.map(_buildDocumentCard),
                        ],
                      ),
      ),
    );
  }
}
