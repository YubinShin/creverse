# Creverse Assignment

백엔드 과제 프로젝트입니다. NestJS 기반의 모노레포 구조로, API 서버와 Worker 프로세스를 분리하여 구현하였습니다.

## ERD

<img width="1975" height="1867" alt="creverse_erd" src="https://github.com/user-attachments/assets/3665e036-11cf-436b-9d35-4efcdaeb1155" />

## Diagram

```mermaid
flowchart TD
    student([Student(웹/앱 사용자)]) --> api[Submission Evaluation API System]

    api --> openai[Azure OpenAI]
    api --> blob[Azure Blob Storage]
    api --> alert[Slack/Alert Webhook]
```

```mermaid
flowchart LR
subgraph system[Submission Evaluation System]
api[API Server (NestJS)]
worker[Worker (NestJS)]
db[(PostgreSQL DB)]
redis[(Redis - Queue)]
openai[Azure OpenAI]
blob[Azure Blob Storage]
alert[Slack/Alert]


api --> db
api --> redis
api --> worker
worker --> openai
worker --> blob
worker --> alert
end
```

```mermaid
flowchart TD
subgraph api[API Server (NestJS)]
auth[Auth Module<br/>JWT Guard]
students[Students Module<br/>CRUD]
submissions[Submissions Module<br/>Create/List/Validation]
publisher[Publisher Module<br/>BullMQ Job]
logger[Common/Logger<br/>Trace & Logs]
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

## Testing

```bash
# Unit Test
npm run test

# E2E Test
npm run test:e2e

# Coverage
npm run test:cov
```
