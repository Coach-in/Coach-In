import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';

import '../config/api_config.dart';

import 'dart:developer' as developer;
import 'package:pretty_json/pretty_json.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<String?> getAccessToken() async => await _storage.read(key: 'accessToken');
  Future<String?> getIpAddress() async => await _storage.read(key: 'ip_address');

  Future<void> saveTokens(String access) async {
    await _storage.write(key: 'accessToken', value: access);
  }

  Future<void> clearTokens() async {
    await _storage.delete(key: 'accessToken');
    // Legacy key: the API no longer issues refresh tokens.
    await _storage.delete(key: 'refreshToken');
  }

  Map<String, dynamic>? _decodeJwt(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = utf8.decode(base64Url.decode(base64Url.normalize(parts[1])));
      return jsonDecode(payload);
    } catch (_) {
      return null;
    }
  }

  Future<bool> _isAccessTokenExpired() async {
    final token = await getAccessToken();
    if (token == null) return true;

    final decoded = _decodeJwt(token);
    if (decoded == null || !decoded.containsKey('exp')) return true;

    final exp = decoded['exp'] * 1000;
    final expiryDate = DateTime.fromMillisecondsSinceEpoch(exp);
    return DateTime.now().isAfter(expiryDate.subtract(const Duration(minutes: 1)));
  }

  /// Builds a readable message from an API error body. NestJS validation
  /// errors (400) return `message` as a list of strings.
  String _errorText(http.Response response, String fallback) {
    try {
      final message = jsonDecode(response.body)['message'];
      if (message is List) return message.join(', ');
      if (message != null) return message.toString();
    } catch (_) {}
    return fallback;
  }

  Future<http.Response> _sendRequest(
    Future<http.Response> Function(Map<String, String>) requestFn, {
    bool withAuth = false,
  }) async {
    Map<String, String> headers = Map.from(ApiConfig.defaultHeaders);

    if (withAuth) {
      if (await _isAccessTokenExpired()) {
        await clearTokens();
        throw Exception('Session expired. Please log in again.');
      }

      final token = await getAccessToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    final http.Response response = await requestFn(headers);

    // There is no refresh token: a 401 means the user must log in again.
    if (withAuth && response.statusCode == 401) {
      await clearTokens();
      throw Exception('Session expired. Please log in again.');
    }
    return response;
  }

  Future<http.Response> post(String endpoint, Map<String, dynamic> body,
      {bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    return _sendRequest(
      (headers) => http
          .post(url, headers: headers, body: jsonEncode(body))
          .timeout(ApiConfig.requestTimeout),
      withAuth: withAuth,
    );
  }

  Future<http.Response> filePost(String endpoint, File file, String extension,
    {bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    final headers = <String, String>{};
    if (withAuth) {
      final token = await _storage.read(key: 'accessToken');
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    final contentType = switch (extension) {
      'pdf'           => 'application/pdf',
      'png'           => 'image/png',
      'jpg' || 'jpeg' => 'image/jpeg',
      _ => throw Exception('Unsupported file type: $extension. Must be PDF, PNG, or JPEG.'),
    };

    final request = http.MultipartRequest('POST', url)
      ..headers.addAll(headers)
      ..files.add(await http.MultipartFile.fromPath(
        'file',
        file.path,
        contentType: MediaType.parse(contentType),
      ));

    final streamed = await request.send().timeout(ApiConfig.requestTimeout);
    return http.Response.fromStream(streamed);
  }

  Future<http.Response> patch(String endpoint, {bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    return _sendRequest(
      (headers) => http
          .patch(url, headers: headers)
          .timeout(ApiConfig.requestTimeout),
      withAuth: withAuth,
    );
  }

  Future<http.Response> put(String endpoint, Map<String, dynamic> body,
      {bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    return _sendRequest(
      (headers) => http
          .put(url, headers: headers, body: jsonEncode(body))
          .timeout(ApiConfig.requestTimeout),
      withAuth: withAuth,
    );
  }

  Future<http.Response> delete(String endpoint, {bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    return _sendRequest(
      (headers) => http
          .delete(url, headers: headers)
          .timeout(ApiConfig.requestTimeout),
      withAuth: withAuth,
    );
  }

  Future<http.Response> get(String endpoint, {bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    return _sendRequest(
      (headers) => http.get(url, headers: headers).timeout(ApiConfig.requestTimeout),
      withAuth: withAuth,
    );
  }

  Future<List<dynamic>> fetchTags() async {
    try {
      final response = await get('/tags');

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fetch tags (${response.statusCode})');
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<List<dynamic>> fetchAdmins() async {
    try {
      final response = await get('/admins', withAuth: true);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(_errorText(response, 'Failed to fetch admins (${response.statusCode})'));
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<List<dynamic>> fetchCoachDocuments() async {
    try {
      final response = await get('/coach-documents', withAuth: true);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception(_errorText(response, 'Failed to fetch coach documents (${response.statusCode})'));
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<void> reviewCoachDocument(String documentId, String action) async {
    assert(action == 'accept' || action == 'refuse');
    try {
      final response = await post(
        '/coach-documents/$documentId/$action',
        {},
        withAuth: true,
      );
      if (response.statusCode != 200 && response.statusCode != 201) {
        throw Exception('Failed to $action document (${response.statusCode})');
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<void> uploadCertification(String coachId, File file, String extension) async {
    if (!['pdf', 'png', 'jpg', 'jpeg'].contains(extension)) {
      throw Exception('Unsupported file type: $extension. Must be PDF, PNG, or JPEG.');
    }

    try {
      final response = await filePost(
        '/coach-documents/upload/$coachId',
        file,
        extension,
        withAuth: true,
      );

      developer.log(response.statusCode.toString());

      if (response.statusCode == 200 || response.statusCode == 201) {
        return;
      } else {
        throw Exception(_errorText(response, 'Failed to upload certification (${response.statusCode})'));
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<List<dynamic>> fetchCoaches() async {
    try {
      final response = await get('/coachs', withAuth: true);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fetch coachs (${response.statusCode})');
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<Map<String, dynamic>> fetchCurrentUser() async {
    final response = await get('/users/me', withAuth: true);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch user');
    }
  }

  Future<Map<String, dynamic>> fetchCoachInfo() async {
    final response = await get('/coachs/me', withAuth: true);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch coach info');
    }
  }

  Future<Map<String, dynamic>> fetchAthleteInfo() async {
    try {
      final response = await get('/athletes/me', withAuth: true);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to fetch athlete info (${response.statusCode})');
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<Map<String, dynamic>> fetchCoachById(String id) async {
    final response = await get('/coachs/$id', withAuth: true);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch coach');
    }
  }

  Future<void> requestRelationship(String athleteId, String coachId) async {
    final response = await post(
      '/relationships',
      {
        'athleteId': athleteId,
        'coachId': coachId,
      },
      withAuth: true,
    );

    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception(_errorText(response, 'Failed to request relationship'));
    }
  }

  Future<List<dynamic>> fetchRelationships() async {
    final response = await get('/relationships', withAuth: true);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch relationships');
    }
  }

  Future<void> reviewRelationship(String id, String action) async {
    assert(action == 'accept' || action == 'refuse');
    final response = await post('/relationships/$id/$action', {}, withAuth: true);

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(_errorText(response, 'Failed to $action relationship'));
    }
  }

  Future<List<dynamic>> fetchNotifications() async {
    final response = await get('/notifications', withAuth: true);

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to fetch notifications');
    }
  }

  Future<void> deleteNotification(String id) async {
    final response = await delete('/notifications/$id', withAuth: true);

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete notification');
    }
  }

  Future<void> markNotificationSeen(String id) async {
    final response = await patch('/notifications/$id/seen', withAuth: true);

    if (response.statusCode != 200) {
      throw Exception('Failed to mark notification as seen');
    }
  }

}

class AuthService {
  final ApiService _apiService = ApiService();

  Future<Map<String, dynamic>> registerCoach(String username, String email, String password, Map<String, dynamic> profile) async {
    try {
      final response = await _apiService.post('/users/auth/signup', {
        'username': username,
        'email': email,
        'password': password,
        'role': "coach",
        'coachProfile': profile
      });
      developer.log(profile.toString());
      developer.log(response.body.toString());

      developer.log(response.statusCode.toString());

      if (response.statusCode == 200 || response.statusCode == 201) {
        developer.log(prettyJson(response.body));
        printPrettyJson(response.body, indent: 2);
        // developer.log(response.body.toString());
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        return {
          'success': false,
          'message': '${_apiService._errorText(response, 'Request failed')} (${response.statusCode})',
          'details': response.body
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> registerAthlete(String username, String email, String password, Map<String, dynamic> profile) async {
    try {
      final response = await _apiService.post('/users/auth/signup', {
        'username': username,
        'email': email,
        'password': password,
        'role': "athlete",
        'athleteProfile': profile
      });

      developer.log(response.statusCode.toString());

      if (response.statusCode == 200 || response.statusCode == 201) {
        developer.log(response.body.toString());
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        return {
          'success': false,
          'message': '${_apiService._errorText(response, 'Request failed')} (${response.statusCode})',
          'details': response.body
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _apiService.post('/users/auth/login', {
        'email': email,
        'password': password,
      });

      if (response.statusCode == 200) {
        // The screen persists the tokens (login returns `{user, token}`).
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        developer.log(response.body.toString());
        return {
          'success': false,
          'message': '${_apiService._errorText(response, 'Request failed')} (${response.statusCode})',
          'details': response.body
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'An error occurred: $e'};
    }
  }

  Future<bool> isLoggedIn() async {
    final token = await _apiService.getAccessToken();
    return token != null && token.isNotEmpty && !(await _apiService._isAccessTokenExpired());
  }

}
