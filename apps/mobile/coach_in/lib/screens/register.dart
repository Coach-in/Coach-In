import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import './start_page.dart';
import './explore_page.dart';
import './login.dart';
import 'register_info.dart';

import '../services/api_service.dart';
import '../services/oauth_service.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _userController = TextEditingController();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = false;
  bool _isOAuthLoading = false;
  bool _isCoach = false;
  String? _errorMessage;

  final ApiService _apiService = ApiService();

  Future<void> _continue() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => RegisterInfoPage(
        email: _emailController.text.trim(),
        user: _userController.text.trim(),
        password: _passwordController.text.trim(),
        isCoach: _isCoach
      ))
    );
  }

  Future<void> _registerWithGoogle() async {
    setState(() {
      _isOAuthLoading = true;
      _errorMessage = null;
    });

    final result = await _apiService.loginWithGoogle();

    if (!mounted) return;

    setState(() => _isOAuthLoading = false);

    if (result['success']) {
      await _storage.write(key: 'rememberMe', value: 'true');

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const ExplorePage()),
      );
    } else {
      setState(() {
        _errorMessage = result['message'] ?? 'Google registration failed';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Register',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xffffd398)),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => StartPage()),
            );
          },
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

            // Username field
            TextField(
              controller: _userController,
              decoration: InputDecoration(
                floatingLabelBehavior: FloatingLabelBehavior.always,
                labelText: 'Username',
                labelStyle: Theme.of(context).textTheme.labelSmall,
                prefixIcon: const Icon(Icons.person, color: Colors.white,),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Email field
            TextField(
              controller: _emailController,
              decoration: InputDecoration(
                floatingLabelBehavior: FloatingLabelBehavior.always,
                labelText: 'Email',
                labelStyle: Theme.of(context).textTheme.labelSmall,
                prefixIcon: const Icon(Icons.email),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Password field
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: InputDecoration(
                floatingLabelBehavior: FloatingLabelBehavior.always,
                labelText: 'Password',
                labelStyle: Theme.of(context).textTheme.labelSmall,
                prefixIcon: const Icon(Icons.lock),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),

            Row(
              children: [
                Checkbox(
                  value: _isCoach,
                  onChanged: (val) {
                    setState(() => _isCoach = val ?? false);
                  },
                  activeColor: Color(0xffffd398),
                ),
                Text('I am a coach', style: GoogleFonts.montserrat(fontSize: 13, color: Color(0xffffd398))),
              ],
            ),

            const SizedBox(height: 20),

            if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading || _isOAuthLoading ? null : _continue,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  backgroundColor: Color(0xffffd398),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Color(0xffd1d5dc))
                    : Text(
                        'Continue',
                        style: GoogleFonts.montserrat(
                          fontSize: 16,
                          color: Colors.black,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 20),

            // Divider
            Row(
              children: <Widget>[
                const Expanded(child: Divider(color: Color(0xffd1d5dc),)),
                Text(" or ", style: GoogleFonts.montserrat(color: Color(0xffd1d5dc),)),
                const Expanded(child: Divider(color: Color(0xffd1d5dc),)),
              ],
            ),
            const SizedBox(height: 20),

            // Google OAuth button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading || _isOAuthLoading ? null : _registerWithGoogle,
                icon: _isOAuthLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.g_mobiledata, size: 24),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  backgroundColor: Color(0xffffd398),
                  foregroundColor: Colors.black,
                  side: const BorderSide(color: Colors.grey),
                ),
                label: Text(
                  'Continue with Google',
                  style: GoogleFonts.montserrat(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Login link
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const LoginPage()),
                  );
                },
                child: Text(
                  'Already have an account? Log in here.',
                  style: Theme.of(context).textTheme.bodySmall
                  ),
                ),
              ),
          ],
            ),
        ),
    );
  }
}
