import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'register.dart';
import 'start_page.dart';
import './explore_page.dart';

import '../services/api_service.dart';
import '../services/oauth_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  bool _isLoading = false;
  bool _isOAuthLoading = false;
  bool _rememberMe = false;
  String? _errorMessage;

  final AuthService _authService = AuthService();
  final ApiService _apiService = ApiService();

  @override
  void initState() {
    super.initState();
    _loadRememberMe();
  }

  Future<void> _loadRememberMe() async {
    final remember = await _storage.read(key: 'rememberMe');
    if (remember == 'true') {
      final accessToken = await _storage.read(key: 'accessToken');
      if (accessToken != null) {
        if (!mounted) return;
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(builder: (context) => const ExplorePage()),
        );
      }
      setState(() => _rememberMe = true);
    }
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final result = await _authService.login(
      _emailController.text.trim(),
      _passwordController.text.trim(),
    );

    if (!mounted) return;

    setState(() => _isLoading = false);

    if (result['success']) {
      final data = result['data'];
      final accessToken = data['access_token'];
      final refreshToken = data['refresh_token'];

      await _storage.write(key: 'accessToken', value: accessToken);
      await _storage.write(key: 'refreshToken', value: refreshToken);
      await _storage.write(key: 'rememberMe', value: _rememberMe.toString());

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const ExplorePage()),
      );
    } else {
      setState(() {
        _errorMessage =
            result['message'] ?? 'Invalid credentials. Please try again.';
      });
    }
  }

  Future<void> _loginWithGoogle() async {
    setState(() {
      _isOAuthLoading = true;
      _errorMessage = null;
    });

    final result = await _apiService.loginWithGoogle();

    if (!mounted) return;

    setState(() => _isOAuthLoading = false);

    if (result['success']) {
      await _storage.write(key: 'rememberMe', value: _rememberMe.toString());

      if (!mounted) return;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const ExplorePage()),
      );
    } else {
      setState(() {
        _errorMessage = result['message'] ?? 'Google login failed';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Log in',
          style: GoogleFonts.nunitoSans(
              fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.black,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () {
            Navigator.push(
                context, MaterialPageRoute(builder: (context) => StartPage()));
          },
          tooltip: 'Back',
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: ListView(
          children: [
            const SizedBox(height: 10),

            // Email field
            TextFormField(
              controller: _emailController,
              decoration: InputDecoration(
                floatingLabelBehavior: FloatingLabelBehavior.always,
                labelText: 'Email',
                labelStyle: GoogleFonts.nunitoSans(fontWeight: FontWeight.w600),
                prefixIcon: const Icon(Icons.email),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
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
                labelStyle: GoogleFonts.nunitoSans(fontWeight: FontWeight.w600),
                prefixIcon: const Icon(Icons.lock),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),

            // Remember me checkbox
            Row(
              children: [
                Checkbox(
                  value: _rememberMe,
                  onChanged: (val) {
                    setState(() => _rememberMe = val ?? false);
                  },
                ),
                Text('Remember me', style: GoogleFonts.nunitoSans()),
              ],
            ),

            const SizedBox(height: 20),

            // Error message
            if (_errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: Colors.red),
                ),
              ),

            // Email/Password Login button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading || _isOAuthLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(45),
                    ),
                    backgroundColor: Colors.black),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text('Log in',
                        style: GoogleFonts.nunitoSans(
                            fontSize: 16,
                            color: Colors.white,
                            fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 20),

            // Divider
            Row(children: <Widget>[
              const Expanded(child: Divider()),
              Text(" or ", style: GoogleFonts.nunitoSans()),
              const Expanded(child: Divider()),
            ]),
            const SizedBox(height: 20),

            // Google OAuth button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: _isLoading || _isOAuthLoading ? null : _loginWithGoogle,
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
                    borderRadius: BorderRadius.circular(45),
                  ),
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  side: const BorderSide(color: Colors.grey),
                ),
                label: Text(
                  'Continue with Google',
                  style: GoogleFonts.nunitoSans(fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 10),

            // Sign up link
            SizedBox(
              width: double.infinity,
              child: TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => const RegisterPage()),
                  );
                },
                child: Text(
                  'New to AREA? Sign up here.',
                  style: GoogleFonts.nunitoSans(
                      fontSize: 16,
                      color: Colors.black,
                      fontWeight: FontWeight.bold,
                      decoration: TextDecoration.underline),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
