import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';

// Mirrors the web app's normalizeDate() — handles both ISO strings and
// Firestore Timestamps, since the web stores dates in both formats.
DateTime? parseDate(dynamic value) {
  if (value == null) return null;
  if (value is Timestamp) return value.toDate();
  if (value is String) return DateTime.tryParse(value);
  return null;
}

String formatDate(DateTime date) =>
    DateFormat('MMM d, yyyy').format(date.toLocal());

String formatDateTime(DateTime date) =>
    DateFormat('MMM d, yyyy · h:mm a').format(date.toLocal());

String isoNow() => DateTime.now().toUtc().toIso8601String();

String formatDuration(int minutes) {
  if (minutes < 60) return '${minutes}m';
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return m == 0 ? '${h}h' : '${h}h ${m}m';
}
