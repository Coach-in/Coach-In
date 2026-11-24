import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:io';

import 'package:flutter/material.dart';

import '../config/api_config.dart';
import '../utils/exercise_utils.dart';
import '../screens/start_page.dart';

import 'dart:developer' as developer;
import 'package:pretty_json/pretty_json.dart';

/// Thrown when the access token is expired or rejected. The API issues
/// 10-day access tokens and has no refresh endpoint, so the user must log in again.
class SessionExpiredException implements Exception {
  @override
  String toString() => 'Session expired. Please log in again.';
}

/// A non-success API response, carrying a user-facing (French) message.
class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  /// Uses the API's own message when it has one, otherwise a message based
  /// on the status code. 404 and 429 always use our own wording.
  factory ApiException.fromResponse(http.Response response) {
    final status = response.statusCode;
    String? apiMessage;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['message'] != null) {
        final m = decoded['message'];
        apiMessage = m is List ? m.join(', ') : m.toString();
      }
    } catch (_) {}

    final message = switch (status) {
      400 => apiMessage ?? 'Données invalides.',
      401 => apiMessage ?? 'Identifiants invalides.',
      403 => apiMessage ?? "Vous n'avez pas le droit d'effectuer cette action.",
      // Nest answers an unknown route with "Cannot GET /path": the server is
      // older than the app, which is different from a missing resource.
      404 when apiMessage?.startsWith('Cannot ') ?? false =>
        "Cette fonctionnalité n'est pas disponible sur ce serveur (API trop ancienne).",
      404 => 'Élément introuvable.',
      409 => apiMessage ?? 'Cette action a déjà été effectuée.',
      429 => 'Trop de tentatives. Réessayez dans quelques instants.',
      _ => apiMessage ?? 'Une erreur est survenue ($status).',
    };
    return ApiException(status, message);
  }

  @override
  String toString() => message;
}

/// Returns a message safe to show the user for any thrown error.
String errorMessage(Object e, {String fallback = 'Une erreur est survenue.'}) {
  if (e is ApiException) return e.message;
  if (e is SessionExpiredException) return 'Session expirée. Veuillez vous reconnecter.';
  if (e is TimeoutException || e is SocketException) {
    return 'Impossible de joindre le serveur.';
  }
  return fallback;
}

class ApiService {
  /// Used to send the user back to the start page when the session expires.
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

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

