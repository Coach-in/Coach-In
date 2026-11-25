import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/tag_utils.dart';

class EditProfilePage extends StatefulWidget {
  final Map<String, dynamic> profile;
  final bool isCoach;

  const EditProfilePage({
    super.key,
    required this.profile,
    required this.isCoach,
  });

  @override
  State<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends State<EditProfilePage> {
  static const int _maxTags = 5;

  final ApiService _apiService = ApiService();

  late final TextEditingController _usernameController;
  late final TextEditingController _specialtyController;
  late final TextEditingController _bioController;
  late final TextEditingController _ageController;
  late final TextEditingController _goalsController;
  final TextEditingController _passwordController = TextEditingController();

  List<Map<String, dynamic>> _availableTags = [];
  late final Set<String> _selectedTagNames;

  bool _isSaving = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    final p = widget.profile;
    _usernameController =
        TextEditingController(text: p['user']?['username'] ?? '');
    _specialtyController = TextEditingController(text: p['specialty'] ?? '');
    _bioController = TextEditingController(text: p['bio'] ?? '');
    _ageController = TextEditingController(text: '${p['age'] ?? ''}');
    _goalsController = TextEditingController(text: p['goals'] ?? '');
    _selectedTagNames = {
      for (final t in (p['tags'] as List? ?? [])) t['name'] as String,
    };
    _fetchTags();
  }

  @override
  void dispose() {
    _usernameController.dispose();
    _specialtyController.dispose();
    _bioController.dispose();
    _ageController.dispose();
    _goalsController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _fetchTags() async {
    try {
      final tags = await _apiService.fetchTags();
      if (!mounted) return;
      setState(() => _availableTags = List<Map<String, dynamic>>.from(tags));
    } catch (_) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Failed to load tags.');
    }
  }

  Future<void> _save() async {
    final username = _usernameController.text.trim();
    if (username.isEmpty) {
      setState(() => _errorMessage = 'Username cannot be empty.');
      return;
    }

    final newPassword = _passwordController.text;
    if (newPassword.isNotEmpty && newPassword.length < 8) {
      setState(() => _errorMessage = 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    final Map<String, dynamic> profileBody;
    if (widget.isCoach) {
      if (_specialtyController.text.trim().isEmpty) {
        setState(() => _errorMessage = 'Specialty cannot be empty.');
        return;
      }
      profileBody = {
        'specialty': _specialtyController.text.trim(),
        'bio': _bioController.text.trim(),
        'tagNames': _selectedTagNames.toList(),
      };
    } else {
      final age = int.tryParse(_ageController.text.trim());
      if (age == null || age < 0) {
        setState(() => _errorMessage = 'Please enter a valid age.');
        return;
      }
      profileBody = {
        'age': age,
        'goals': _goalsController.text.trim(),
        'tagNames': _selectedTagNames.toList(),
      };
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      final userId = widget.profile['user']['id'] as String;
      final profileId = widget.profile['id'] as String;

      final userBody = <String, dynamic>{
        if (username != widget.profile['user']['username']) 'username': username,
        if (newPassword.isNotEmpty) 'password': newPassword,
      };
      if (userBody.isNotEmpty) {
        await _apiService.updateUser(userId, userBody);
      }
      if (widget.isCoach) {
        await _apiService.updateCoach(profileId, profileBody);
      } else {
        await _apiService.updateAthlete(profileId, profileBody);
      }

      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _errorMessage = errorMessage(e, fallback: e.toString().replaceFirst('Exception: ', ''));
      });
    }
  }

  void _showTagBottomSheet() {
    final grouped = groupTagsByCategory(_availableTags);

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.primary,
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.7,
          builder: (context, scrollController) => ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Select Tags (${_selectedTagNames.length}/$_maxTags)',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              for (final entry in grouped.entries) ...[
                const SizedBox(height: 16),
                Text(entry.key, style: Theme.of(context).textTheme.labelSmall),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: entry.value.map((tag) {
                    final name = tag['name'] as String;
                    final selected = _selectedTagNames.contains(name);
                    final disabled =
                        !selected && _selectedTagNames.length >= _maxTags;
                    return FilterChip(
                      label: Text(name),
                      selected: selected,
                      onSelected: disabled
                          ? null
                          : (value) {
                              setState(() {
                                value
                                    ? _selectedTagNames.add(name)
                                    : _selectedTagNames.remove(name);
                              });
                              setSheetState(() {});
                            },
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(
    TextEditingController controller,
    String label,
    IconData icon, {
    int maxLines = 1,
    TextInputType? keyboardType,
    bool obscure = false,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        keyboardType: keyboardType,
        obscureText: obscure,
        decoration: InputDecoration(
          floatingLabelBehavior: FloatingLabelBehavior.always,
          labelText: label,
          labelStyle: Theme.of(context).textTheme.labelSmall,
          prefixIcon: Icon(icon, color: Colors.white),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Edit Profile'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildField(_usernameController, 'Username', Icons.person),
          _buildField(_passwordController, 'Nouveau mot de passe (optionnel)', Icons.lock_outline,
              obscure: true),
          if (widget.isCoach) ...[
            _buildField(_specialtyController, 'Specialty', Icons.fitness_center),
            _buildField(_bioController, 'Bio', Icons.info_outline, maxLines: 3),
          ] else ...[
            _buildField(_ageController, 'Age', Icons.cake,
                keyboardType: TextInputType.number),
            _buildField(_goalsController, 'Goals', Icons.flag_outlined,
                maxLines: 3),
          ],
          Text('Tags (up to $_maxTags)',
              style: Theme.of(context).textTheme.labelSmall),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _availableTags.isEmpty ? null : _showTagBottomSheet,
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
              side: const BorderSide(color: Color(0xffffd398)),
            ),
            child: Text(
              _selectedTagNames.isEmpty
                  ? 'Select tags...'
                  : _selectedTagNames.join(', '),
              style: GoogleFonts.montserrat(color: Colors.white),
            ),
          ),
          if (_errorMessage != null) ...[
            const SizedBox(height: 16),
            Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent)),
          ],
          const SizedBox(height: 25),
          ElevatedButton(
            onPressed: _isSaving ? null : _save,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 15),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
              backgroundColor: const Color(0xffffd398),
            ),
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                        color: Colors.black, strokeWidth: 2.5),
                  )
                : Text(
                    'Save',
                    style: GoogleFonts.montserrat(
                      fontSize: 16,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
