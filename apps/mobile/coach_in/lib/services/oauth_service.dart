import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import 'api_service.dart';

import '../config/api_config.dart';

class OAuthService {
  static final OAuthService _instance = OAuthService._internal();
  factory OAuthService() => _instance;
  OAuthService._internal();

  Future<Map<String, dynamic>> loginWithGoogle() async {
    return _performOAuthFlow('google');
  }

  Future<Map<String, dynamic>> _performOAuthFlow(String provider) async {
    try {
      final baseUrl = ApiConfig.getBaseUrl();
      final initUrl = Uri.parse('$baseUrl/api/auth/oauth/$provider/login?platform=mobile');

      final initResponse = await http.get(
        initUrl,
        headers: ApiConfig.defaultHeaders,
      ).timeout(ApiConfig.requestTimeout);

      if (initResponse.statusCode != 200) {
        throw Exception('Failed to initialize OAuth: ${initResponse.statusCode}');
      }

      final initData = jsonDecode(initResponse.body);
      final authUrl = initData['authorization_url'];
      final sessionId = initData['session_id'];

      if (authUrl == null || sessionId == null) {
        throw Exception('Invalid OAuth initialization response');
      }

      final uri = Uri.parse(authUrl);
      if (!await launchUrl(uri)) {
        throw Exception('Could not launch OAuth URL');
      }

      final result = await _pollForOAuthCompletion(sessionId);
      return result;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _pollForOAuthCompletion(String sessionId) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final statusUrl = Uri.parse('$baseUrl/api/auth/oauth/status/$sessionId');

    const pollInterval = Duration(seconds: 2);
    const maxAttempts = 150;

    for (int attempt = 0; attempt < maxAttempts; attempt++) {
      await Future.delayed(pollInterval);

      try {
        final response = await http.get(
          statusUrl,
          headers: ApiConfig.defaultHeaders,
        ).timeout(ApiConfig.requestTimeout);

        if (response.statusCode == 404) {
          throw Exception('OAuth session not found or expired');
        }

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          final status = data['status'];

          if (status == 'completed') {
            return {
              'access_token': data['access_token'],
              'refresh_token': data['refresh_token'],
              'user_id': data['user_id'],
              'email': data['email'],
              'username': data['username'],
            };
          } else if (status == 'expired') {
            throw Exception('OAuth session expired. Please try again.');
          } else if (status == 'pending') {
            continue;
          }
        }
      } catch (e) {
        if (e.toString().contains('expired') || e.toString().contains('not found')) {
          rethrow;
        }
      }
    }

    throw Exception('OAuth timeout - please try again');
  }
}

extension OAuthApiService on ApiService {
  Future<Map<String, dynamic>> loginWithGoogle() async {
    try {
      final oauth = OAuthService();
      final result = await oauth.loginWithGoogle();

      await saveTokens(result['access_token'], result['refresh_token']);

      return {
        'success': true,
        'data': result,
      };
    } catch (e) {
      return {
        'success': false,
        'message': 'Google login failed: $e',
      };
    }
  }
}
