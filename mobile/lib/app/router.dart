import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../features/auth/presentation/auth_providers.dart';
import '../features/auth/presentation/screens/sign_in_screen.dart';
import '../features/auth/presentation/screens/sign_up_screen.dart';
import '../features/workspaces/presentation/screens/workspace_list_screen.dart';
import '../features/workspaces/presentation/screens/create_workspace_screen.dart';
import '../features/workspaces/presentation/screens/workspace_dashboard_screen.dart';
import '../features/workspaces/presentation/screens/workspace_settings_screen.dart';
import '../features/workspaces/presentation/screens/workspace_members_screen.dart';
import '../features/workspaces/presentation/screens/join_workspace_screen.dart';
import '../features/projects/presentation/screens/projects_list_screen.dart';
import '../features/projects/presentation/screens/create_project_screen.dart';
import '../features/projects/presentation/screens/project_overview_screen.dart';
import '../features/projects/presentation/screens/project_settings_screen.dart';
import '../features/projects/presentation/screens/project_members_screen.dart';
import '../features/tasks/presentation/screens/tasks_list_screen.dart';
import '../features/tasks/presentation/screens/task_detail_screen.dart';
import '../features/tasks/presentation/screens/create_task_screen.dart';
import '../features/sprints/presentation/screens/backlog_screen.dart';
import '../features/sprints/presentation/screens/active_sprint_screen.dart';
import '../features/versions/presentation/screens/releases_screen.dart';
import '../features/docs/presentation/screens/docs_list_screen.dart';
import '../features/docs/presentation/screens/doc_editor_screen.dart';

part 'router.g.dart';

// Shell widget providing persistent bottom navigation for workspace context
class _WorkspaceShell extends StatelessWidget {
  const _WorkspaceShell({required this.child, required this.workspaceId});

  final Widget child;
  final String workspaceId;

  @override
  Widget build(BuildContext context) => child;
}

@riverpod
GoRouter router(RouterRef ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoading = authState.isLoading;
      if (isLoading) return null;

      final isLoggedIn = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation.startsWith('/auth');

      if (!isLoggedIn && !isAuthRoute) return '/auth/sign-in';
      if (isLoggedIn && isAuthRoute) return '/';
      return null;
    },
    routes: [
      // ── Auth ─────────────────────────────────────────────────────────────────
      GoRoute(
        path: '/auth/sign-in',
        builder: (_, __) => const SignInScreen(),
      ),
      GoRoute(
        path: '/auth/sign-up',
        builder: (_, __) => const SignUpScreen(),
      ),

      // ── Workspace join (no auth check — handled by screen) ───────────────────
      GoRoute(
        path: '/workspace/:workspaceId/join/:inviteCode',
        builder: (_, state) => JoinWorkspaceScreen(
          workspaceId: state.pathParameters['workspaceId']!,
          inviteCode: state.pathParameters['inviteCode']!,
        ),
      ),

      // ── Authenticated routes ──────────────────────────────────────────────────
      GoRoute(
        path: '/',
        builder: (_, __) => const WorkspaceListScreen(),
      ),
      GoRoute(
        path: '/workspace/create',
        builder: (_, __) => const CreateWorkspaceScreen(),
      ),
      GoRoute(
        path: '/workspace/:workspaceId',
        builder: (_, state) => WorkspaceDashboardScreen(
          workspaceId: state.pathParameters['workspaceId']!,
        ),
        routes: [
          GoRoute(
            path: 'members',
            builder: (_, state) => WorkspaceMembersScreen(
              workspaceId: state.pathParameters['workspaceId']!,
            ),
          ),
          GoRoute(
            path: 'settings',
            builder: (_, state) => WorkspaceSettingsScreen(
              workspaceId: state.pathParameters['workspaceId']!,
            ),
          ),
          GoRoute(
            path: 'tasks',
            builder: (_, state) => TasksListScreen(
              workspaceId: state.pathParameters['workspaceId']!,
            ),
          ),
          GoRoute(
            path: 'docs',
            builder: (_, state) => DocsListScreen(
              workspaceId: state.pathParameters['workspaceId']!,
            ),
            routes: [
              GoRoute(
                path: ':docId',
                builder: (_, state) => DocEditorScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  docId: state.pathParameters['docId']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: 'projects',
            builder: (_, state) => ProjectsListScreen(
              workspaceId: state.pathParameters['workspaceId']!,
            ),
          ),
          GoRoute(
            path: 'project/create',
            builder: (_, state) => CreateProjectScreen(
              workspaceId: state.pathParameters['workspaceId']!,
            ),
          ),
          GoRoute(
            path: 'project/:projectId',
            builder: (_, state) => ProjectOverviewScreen(
              workspaceId: state.pathParameters['workspaceId']!,
              projectId: state.pathParameters['projectId']!,
            ),
            routes: [
              GoRoute(
                path: 'tasks',
                builder: (_, state) => TasksListScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId'],
                ),
              ),
              GoRoute(
                path: 'backlog',
                builder: (_, state) => BacklogScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId']!,
                ),
              ),
              GoRoute(
                path: 'sprint',
                builder: (_, state) => ActiveSprintScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId']!,
                ),
              ),
              GoRoute(
                path: 'releases',
                builder: (_, state) => ReleasesScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId']!,
                ),
              ),
              GoRoute(
                path: 'members',
                builder: (_, state) => ProjectMembersScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId']!,
                ),
              ),
              GoRoute(
                path: 'settings',
                builder: (_, state) => ProjectSettingsScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId']!,
                ),
              ),
              GoRoute(
                path: 'docs',
                builder: (_, state) => DocsListScreen(
                  workspaceId: state.pathParameters['workspaceId']!,
                  projectId: state.pathParameters['projectId'],
                ),
                routes: [
                  GoRoute(
                    path: ':docId',
                    builder: (_, state) => DocEditorScreen(
                      workspaceId: state.pathParameters['workspaceId']!,
                      docId: state.pathParameters['docId']!,
                      projectId: state.pathParameters['projectId'],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),

      // Task detail — type-agnostic, accepts any issue type
      GoRoute(
        path: '/task/:taskId',
        builder: (_, state) => TaskDetailScreen(
          taskId: state.pathParameters['taskId']!,
          workspaceId: state.uri.queryParameters['workspaceId'] ?? '',
          projectId: state.uri.queryParameters['projectId'] ?? '',
        ),
      ),
      GoRoute(
        path: '/task/create',
        builder: (_, state) => CreateTaskScreen(
          workspaceId: state.uri.queryParameters['workspaceId'] ?? '',
          projectId: state.uri.queryParameters['projectId'] ?? '',
        ),
      ),
    ],
  );
}
