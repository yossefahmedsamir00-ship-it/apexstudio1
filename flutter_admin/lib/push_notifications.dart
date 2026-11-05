import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

const _firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
const _firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
const _firebaseMessagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
const _firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
const _firebaseIosBundleId = String.fromEnvironment('FIREBASE_IOS_BUNDLE_ID');

bool get firebasePushConfigured =>
    _firebaseApiKey.isNotEmpty &&
    _firebaseAppId.isNotEmpty &&
    _firebaseMessagingSenderId.isNotEmpty &&
    _firebaseProjectId.isNotEmpty;

FirebaseOptions get _firebaseOptions => FirebaseOptions(
  apiKey: _firebaseApiKey,
  appId: _firebaseAppId,
  messagingSenderId: _firebaseMessagingSenderId,
  projectId: _firebaseProjectId,
  iosBundleId: _firebaseIosBundleId.isEmpty ? null : _firebaseIosBundleId,
);

@pragma('vm:entry-point')
Future<void> apexFirebaseMessagingBackgroundHandler(RemoteMessage message) async {
  if (!firebasePushConfigured) return;
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: _firebaseOptions);
  }
}

class ApexPushNotifications {
  ApexPushNotifications(this._client);

  final SupabaseClient _client;
  final FlutterLocalNotificationsPlugin _local = FlutterLocalNotificationsPlugin();
  StreamSubscription<RemoteMessage>? _foregroundSubscription;
  StreamSubscription<RemoteMessage>? _openedSubscription;
  StreamSubscription<String>? _tokenSubscription;
  void Function(String conversationId)? _onConversationTap;

  static Future<void> configureBackgroundHandler() async {
    if (!firebasePushConfigured) return;
    await configureBackgroundHandler();
  }

  static const _channel = AndroidNotificationChannel(
    'apex_client_messages',
    'APEX client messages',
    description: 'Notifications when a client sends a message to APEX STUDIO.',
    importance: Importance.high,
  );

  Future<bool> initialize({
    required void Function(String conversationId) onConversationTap,
  }) async {
    if (!firebasePushConfigured) return false;
    _onConversationTap = onConversationTap;

    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(options: _firebaseOptions);
    }
    FirebaseMessaging.onBackgroundMessage(apexFirebaseMessagingBackgroundHandler);

    await _local.initialize(
      const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
      onDidReceiveNotificationResponse: (response) {
        final id = response.payload;
        if (id != null && id.isNotEmpty) _onConversationTap?.call(id);
      },
    );
    await _local
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(_channel);

    _foregroundSubscription ??= FirebaseMessaging.onMessage.listen(_showForeground);
    _openedSubscription ??= FirebaseMessaging.onMessageOpenedApp.listen(_handleOpened);
    _tokenSubscription ??= FirebaseMessaging.instance.onTokenRefresh.listen(_saveToken);

    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _handleOpened(initial);
    return true;
  }

  Future<bool> requestPermissionAndRegister() async {
    if (!firebasePushConfigured) return false;
    final settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    final allowed = settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;
    if (!allowed) return false;
    final token = await FirebaseMessaging.instance.getToken();
    if (token == null || token.isEmpty) return false;
    await _saveToken(token);
    return true;
  }

  Future<void> _saveToken(String token) async {
    final user = _client.auth.currentUser;
    if (user == null || token.isEmpty) return;
    final platform = switch (defaultTargetPlatform) {
      TargetPlatform.android => 'android',
      TargetPlatform.iOS => 'ios',
      _ => 'other',
    };
    await _client.from('apex_owner_push_devices').upsert({
      'owner_user_id': user.id,
      'fcm_token': token,
      'platform': platform,
      'last_seen_at': DateTime.now().toUtc().toIso8601String(),
    }, onConflict: 'fcm_token');
  }

  void _handleOpened(RemoteMessage message) {
    final conversationId = message.data['conversation_id']?.toString();
    if (conversationId != null && conversationId.isNotEmpty) {
      _onConversationTap?.call(conversationId);
    }
  }

  Future<void> _showForeground(RemoteMessage message) async {
    final conversationId = message.data['conversation_id']?.toString() ?? '';
    await _local.show(
      message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch.remainder(100000),
      message.notification?.title ?? 'APEX STUDIO',
      message.notification?.body ?? 'New client message received.',
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'apex_client_messages',
          'APEX client messages',
          channelDescription: 'Notifications when a client sends a message to APEX STUDIO.',
          importance: Importance.high,
          priority: Priority.high,
        ),
        iOS: DarwinNotificationDetails(),
      ),
      payload: conversationId,
    );
  }

  Future<void> dispose() async {
    await _foregroundSubscription?.cancel();
    await _openedSubscription?.cancel();
    await _tokenSubscription?.cancel();
  }
}
