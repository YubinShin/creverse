# Creverse Assignment

백엔드 과제 프로젝트입니다. NestJS 기반의 모노레포 구조로, API 서버와 Worker 프로세스를 분리하여 구현하였습니다.

## ERD

<img width="1975" height="1867" alt="creverse_erd" src="https://github.com/user-attachments/assets/3665e036-11cf-436b-9d35-4efcdaeb1155" />

## Diagram

```mermaid
flowchart TD
    student([Student]) --> api[Submission Evaluation API System]

    api --> openai[Azure OpenAI]
    api --> blob[Azure Blob Storage]
    api --> alert[Slack/Alert Webhook]

```

```mermaid
flowchart LR
    subgraph System [Submission Evaluation System]
        direction TB

        api[API Server - NestJS]
        worker[Worker - NestJS]
        db[(PostgreSQL DB)]
        redis[(Redis Queue)]
        openai[Azure OpenAI]
        blob[Azure Blob Storage]
        alert[Slack/Alert]
    end

    api --> db
    api --> redis
    api --> worker
    worker --> openai
    worker --> blob
    worker --> alert
```

```mermaid
flowchart TD
    subgraph api
        direction TB
        auth[Auth Module - JWT Guard]
        students[Students Module - CRUD]
        submissions[Submissions Module - Create/List/Validation]
        publisher[Publisher Module - BullMQ Job]
        logger[Common/Logger - Trace & Logs]
    end
```

## Tech Stack

- **Backend Framework**: NestJS (monorepo)
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ (Redis)
- **Storage**: Azure Blob Storage
- **AI**: Azure OpenAI Service
- **Logger**: Custom Logger + Interceptors
- **Test**: Jest (Unit & E2E)

## Architecture

```
API Server (apps/api)
 ├─ Auth (JWT 기반)
 ├─ Students (학생 등록/조회)
 ├─ Submissions (과제 제출/조회, 큐 발행)
 └─ Publisher (BullMQ job 발행)

Worker (apps/worker)
 ├─ JobsProcessor (BullMQ 소비자)
 ├─ AI 평가 (libs/ai)
 ├─ Media 처리 (libs/common/media)
 └─ Azure Storage 업로드 (libs/storage)

Shared Libraries (libs)
 ├─ ai        (AI 평가 서비스)
 ├─ alert     (알림 서비스)
 ├─ common    (공통 유틸, 미디어 처리, HTTP, config)
 ├─ logger    (로그 모듈)
 ├─ prisma    (DB 접근)
 └─ storage   (Azure Blob Storage 모듈)
```

## API Endpoints

### Auth

- **POST** `/api/v1/auth/token`
  테스트용 JWT 토큰 발급 API. 실제 인증/인가 로직이 아닌, 과제 실행 및 테스트를 위해 임시 토큰을 발급합니다.

### Submissions

- **POST** `/api/v1/submissions`
  학생이 과제를 제출합니다. 텍스트(`submitText`)와 선택적으로 영상 파일(MP4)을 업로드할 수 있습니다. 제출 직후 BullMQ Job이 발행되어 Worker가 처리합니다.

- **GET** `/api/v1/submissions`
  제출된 과제 목록을 조회합니다. 상태 필터, 페이지네이션, 정렬, 검색(`studentId`, `studentName`) 기능을 지원합니다.

- **GET** `/api/v1/submissions/{id}`
  특정 제출물의 상세 평가 결과를 조회합니다.

Swagger UI에서 더 많은 요청/응답 예시를 확인할 수 있습니다:

