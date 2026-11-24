import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../utils/exercise_utils.dart';

/// Creates an exercise in the shared catalogue, with an optional image.
/// Pops with the created exercise (including its `imageUrl` when uploaded).
class ExerciseCreatePage extends StatefulWidget {
  final String initialName;

  const ExerciseCreatePage({super.key, this.initialName = ''});

  @override
  State<ExerciseCreatePage> createState() => _ExerciseCreatePageState();
}

class _ExerciseCreatePageState extends State<ExerciseCreatePage> {
  final ApiService _apiService = ApiService();
  late final TextEditingController _name =
      TextEditingController(text: widget.initialName);
  final TextEditingController _description = TextEditingController();

  File? _image;
  String? _imageExtension;
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: exerciseImageExtensions,
    );
    final picked = result?.files.single;
    if (picked == null || picked.path == null) return;

    final extension = (picked.extension ?? '').toLowerCase();
    final error = validateExerciseImage(extension, picked.size);
    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }
    setState(() {
      _image = File(picked.path!);
      _imageExtension = extension;
      _errorMessage = null;
    });
  }

  Future<void> _save() async {
    final error = validateExerciseName(_name.text);
    if (error != null) {
      setState(() => _errorMessage = error);
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    Map<String, dynamic> exercise;
    try {
      exercise = await _apiService.createExercise(
        _name.text,
        description: _description.text,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _errorMessage =
            errorMessage(e, fallback: "Création de l'exercice impossible.");
      });
      return;
    }

    String? warning;
    if (_image != null) {
      try {
        exercise = await _apiService.uploadExerciseImage(
            exercise['id'], _image!, _imageExtension!);
      } catch (e) {
        // The exercise exists already: keep it and tell the user about the image.
        warning = "Exercice créé, mais l'image n'a pas pu être envoyée.";
      }
    }

    if (!mounted) return;
    if (warning != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(warning)));
    }
    Navigator.pop(context, exercise);
  }

  InputDecoration _decoration(String label) => InputDecoration(
        labelText: label,
        labelStyle: Theme.of(context).textTheme.labelSmall,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      );

  Widget _buildImagePicker() {
    return GestureDetector(
      onTap: _isSaving ? null : _pickImage,
      child: Container(
        height: 160,
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xff1b2a41),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.white12),
        ),
        clipBehavior: Clip.antiAlias,
        child: _image == null
            ? Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_photo_alternate_outlined,
                      size: 36, color: Color(0xffffd398)),
                  const SizedBox(height: 8),
                  Text(
                    'Ajouter une image (facultatif)',
                    style: GoogleFonts.montserrat(
                      color: Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    'PNG, JPEG ou WEBP, 5 Mo max',
                    style: GoogleFonts.montserrat(
                      color: Colors.white38,
                      fontSize: 11,
                    ),
                  ),
                ],
              )
            : Stack(
                fit: StackFit.expand,
                children: [
                  Image.file(_image!, fit: BoxFit.cover),
                  Positioned(
                    top: 6,
                    right: 6,
                    child: IconButton.filled(
                      onPressed: _isSaving
                          ? null
                          : () => setState(() {
                                _image = null;
                                _imageExtension = null;
                              }),
                      icon: const Icon(Icons.close),
                      tooltip: "Retirer l'image",
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).colorScheme.primary,
      appBar: AppBar(
        title: const Text('Nouvel exercice'),
        backgroundColor: Theme.of(context).colorScheme.primary,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextField(
            controller: _name,
            autofocus: widget.initialName.isEmpty,
            maxLength: 100,
            textCapitalization: TextCapitalization.sentences,
            decoration: _decoration('Nom'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            maxLines: 5,
            textCapitalization: TextCapitalization.sentences,
            decoration: _decoration('Description / consignes (facultatif)'),
          ),
          const SizedBox(height: 16),
          _buildImagePicker(),
          if (_errorMessage != null)
            Padding(
              padding: const EdgeInsets.only(top: 14),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _isSaving ? null : _save,
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 15),
              backgroundColor: const Color(0xffffd398),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: _isSaving
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.black,
                      strokeWidth: 2.5,
                    ),
                  )
                : Text(
                    "Créer l'exercice",
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
