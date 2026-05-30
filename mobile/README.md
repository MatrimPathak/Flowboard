# Flowboard Android (Flutter)

Flutter Android app for [Flowboard](../README.md) — feature-identical to the web app, using the same Firebase project (`matrim-flowboard`) for Auth, Firestore, and Storage.

## Prerequisites

- Flutter SDK ≥ 3.22 (stable channel)
- Firebase CLI + FlutterFire CLI
- Android SDK (API 21+)

## First-time setup

### 1. Configure Firebase

Run FlutterFire CLI to generate `lib/firebase_options.dart` and download `android/app/google-services.json`:

```bash
cd mobile
dart pub global activate flutterfire_cli
flutterfire configure --project=matrim-flowboard
```

### 2. Install dependencies

```bash
flutter pub get
```

### 3. Run code generation

```bash
dart run build_runner build --delete-conflicting-outputs
```

### 4. Run the app

```bash
flutter run
```

## Architecture

```
lib/
├── core/
│   ├── constants/    # Firestore paths, ID prefixes, enums
│   ├── theme/        # Colors, typography
│   ├── router/       # go_router config with auth guard
│   ├── utils/        # Date parsing, ID generation
│   └── widgets/      # Shared UI components
└── features/
    ├── auth/         # Google + GitHub sign-in
    ├── workspaces/   # Workspace list, create, settings, members
    ├── projects/     # Project list, create, settings, members
    ├── tasks/        # Backlog, Kanban, task detail, comments
    ├── sprints/      # Sprint management
    ├── versions/     # Release management
    ├── members/      # Member avatars and lists
    └── docs/         # Rich text docs (flutter_markdown)
```

Each feature follows `data/` → `domain/` → `presentation/` layering with Riverpod providers.

## CI/CD

Built with [Codemagic](https://codemagic.io). See [`codemagic.yaml`](./codemagic.yaml).

Configure these environment variable groups in the Codemagic UI:
- `firebase_credentials` — `GOOGLE_SERVICES_JSON` (contents of `google-services.json`)
- `android_signing` — `CM_KEYSTORE`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`, `CM_KEY_PASSWORD`
- `google_play_credentials` — `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