- Swagger UI: [http://localhost:3000/docs](http://localhost:3000/docs)
- OpenAPI JSON: [http://localhost:3000/docs-json](http://localhost:3000/docs-json)

## Getting Started

### 1. 환경 변수 설정

루트에 `.env` 파일을 생성합니다. 예시는 `.env.example`를 참고하세요.

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth
JWT_SECRET=your-jwt-secret
ACCESS_CODE=your-access-code
MAX_RETRY=3

# Alert
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
TRACE_ID=optional-default-trace

# Azure OpenAI
AZURE_ENDPOINT_URL=https://<your-resource>.openai.azure.com
AZURE_ENDPOINT_KEY=<your-azure-openai-key>
AZURE_OPENAI_DEPLOYMENT_NAME=feedback-01
OPENAPI_API_VERSION=2023-05-15

# Azure Blob Storage
AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=...;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_CONTAINER=task

# Queue
QUEUE_NAME=jobs
```

### 2. 의존성 설치

```bash
npm install
```

### 3. DB 마이그레이션 및 시드

```bash
npx prisma migrate dev
npx ts-node prisma/seed.ts
```

### 4. 로컬 실행

```bash
# API 서버 실행
npm run start:dev api

# Worker 실행
npm run start:dev worker
```

### 5. Docker Compose 실행

```bash
docker-compose up -d
```

## Features

- 학생 등록 / 조회 API
- 과제 제출 API (파일 업로드 → Blob 저장 → BullMQ Job 발행)
- Worker Job 처리 (AI 평가, 영상 Crop, mp3 변환, Azure Blob Storage 업로드)
- Prisma 기반 DB 접근
- 로깅 및 추적 (traceId, submission_log 기록)

## Non-Functional Requirements

- 모든 API 응답은 `200 OK` 와 함께 `{ result: "ok" | "failed" }` 형식으로 반환합니다.
- 실패 시에도 로그를 기록하며 Slack/Alert Webhook 으로 알림을 전송합니다.
- 모든 요청은 traceId 로 추적됩니다.

## Database Tables

- **students**: 학생 정보 (id, name, createdAt)
- **submissions**: 제출물 (id, studentId, componentType, status, resultJson, createdAt)
- **submission_logs**: 제출 처리 로그 (traceId, status, error 등)
- **submission_media**: 업로드된 미디어 (video/audio URL, mediaType 별 unique)
- **revisions**: 재평가 이력
- **stats**: 기간별 집계 정보

## Scheduler

⚠️ 현재 구현되지 않았습니다. 요구사항에 따르면:

- **Auto-Retry Job**: 실패한 제출물을 1시간 주기로 재평가해야 합니다.
- **Stats Job**: Daily/Weekly/Monthly 주기로 통계를 집계해야 합니다.

향후 BullMQ repeatable jobs를 사용하여 구현할 예정입니다.

## Testing

⚠️ 현재 테스트 코드가 충분히 작성되지 않았습니다. 요구사항에 따르면:

- **Unit Test**: 서비스 단위 로직 검증 (예: SubmissionsService, AuthService)
- **Integration Test**: Prisma + DB, BullMQ 큐 연동 검증
- **E2E Test**: 실제 API 요청을 통한 end-to-end 흐름 검증

향후 Jest 및 Testcontainers 기반으로 보강할 예정입니다.

## Available Scripts

- `npm run build` : 전체 앱 빌드
- `npm run build:api` : API 서버 빌드
- `npm run build:worker` : Worker 빌드
- `npm run start:dev api` : API 서버 개발 모드 실행
- `npm run start:dev worker` : Worker 개발 모드 실행
- `npm run test` : Jest 단위 테스트 실행
- `npm run test:e2e` : E2E 테스트 실행
- `npm run test:cov` : 커버리지 리포트 생성
- `npm run prisma:migrate` : DB 마이그레이션 실행
- `npm run seed` : 샘플 데이터 시드

## Lint & Format

- `npm run lint` : ESLint 실행
- `npm run format` : Prettier를 이용한 코드 자동 포맷팅

## Roadmap / Improvements

- Scheduler (Auto-Retry, Stats Job): 향후 BullMQ repeatable jobs로 구현 예정
- 테스트 코드: Unit/Integration/E2E를 Jest 및 Testcontainers 기반으로 보강할 예정
- OpenTelemetry 및 모니터링 연동: 추후 적용 계획
