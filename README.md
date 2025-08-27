# Creverse Assignment

백엔드 과제 프로젝트입니다. NestJS 기반의 모노레포 구조로, API 서버와 Worker 프로세스를 분리하여 구현하였습니다.

## 📦 Tech Stack

- **Backend Framework**: NestJS (monorepo)
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: BullMQ (Redis)
- **Storage**: Azure Blob Storage
- **AI**: Azure OpenAI Service
- **Logger**: Custom Logger + Interceptors
- **Test**: Jest (Unit & E2E)

## 🏗️ Architecture

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

## 🚀 Getting Started

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

## ✅ Features

- 학생 등록 / 조회 API
- 과제 제출 API (파일 업로드 → Blob 저장 → BullMQ Job 발행)
- Worker Job 처리 (AI 평가, 영상 Crop, 썸네일 추출, mp3 변환)
- Prisma 기반 DB 접근
- 로깅 및 추적 (traceId, submission_log 기록)

## 🧪 Testing

```bash
# Unit Test
npm run test

# E2E Test
npm run test:e2e

# Coverage
npm run test:cov
```
