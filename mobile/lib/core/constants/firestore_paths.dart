import 'package:cloud_firestore/cloud_firestore.dart';

// Mirrors the Firestore collection structure from the web app.
// All paths are defined here as the single source of truth.
class FirestorePaths {
  // ── Root collections ────────────────────────────────────────────────────────

  static CollectionReference<Map<String, dynamic>> workspaces(
          FirebaseFirestore db) =>
      db.collection('workspaces');

  static DocumentReference<Map<String, dynamic>> workspace(
          FirebaseFirestore db, String workspaceId) =>
      workspaces(db).doc(workspaceId);

  static CollectionReference<Map<String, dynamic>> members(
          FirebaseFirestore db) =>
      db.collection('members');

  // ── Workspace subcollections ────────────────────────────────────────────────

  static CollectionReference<Map<String, dynamic>> workspaceDocs(
          FirebaseFirestore db, String workspaceId) =>
      workspace(db, workspaceId).collection('docs');

  static CollectionReference<Map<String, dynamic>> projects(
          FirebaseFirestore db, String workspaceId) =>
      workspace(db, workspaceId).collection('projects');

  static DocumentReference<Map<String, dynamic>> project(
          FirebaseFirestore db, String workspaceId, String projectId) =>
      projects(db, workspaceId).doc(projectId);

  static CollectionReference<Map<String, dynamic>> projectMembers(
          FirebaseFirestore db, String workspaceId, String projectId) =>
      project(db, workspaceId, projectId).collection('members');

  // ── Project subcollections ───────────────────────────────────────────────────

  static CollectionReference<Map<String, dynamic>> tasks(
          FirebaseFirestore db, String workspaceId, String projectId) =>
      project(db, workspaceId, projectId).collection('tasks');

  static DocumentReference<Map<String, dynamic>> task(
      FirebaseFirestore db,
      String workspaceId,
      String projectId,
      String taskId) =>
      tasks(db, workspaceId, projectId).doc(taskId);

  static CollectionReference<Map<String, dynamic>> taskComments(
      FirebaseFirestore db,
      String workspaceId,
      String projectId,
      String taskId) =>
      task(db, workspaceId, projectId, taskId).collection('comments');

  static CollectionReference<Map<String, dynamic>> taskWorklogs(
      FirebaseFirestore db,
      String workspaceId,
      String projectId,
      String taskId) =>
      task(db, workspaceId, projectId, taskId).collection('worklogs');

  static CollectionReference<Map<String, dynamic>> taskAttachments(
      FirebaseFirestore db,
      String workspaceId,
      String projectId,
      String taskId) =>
      task(db, workspaceId, projectId, taskId).collection('attachments');

  static CollectionReference<Map<String, dynamic>> taskLinks(
      FirebaseFirestore db,
      String workspaceId,
      String projectId,
      String taskId) =>
      task(db, workspaceId, projectId, taskId).collection('links');

  static CollectionReference<Map<String, dynamic>> taskActivity(
      FirebaseFirestore db,
      String workspaceId,
      String projectId,
      String taskId) =>
      task(db, workspaceId, projectId, taskId).collection('activity');

  static CollectionReference<Map<String, dynamic>> sprints(
          FirebaseFirestore db, String workspaceId, String projectId) =>
      project(db, workspaceId, projectId).collection('sprints');

  static DocumentReference<Map<String, dynamic>> sprint(
          FirebaseFirestore db,
          String workspaceId,
          String projectId,
          String sprintId) =>
      sprints(db, workspaceId, projectId).doc(sprintId);

  static CollectionReference<Map<String, dynamic>> versions(
          FirebaseFirestore db, String workspaceId, String projectId) =>
      project(db, workspaceId, projectId).collection('versions');

  static DocumentReference<Map<String, dynamic>> version(
          FirebaseFirestore db,
          String workspaceId,
          String projectId,
          String versionId) =>
      versions(db, workspaceId, projectId).doc(versionId);

  static CollectionReference<Map<String, dynamic>> projectDocs(
          FirebaseFirestore db, String workspaceId, String projectId) =>
      project(db, workspaceId, projectId).collection('docs');

  // ── Storage paths ────────────────────────────────────────────────────────────

  static String workspaceImage(String workspaceId) =>
      'images/workspace-$workspaceId';

  static String projectImage(String projectId) =>
      'images/project-$projectId';

  static String taskAttachment(
          String workspaceId, String taskId, String filename) =>
      'attachments/$workspaceId/$taskId/$filename';
}
