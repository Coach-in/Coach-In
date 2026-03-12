import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:file_picker/file_picker.dart';
import 'dart:io';

import './start_page.dart';
import './explore_page.dart';

import '../services/api_service.dart';

class RegisterInfoPage extends StatefulWidget {
  final String email;
  final String user;
  final String password;
  final bool isCoach;

  const RegisterInfoPage({
    super.key,
    required this.email,
    required this.user,
    required this.password,
    required this.isCoach,
  });

  @override
  State<RegisterInfoPage> createState() => _RegisterInfoPageState();
}

class _RegisterInfoPageState extends State<RegisterInfoPage> {
  final TextEditingController _ageController = TextEditingController();
  final TextEditingController _goalController = TextEditingController();
  final TextEditingController _specialityController = TextEditingController();
  final TextEditingController _bioController = TextEditingController();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = false;
  bool _isLoadingTags = false;
  String? _errorMessage;

  List<Map<String, dynamic>> _availableTags = [];
  List<Map<String, dynamic>> _selectedTags = [];

  File? _certificationFile;
  String? _certificationFileName;

  final AuthService _authService = AuthService();
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _fetchTags();
  }

  Future<void> _fetchTags() async {
    setState(() => _isLoadingTags = true);
    try {
      final tags = await _apiService.fetchTags();
      setState(() => _availableTags = List<Map<String, dynamic>>.from(tags));
    } catch (e) {
      setState(() => _errorMessage = 'Failed to load tags. Please try again.');
    } finally {
      setState(() => _isLoadingTags = false);
    }
  }

  Future<void> _pickCertification() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf', 'png', "jpeg"],
    );
    if (result != null && result.files.single.path != null) {
      setState(() {
        _certificationFile = File(result.files.single.path!);
        _certificationFileName = result.files.single.name;
      });
    }
  }

  Future<void> _uploadCertification(String id) async {
    _apiService.uploadCertification(id, _certificationFile!);
  }

  bool _validate() {
    if (widget.isCoach) {
      if (_specialityController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Specialty is required.');
        return false;
      }
      if (_bioController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Bio is required.');
        return false;
      }
      if (_certificationFile == null) {
        setState(() => _errorMessage = 'Certification is required.');
        return false;
      }
    } else {
      if (_ageController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Age is required.');
        return false;
      }
      if (_goalController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Goal is required.');
        return false;
      }
    }
    if (_selectedTags.isEmpty) {
      setState(() => _errorMessage = 'Please select at least one tag.');
      return false;
    }
    return true;
  }

  void _register() {
    setState(() => _errorMessage = null);
    if (!_validate()) return;
    widget.isCoach ? _registerCoach() : _registerAthlete();
  }

  Future<void> _registerCoach() async {
    setState(() { _isLoading = true; _errorMessage = null; });

    final result = await _authService.registerCoach(
      widget.user,
      widget.email,
      widget.password,
      {
        'specialty': _specialityController.text.trim(),
        'bio': _bioController.text.trim(),
        'tagNames': _selectedTags.map((t) => t['name']).toList(),
      },
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result['success'] == true) {
      final data = result['data'];
      final user = data['user'];
      final id = user['id'];
      final accessToken = data['token'] as String;

      await _storage.write(key: 'accessToken', value: accessToken);
      await _storage.write(key: 'refreshToken', value: user['refresh_token']);
      await _storage.write(key: 'rememberMe', value: true.toString());

      await _uploadCertification(id);

      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ExplorePage()));
    } else {
      setState(() => _errorMessage = result['message'] ?? 'Registration failed. Please try again.');
    }
  }

  Future<void> _registerAthlete() async {
    setState(() { _isLoading = true; _errorMessage = null; });

    final result = await _authService.registerAthlete(
      widget.user,
      widget.email,
      widget.password,
      {
        'age': _ageController.text.trim(),
        'goal': _goalController.text.trim(),
        'tagNames': _selectedTags.map((t) => t['name']).toList(),
      },
    );

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (result['success'] == true) {
      final data = result['data'];
      final user = data['user'];

      await _storage.write(key: 'accessToken', value: data['token'] as String);
      await _storage.write(key: 'refreshToken', value: user['refresh_token']);
      await _storage.write(key: 'rememberMe', value: true.toString());

      if (!mounted) return;
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ExplorePage()));
    } else {
      setState(() => _errorMessage = result['message'] ?? 'Registration failed. Please try again.');
    }
  }

  void _toggleTag(Map<String, dynamic> tag) {
    setState(() {
      final alreadySelected = _selectedTags.any((t) => t['id'] == tag['id']);
      if (alreadySelected) {
        _selectedTags.removeWhere((t) => t['id'] == tag['id']);
      } else if (_selectedTags.length < 5) {
        _selectedTags.add(tag);
      }
    });
  }

  bool _isTagSelected(Map<String, dynamic> tag) =>
      _selectedTags.any((t) => t['id'] == tag['id']);

  void _showTagBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.primary,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final Map<String, List<Map<String, dynamic>>> grouped = {};
          for (final tag in _availableTags) {
            final category = tag['category']['name'] as String;
            grouped.putIfAbsent(category, () => []).add(tag);
          }

          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.5,
            maxChildSize: 0.85,
            builder: (_, scrollController) => Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Select Tags (${_selectedTags.length}/5)',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Done', style: TextStyle(color: Color(0xffffd398))),
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 4),
                  Expanded(
                    child: ListView(
                      controller: scrollController,
                      children: grouped.entries.map((entry) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              child: Text(
                                entry.key.toUpperCase(),
                                style: const TextStyle(
                                  color: Color(0xffffd398),
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ),
                            ...entry.value.map((tag) {
                              final isSelected = _isTagSelected(tag);
                              final isDisabled = !isSelected && _selectedTags.length >= 5;
                              return CheckboxListTile(
                                dense: true,
                                value: isSelected,
                                onChanged: isDisabled
                                    ? null
                                    : (_) {
                                        _toggleTag(tag);
                                        setModalState(() {});
                                      },
                                title: Text(
                                  tag['name'] as String,
                                  style: TextStyle(
                                    color: isDisabled ? Colors.white38 : Colors.white,
                                  ),
                                ),
                                activeColor: const Color(0xffffd398),
                                checkColor: Colors.black,
                              );
                            }),
                          ],
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTagSelector() {
    if (_isLoadingTags) {
      return const Center(child: CircularProgressIndicator(color: Color(0xffffd398)));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Tags * (up to 5)', style: Theme.of(context).textTheme.labelSmall),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: _showTagBottomSheet,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white54),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedTags.isEmpty
                      ? 'Select tags...'
                      : '${_selectedTags.length} tag${_selectedTags.length > 1 ? 's' : ''} selected',
                  style: TextStyle(
                    color: _selectedTags.isEmpty ? Colors.white54 : Colors.white,
                    fontSize: 14,
                  ),
                ),
                const Icon(Icons.arrow_drop_down, color: Colors.white54),
              ],
            ),
          ),
        ),
        if (_selectedTags.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 4,
            children: _selectedTags.map((tag) {
              return Chip(
                label: Text(
                  tag['name'] as String,
                  style: const TextStyle(fontSize: 12, color: Colors.black),
                ),
                backgroundColor: const Color(0xffffd398),
                deleteIconColor: Colors.black54,
                onDeleted: () => _toggleTag(tag),
              );
            }).toList(),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Register', style: Theme.of(context).textTheme.titleMedium),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xffffd398)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'Back',
        ),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      backgroundColor: Theme.of(context).colorScheme.primary,
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: ListView(
          children: [
            const SizedBox(height: 10),

            if (widget.isCoach) ...[
              TextField(
                controller: _specialityController,
                decoration: InputDecoration(
                  floatingLabelBehavior: FloatingLabelBehavior.always,
                  labelText: 'Specialty *',
                  labelStyle: Theme.of(context).textTheme.labelSmall,
                  prefixIcon: const Icon(Icons.person, color: Colors.white),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _bioController,
                maxLines: 3,
                decoration: InputDecoration(
                  floatingLabelBehavior: FloatingLabelBehavior.always,
                  labelText: 'Bio *',
                  labelStyle: Theme.of(context).textTheme.labelSmall,
                  prefixIcon: const Icon(Icons.info_outline, color: Colors.white),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 20),
              Text('Certification (PDF, PNG, JPEG) *', style: Theme.of(context).textTheme.labelSmall),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: _pickCertification,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _certificationFile != null ? const Color(0xffffd398) : Colors.white54,
                    ),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _certificationFile != null ? Icons.check_circle : Icons.upload_file,
                        color: _certificationFile != null ? const Color(0xffffd398) : Colors.white54,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _certificationFileName ?? 'Tap to upload...',
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: _certificationFile != null ? Colors.white : Colors.white54,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      if (_certificationFile != null)
                        GestureDetector(
                          onTap: () => setState(() {
                            _certificationFile = null;
                            _certificationFileName = null;
                          }),
                          child: const Icon(Icons.close, color: Colors.white54, size: 18),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],

            if (!widget.isCoach) ...[
              TextField(
                controller: _ageController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  floatingLabelBehavior: FloatingLabelBehavior.always,
                  labelText: 'Age *',
                  labelStyle: Theme.of(context).textTheme.labelSmall,
                  prefixIcon: const Icon(Icons.person, color: Colors.white),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _goalController,
                decoration: InputDecoration(
                  floatingLabelBehavior: FloatingLabelBehavior.always,
                  labelText: 'Goal *',
                  labelStyle: Theme.of(context).textTheme.labelSmall,
                  prefixIcon: const Icon(Icons.flag_outlined, color: Colors.white),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 20),
            ],

            _buildTagSelector(),
            const SizedBox(height: 20),

            if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(_errorMessage!, style: const TextStyle(color: Colors.red)),
              ),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _register,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  backgroundColor: const Color(0xffffd398),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Color(0xffd1d5dc))
                    : Text(
                        'Register',
                        style: GoogleFonts.montserrat(
                          fontSize: 16,
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}
