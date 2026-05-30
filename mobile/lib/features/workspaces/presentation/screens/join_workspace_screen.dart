import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../auth/presentation/auth_providers.dart';
import '../../data/workspace_repository.dart';

class JoinWorkspaceScreen extends ConsumerStatefulWidget {
  const JoinWorkspaceScreen({
    super.key,
    required this.workspaceId,
    required this.inviteCode,
  });

  final String workspaceId;
  final String inviteCode;

  @override
  ConsumerState<JoinWorkspaceScreen> createState() =>
      _JoinWorkspaceScreenState();
}

class _JoinWorkspaceScreenState extends ConsumerState<JoinWorkspaceScreen> {
  bool _loading = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _join();
  }

  Future<void> _join() async {
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) {
        if (mounted) context.go('/auth/sign-in');
        return;
      }
      final workspace = await ref
          .read(workspaceRepositoryProvider)
          .joinWithInviteCode(
            widget.workspaceId,
            widget.inviteCode,
            user.uid,
            user.email ?? '',
            user.displayName,
          );
      if (mounted) context.go('/workspace/${workspace.id}');
    } catch (e) {
      setState(() => (_error = e, _loading = false));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: _loading
            ? const Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Joining workspace…'),
                ],
              )
            : Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline,
                        size: 48, color: Colors.red),
                    const SizedBox(height: 16),
                    Text(_error.toString(), textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: () => context.go('/'),
                      child: const Text('Go home'),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}
