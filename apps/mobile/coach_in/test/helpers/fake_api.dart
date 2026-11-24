import 'dart:convert';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// A JWT that never expires, as the app only reads its `exp`.
String _fakeJwt() {
  String enc(Object o) => base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${enc({'alg': 'none'})}.${enc({'exp': 4102444800})}.sig';
}

/// Call once in `setUpAll`: no network fonts, and a stored session so that
/// authenticated requests are sent instead of redirecting to the start page.
void setUpFakeSession() {
  TestWidgetsFlutterBinding.ensureInitialized();
  GoogleFonts.config.allowRuntimeFetching = false;

  final token = _fakeJwt();
  TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
      .setMockMethodCallHandler(
    const MethodChannel('plugins.it_nomads.com/flutter_secure_storage'),
    (call) async {
      if (call.method == 'read' && call.arguments['key'] == 'accessToken') {
        return token;
      }
      return null;
    },
  );
}

typedef FakeResponse = ({int status, Object? body});

FakeResponse ok(Object? body) => (status: 200, body: body);
FakeResponse created(Object? body) => (status: 201, body: body);
FakeResponse noContent() => (status: 204, body: null);
FakeResponse failure(int status, String message) =>
    (status: status, body: {'message': message});

/// Fake API keyed by `"METHOD /path"` (query strings ignored). Unknown routes
/// answer like Nest does for a missing route: 404 `Cannot GET /path`.
class FakeApi {
  final Map<String, FakeResponse> routes;
  final List<http.Request> requests = [];

  FakeApi(this.routes);

  http.Request? lastRequest(String method, String path) {
    for (final r in requests.reversed) {
      if (r.method == method && r.url.path == path) return r;
    }
    return null;
  }

  Map<String, dynamic>? lastJsonBody(String method, String path) {
    final r = lastRequest(method, path);
    return r == null ? null : jsonDecode(r.body) as Map<String, dynamic>;
  }

  Future<T> run<T>(Future<T> Function() body) {
    return http.runWithClient(body, () => MockClient((request) async {
          requests.add(request);
          final r = routes['${request.method} ${request.url.path}'] ??
              failure(404, 'Cannot ${request.method} ${request.url.path}');
          return http.Response(
            r.body == null ? '' : jsonEncode(r.body),
            r.status,
            headers: {'content-type': 'application/json; charset=utf-8'},
          );
        }));
  }
}
