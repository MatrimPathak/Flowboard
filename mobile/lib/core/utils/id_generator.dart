import 'package:uuid/uuid.dart';

import '../constants/id_prefixes.dart';
import '../../features/tasks/domain/task_model.dart';

const _uuid = Uuid();

// Generates a prefixed ID matching the web app's generateId() function.
// Example: WKSP-A1B2C3D4, EPIC-E5F6G7H8
String generateId(String prefix) {
  final raw = _uuid.v4().replaceAll('-', '').substring(0, 8).toUpperCase();
  return '$prefix-$raw';
}

String generateWorkspaceId() => generateId(IdPrefix.workspace);
String generateProjectId() => generateId(IdPrefix.project);
String generateSprintId() => generateId(IdPrefix.sprint);
String generateReleaseId() => generateId(IdPrefix.release);
String generateMemberId() => generateId(IdPrefix.member);
String generateDocId() => generateId(IdPrefix.doc);
String generateCommentId() => generateId(IdPrefix.comment);
String generateWorklogId() => generateId(IdPrefix.worklog);
String generateAttachmentId() => generateId(IdPrefix.attachment);
String generateLinkId() => generateId(IdPrefix.link);
String generateActivityId() => generateId(IdPrefix.activity);

String generateTaskId(IssueType issueType) {
  return switch (issueType) {
    IssueType.epic => generateId(IdPrefix.epic),
    IssueType.story => generateId(IdPrefix.story),
    IssueType.spike => generateId(IdPrefix.spike),
    IssueType.bug => generateId(IdPrefix.bug),
    IssueType.task => generateId(IdPrefix.story),
  };
}

String generateInviteCode() {
  return _uuid.v4().replaceAll('-', '').substring(0, 10).toUpperCase();
}
