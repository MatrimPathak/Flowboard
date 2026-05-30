import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../data/task_repository.dart';
import '../domain/task_comment_model.dart';
import '../domain/task_link_model.dart';
import '../domain/task_attachment_model.dart';
import '../domain/task_activity_model.dart';
import '../domain/task_model.dart';
import '../domain/work_log_model.dart';

part 'task_providers.g.dart';

@riverpod
Stream<List<TaskModel>> projectTasks(
  ProjectTasksRef ref,
  String workspaceId,
  String projectId, {
  TaskFilters? filters,
}) {
  return ref
      .watch(taskRepositoryProvider)
      .watchProjectTasks(workspaceId, projectId, filters: filters);
}

@riverpod
Stream<List<TaskModel>> workspaceTasks(
    WorkspaceTasksRef ref, String workspaceId) {
  return ref
      .watch(taskRepositoryProvider)
      .watchWorkspaceTasks(workspaceId);
}

@riverpod
Future<TaskModel> task(
    TaskRef ref, String workspaceId, String projectId, String taskId) {
  return ref
      .watch(taskRepositoryProvider)
      .getTask(workspaceId, projectId, taskId);
}

@riverpod
Stream<List<TaskCommentModel>> taskComments(
    TaskCommentsRef ref, String workspaceId, String projectId, String taskId) {
  return ref
      .watch(taskRepositoryProvider)
      .watchComments(workspaceId, projectId, taskId);
}

@riverpod
Stream<List<WorkLogModel>> taskWorklogs(
    TaskWorklogsRef ref, String workspaceId, String projectId, String taskId) {
  return ref
      .watch(taskRepositoryProvider)
      .watchWorklogs(workspaceId, projectId, taskId);
}

@riverpod
Stream<List<TaskAttachmentModel>> taskAttachments(
    TaskAttachmentsRef ref,
    String workspaceId,
    String projectId,
    String taskId) {
  return ref
      .watch(taskRepositoryProvider)
      .watchAttachments(workspaceId, projectId, taskId);
}

@riverpod
Stream<List<TaskLinkModel>> taskLinks(
    TaskLinksRef ref, String workspaceId, String projectId, String taskId) {
  return ref
      .watch(taskRepositoryProvider)
      .watchLinks(workspaceId, projectId, taskId);
}

@riverpod
Stream<List<TaskActivityModel>> taskActivity(
    TaskActivityRef ref, String workspaceId, String projectId, String taskId) {
  return ref
      .watch(taskRepositoryProvider)
      .watchActivity(workspaceId, projectId, taskId);
}
