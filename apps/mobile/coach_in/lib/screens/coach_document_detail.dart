import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';

class CoachDocumentDetailPage extends StatefulWidget {
  final Map<String, dynamic> document;

  const CoachDocumentDetailPage({super.key, required this.document});

  @override
  State<CoachDocumentDetailPage> createState() => _CoachDocumentDetailPageState();
}

class _CoachDocumentDetailPageState extends State<CoachDocumentDetailPage> {
  final ApiService _apiService = ApiService();

  bool _isActioning = false;
  String? _errorMessage;

  bool get _isApproved =>
      widget.document['coach']?['isApproved'] as bool? ?? false;

  String _formatDate(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} '
          '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return isoDate;
    }
  }

  Future<void> _handleDecision(bool accept) async {
    final action = accept ? 'accept' : 'refuse';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).colorScheme.primary,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        title: Text(
          accept ? 'Accept document?' : 'Refuse document?',
          style: GoogleFonts.montserrat(
            color: Colors.white,
            fontWeight: FontWeight.bold,
          ),
        ),
        content: Text(
          accept
              ? 'This will approve the coach\'s certification.'
              : 'This will reject the coach\'s certification.',
          style: GoogleFonts.montserrat(color: Colors.white70, fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'Cancel',
              style: GoogleFonts.montserrat(color: Colors.white54),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: accept ? Colors.green : Colors.red,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              accept ? 'Accept' : 'Refuse',
              style: GoogleFonts.montserrat(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() {
      _isActioning = true;
      _errorMessage = null;
    });

    try {
      final docId = widget.document['id'] as String;
      await _apiService.reviewCoachDocument(docId, action);

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            accept
                ? 'Document accepted successfully.'
                : 'Document refused successfully.',
            style: GoogleFonts.montserrat(),
          ),
          backgroundColor: accept ? Colors.green : Colors.red,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      setState(() => _errorMessage = 'Action failed. Please try again.');
    } finally {
      setState(() => _isActioning = false);
    }
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: GoogleFonts.montserrat(
                color: Colors.white38,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.montserrat(
                color: Colors.white,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDocumentPreview() {
    final url = widget.document['url'] as String? ?? '';
    final mimeType = widget.document['mimeType'] as String? ?? '';
    final isImage = mimeType.startsWith('image/');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Document',
          style: Theme.of(context).textTheme.labelSmall,
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 200, maxHeight: 360),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white12),
            borderRadius: BorderRadius.circular(10),
            color: Colors.white,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: isImage
                ? Image.network(
                    url,
                    fit: BoxFit.contain,
                    loadingBuilder: (_, child, progress) => progress == null
                        ? child
                        : const Center(
                            child: CircularProgressIndicator(
                              color: Color(0xffffd398),
                            ),
                          ),
                    errorBuilder: (_, __, ___) => _buildPreviewFallback(
                      Icons.broken_image_outlined,
                      'Could not load image.',
                    ),
                  )
                : _buildPreviewFallback(
                    Icons.picture_as_pdf_outlined,
                    'PDF preview not available.\nOpen the link below to view.',
                    url: url,
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildPreviewFallback(IconData icon, String message, {String? url}) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: const Color(0xffffd398), size: 48),
          const SizedBox(height: 12),
          Text(
            message,
            style: GoogleFonts.montserrat(color: Colors.white54, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          if (url != null && url.isNotEmpty) ...[
            const SizedBox(height: 12),
            GestureDetector(
              onTap: () {
                // open document
                // launchUrl(Uri.parse(url));
              },
              child: Text(
                'View document',
                style: GoogleFonts.montserrat(
                  color: const Color(0xffffd398),
                  fontSize: 13,
                  decoration: TextDecoration.underline,
                  decorationColor: const Color(0xffffd398),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final doc = widget.document;
    final coach = doc['coach'] as Map<String, dynamic>? ?? {};
    final originalName = doc['originalName'] as String? ?? 'Unknown file';
    final uploadedAt = doc['uploadedAt'] as String? ?? '';

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Document Review',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xffffd398)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: ListView(
          children: [
            const SizedBox(height: 4),

            _buildDocumentPreview(),
            const SizedBox(height: 24),

            Text(
              'Details',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white12),
                borderRadius: BorderRadius.circular(10),
                color: Colors.white,
              ),
              child: Column(
                children: [
                  _buildInfoRow('File', originalName),
                  const Divider(color: Colors.white12, height: 16),
                  _buildInfoRow('Specialty', coach['specialty']?.toString() ?? 'N/A'),
                  const Divider(color: Colors.white12, height: 16),
                  _buildInfoRow('Uploaded', _formatDate(uploadedAt)),
                  const Divider(color: Colors.white12, height: 16),
                  _buildInfoRow(
                    'Status',
                    _isApproved ? 'Approved' : 'Pending review',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ),

            if (_isApproved)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.green,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle, color: Colors.green, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'This document has been approved',
                      style: GoogleFonts.montserrat(
                        color: Colors.green,
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              )
            else
              Row(
                children: [
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _isActioning ? null : () => _handleDecision(false),
                        icon: _isActioning
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.close, size: 18),
                        label: Text(
                          'Refuse',
                          style: GoogleFonts.montserrat(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.red.shade700,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: SizedBox(
                      height: 50,
                      child: ElevatedButton.icon(
                        onPressed: _isActioning ? null : () => _handleDecision(true),
                        icon: _isActioning
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.black,
                                ),
                              )
                            : const Icon(Icons.check, size: 18),
                        label: Text(
                          'Accept',
                          style: GoogleFonts.montserrat(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xffffd398),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),

            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
