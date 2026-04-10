# API Contracts

## Planned Route and Action Surface

### Auth and Onboarding

- `POST /auth/callback`: Supabase auth callback handling
- `completeOnboarding(input)`: stores role, profile, and accessibility settings

### Lessons

- `getStudentDashboard(userId)`: returns assigned course progress and recent activity
- `getLessonDetail(lessonId, userId)`: returns lesson content, steps, workspace state, and progress
- `saveProgram(input)`: stores workspace JSON by lesson step
- `runProgram(input)`: validates and simulates program execution
- `submitLessonStep(input)`: evaluates completion logic and updates progress

### Confidence and Inspiration

- `submitConfidenceCheckin(input)`: stores post-lesson confidence responses
- `listRoleModels()`: returns published inspiration entries

### Admin

- `upsertLesson(input)`: creates or edits lessons
- `upsertLessonStep(input)`: creates or edits lesson steps
- `upsertRoleModelEntry(input)`: creates or edits inspiration content
- `getAdminMetrics()`: returns progress and voice log aggregates
- `listVoiceCommandLogs(filters)`: returns recent voice command activity