  /// Clears the stored session and sends the user back to the start page.
  Future<Never> _expireSession() async {
    await clearTokens();
    navigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const StartPage()),
      (_) => false,
    );
    throw SessionExpiredException();
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

  Future<http.Response> _sendRequest(
    Future<http.Response> Function(Map<String, String>) requestFn, {
    bool withAuth = false,
  }) async {
    Map<String, String> headers = Map.from(ApiConfig.defaultHeaders);

    if (withAuth) {
      if (await _isAccessTokenExpired()) await _expireSession();

      final token = await getAccessToken();
      if (token != null) headers['Authorization'] = 'Bearer $token';
    }

    final response = await requestFn(headers);

    if (withAuth && response.statusCode == 401) await _expireSession();
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
      'webp'          => 'image/webp',
      _ => throw Exception('Unsupported file type: $extension. Must be PDF, PNG, JPEG, or WEBP.'),
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

  Future<http.Response> patch(String endpoint,
      {Map<String, dynamic>? body, bool withAuth = false}) async {
    final baseUrl = ApiConfig.getBaseUrl();
    final url = Uri.parse('$baseUrl$endpoint');

    return _sendRequest(
      (headers) => http
          .patch(url,
              headers: headers, body: body == null ? null : jsonEncode(body))
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
        throw ApiException.fromResponse(response);
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  /// Builds `endpoint?limit=..&offset=..`. The API accepts limit 1-100 and
  /// offset >= 0, and returns everything when neither is given.
  static String paginated(String endpoint, {int? limit, int? offset}) {
    final params = <String, String>{
      if (limit != null) 'limit': '${limit.clamp(1, 100)}',
      if (offset != null) 'offset': '${offset < 0 ? 0 : offset}',
    };
    return params.isEmpty ? endpoint : Uri(path: endpoint, queryParameters: params).toString();
  }

  Future<List<dynamic>> fetchCoachDocuments({int? limit, int? offset}) async {
    try {
      final response = await get(paginated('/coach-documents', limit: limit, offset: offset), withAuth: true);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw ApiException.fromResponse(response);
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
        throw ApiException.fromResponse(response);
      }
    } catch (e) {
      throw Exception('An error occurred: $e');
    }
  }

  Future<List<dynamic>> fetchCoaches({int? limit, int? offset}) async {
    try {
      final response = await get(paginated('/coachs', limit: limit, offset: offset), withAuth: true);
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
      throw ApiException.fromResponse(response);
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
      throw ApiException.fromResponse(response);
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

  Future<void> _patchResource(String path, Map<String, dynamic> body) async {
    final response = await patch(path, body: body, withAuth: true);

    if (response.statusCode != 200) throw ApiException.fromResponse(response);
  }

  Future<void> updateUser(String userId, Map<String, dynamic> body) =>
      _patchResource('/users/$userId', body);

  /// Permanently deletes the account (`DELETE /users/:id`) and clears the session.
  Future<void> deleteAccount(String userId) async {
    final response = await delete('/users/$userId', withAuth: true);
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw ApiException.fromResponse(response);
    }
    await clearTokens();
  }

  Future<void> updateAthlete(String athleteId, Map<String, dynamic> body) =>
      _patchResource('/athletes/$athleteId', body);

  Future<void> updateCoach(String coachId, Map<String, dynamic> body) =>
      _patchResource('/coachs/$coachId', body);

  // ---------- Programmes ----------

  Future<dynamic> _decodeOrThrow(http.Response response, {int expected = 200}) {
    if (response.statusCode != expected) throw ApiException.fromResponse(response);
    return Future.value(jsonDecode(response.body));
  }

  /// Programmes you own or that are assigned to you, without their days.
  Future<List<dynamic>> fetchProgrammes({bool? template}) async {
    final query = template == null ? '' : '?template=$template';
    final response = await get('/programmes$query', withAuth: true);
    return await _decodeOrThrow(response) as List<dynamic>;
  }

  Future<Map<String, dynamic>> fetchProgramme(String id) async {
    final response = await get('/programmes/$id', withAuth: true);
    return await _decodeOrThrow(response) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createProgramme(Map<String, dynamic> body) async {
    final response = await post('/programmes', body, withAuth: true);
    return await _decodeOrThrow(response, expected: 201) as Map<String, dynamic>;
  }

  Future<void> deleteProgramme(String id) => _deleteOrThrow('/programmes/$id');

  Future<Map<String, dynamic>> updateProgramme(
      String id, Map<String, dynamic> body) async {
    final response = await patch('/programmes/$id', body: body, withAuth: true);
    return await _decodeOrThrow(response) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> addProgrammeDay(
      String programmeId, Map<String, dynamic> body) async {
    final response = await post('/programmes/$programmeId/days', body, withAuth: true);
    return await _decodeOrThrow(response, expected: 201) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateProgrammeDay(
      String programmeId, String dayId, Map<String, dynamic> body) async {
    final response = await patch('/programmes/$programmeId/days/$dayId',
        body: body, withAuth: true);
    return await _decodeOrThrow(response) as Map<String, dynamic>;
  }

  Future<void> deleteProgrammeDay(String programmeId, String dayId) =>
      _deleteOrThrow('/programmes/$programmeId/days/$dayId');

  Future<Map<String, dynamic>> addProgrammeExercise(
      String programmeId, String dayId, Map<String, dynamic> body) async {
    final response = await post(
        '/programmes/$programmeId/days/$dayId/exercises', body,
        withAuth: true);
    return await _decodeOrThrow(response, expected: 201) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateProgrammeExercise(String programmeId,
      String dayId, String exerciseId, Map<String, dynamic> body) async {
    final response = await patch(
        '/programmes/$programmeId/days/$dayId/exercises/$exerciseId',
        body: body,
        withAuth: true);
    return await _decodeOrThrow(response) as Map<String, dynamic>;
  }

  Future<void> deleteProgrammeExercise(
          String programmeId, String dayId, String exerciseId) =>
      _deleteOrThrow(
          '/programmes/$programmeId/days/$dayId/exercises/$exerciseId');

  Future<void> _deleteOrThrow(String path) async {
    final response = await delete(path, withAuth: true);
    if (response.statusCode != 200 && response.statusCode != 204) {
      throw ApiException.fromResponse(response);
    }
  }

  /// Adds an exercise to the shared catalogue (`POST /exercices`).
  Future<Map<String, dynamic>> createExercise(String name,
      {String? description}) async {
    final desc = description?.trim() ?? '';
    final response = await post(
      '/exercices',
      {'name': name.trim(), if (desc.isNotEmpty) 'description': desc},
      withAuth: true,
    );
    return await _decodeOrThrow(response, expected: 201) as Map<String, dynamic>;
  }

  /// Uploads or replaces an exercise image (`POST /exercices/:id/image`).
  /// Only the exercise's creator may do it. Returns the updated exercise.
  Future<Map<String, dynamic>> uploadExerciseImage(
      String exerciseId, File file, String extension) async {
    final response = await filePost('/exercices/$exerciseId/image', file, extension,
        withAuth: true);
    return await _decodeOrThrow(response, expected: 201) as Map<String, dynamic>;
  }

  /// Copies a default exercise into the shared catalogue. If an exercise with
  /// that name already exists (409, e.g. created by the web app or another
  /// user) the existing one is returned instead.
  Future<Map<String, dynamic>> materializeExercise(
      Map<String, dynamic> template) async {
    final name = template['name'] as String;
    try {
      return await createExercise(name,
          description: template['description'] as String?);
    } on ApiException catch (e) {
      if (e.statusCode != 409) rethrow;
      final existing = findExerciseByName(
          List<Map<String, dynamic>>.from(await fetchExercises()), name);
      if (existing == null) rethrow;
      return existing;
    }
  }

  /// The exercise catalogue (`GET /exercices`).
  Future<List<dynamic>> fetchExercises() async {
    final response = await get('/exercices', withAuth: true);
    return await _decodeOrThrow(response) as List<dynamic>;
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
          'message': ApiException.fromResponse(response).message,
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
          'message': ApiException.fromResponse(response).message,
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
          'message': ApiException.fromResponse(response).message,
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
