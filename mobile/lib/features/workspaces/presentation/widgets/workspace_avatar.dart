import 'package:flutter/material.dart';

import '../../../../core/widgets/app_avatar.dart';
import '../../domain/workspace_model.dart';

class WorkspaceAvatar extends StatelessWidget {
  const WorkspaceAvatar({super.key, required this.workspace, this.size = 36});

  final WorkspaceModel workspace;
  final double size;

  @override
  Widget build(BuildContext context) => AppAvatar(
        name: workspace.name,
        imageUrl: workspace.imageUrl,
        size: size,
      );
}
