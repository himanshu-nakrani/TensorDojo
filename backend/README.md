# Backend Service

FastAPI-based backend service for AI Learning Lab, deployed on Fly.io or Railway.

## 🏗️ Architecture

```
backend/
├── api/                       # API route handlers
│   ├── __init__.py
│   ├── v1/                   # Versioned API endpoints
│   │   ├── __init__.py
│   │   ├── auth.py           # Clerk authentication middleware
│   │   ├── progress.py       # Lesson progress tracking
│   │   ├── attempts.py       # Quiz/attempt recording
│   │   ├── diagnosis.py      # Misconception diagnosis (Tier 1 & 2)
│   │   ├── tutor.py          # AI tutor SSE streaming
│   │   ├── notebooks.py       # Notebook serving and persistence
│   │   ├── execute.py        # Hosted execution (Modal integration)
│   │   └── billing.py        # Stripe webhooks and plan management
│   └── health.py             # Health check endpoints
├── core/                     # Core application configuration
│   ├── __init__.py
│   ├── config.py             # Settings and environment variables
│   ├── database.py           # Postgres connection and session management
│   ├── security.py           # JWT verification and auth utilities
│   └── middleware.py         # Request middleware (rate limiting, etc.)
├── models/                   # Database models and schemas
│   ├── __init__.py
│   ├── user.py               # User model and related schemas
│   ├── concept.py            # Concept graph models
│   ├── lesson.py             # Lesson registry models
│   ├── attempt.py            # Attempt and misconception models
│   ├── tutor.py              # Tutor session models
│   └── execution.py          # Hosted execution models
├── services/                 # Business logic services
│   ├── __init__.py
│   ├── sync_engine/          # Sync engine server-side utilities
│   ├── diagnosis/            # Diagnosis engine (Tier 1 rules + Tier 2 LLM)
│   │   ├── rules.py          # Rule-based diagnosis (Tier 1)
│   │   └── llm_classifier.py # LLM-based classification (Tier 2)
│   ├── tutor/                # Hermes orchestrator integration
│   │   ├── context.py        # Context assembly for tutor prompts
│   │   ├── routing.py        # Model routing and fallback logic
│   │   └── guardrails.py      # Guardrail enforcement
│   ├── execution/            # Modal execution service
│   └── analytics.py          # PostHog event tracking
├── schemas/                   # Pydantic schemas for request/response validation
│   ├── __init__.py
│   └── *.py
├── utils/                     # Utility functions
│   ├── __init__.py
│   ├── logging.py            # Structured logging configuration
│   ├── cache.py              # Caching utilities (Redis deferred)
│   └── storage.py            # R2/Cloudflare storage utilities
├── migrations/                # Alembic database migrations
│   └── versions/
├── tests/                     # Backend tests
│   ├── __init__.py
│   ├── conftest.py           # Pytest fixtures
│   ├── test_*.py
│   └── integration/
├── main.py                    # FastAPI application entry point
├── worker.py                  # Optional: Background worker (future)
├── requirements.txt           # Python dependencies
├── requirements-dev.txt       # Development dependencies
└── Dockerfile
```

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Poetry (recommended) or pip
- Postgres database (Neon or Supabase recommended)
- Clerk account (for authentication)
- Stripe account (for billing)
- Modal account (for hosted execution, optional for MVP)

### Installation

```bash
# Navigate to backend directory
cd backend

# Install dependencies with pip
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Or with Poetry (recommended)
poetry install
poetry shell

# Install pre-commit hooks
pre-commit install
```

### Environment Setup

Copy the example environment file and configure:

```bash
cp .env.example .env
# Edit .env with your configuration
```

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Clerk Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret

# Stripe Billing
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_PRO=your_pro_price_id
STRIPE_PRICE_ID_TEAM=your_team_price_id

# LLM Providers
MIMO_API_KEY=your_mimo_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
OPENAI_API_KEY=your_openai_api_key

# Modal (for hosted execution)
MODAL_TOKEN_ID=your_modal_token_id
MODAL_TOKEN_SECRET=your_modal_token_secret

# Cloudflare R2
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=notebooks

# Observability
SENTRY_DSN=your_sentry_dsn
POSTHOG_API_KEY=your_posthog_api_key
```

### Database Setup

```bash
# Run migrations
alembic upgrade head

# Seed the database with initial content
python scripts/seed_database.py
```

### Running Locally

```bash
# Development server with hot reload
uvicorn main:app --reload --port 8000

# Or with Poetry
poetry run uvicorn main:app --reload --port 8000

# Production server (use gunicorn in production)
gunicorn -k uvicorn.workers.UvicornWorker -w 4 -b 0.0.0.0:8000 main:app
```

The API will be available at `http://localhost:8000`

### Health Check

```bash
curl http://localhost:8000/health
# Expected response: {"status": "healthy"}
```

## 📡 API Documentation

API documentation is automatically generated using FastAPI's built-in Swagger UI:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI Schema:** `http://localhost:8000/openapi.json`

### Endpoints Overview

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Health** | `/health` | GET | Health check |
| **Auth** | `/api/v1/me` | GET | Get current user profile |
| **Graph** | `/api/v1/graph` | GET | Get concept graph + user mastery |
| **Progress** | `/api/v1/lessons/{id}/progress` | POST | Update lesson progress |
| **Progress** | `/api/v1/lessons/{id}/progress` | GET | Get lesson progress |
| **Attempts** | `/api/v1/attempts` | POST | Record attempt (quiz/checkpoint) |
| **Diagnosis** | `/api/v1/diagnose` | POST | Tier-2 LLM diagnosis (Pro) |
| **Misconceptions** | `/api/v1/misconceptions/{id}/resolve` | POST | Mark misconception as resolved |
| **Tutor** | `/api/v1/tutor/message` | POST | Send message to AI tutor (SSE) |
| **Tutor** | `/api/v1/tutor/sessions/{lesson_id}` | GET | Get tutor sessions for lesson |
| **Notebooks** | `/api/v1/notebooks/{lesson_id}` | GET | Get canonical notebook |
| **Notebooks** | `/api/v1/notebooks/{lesson_id}/mine` | PUT | Save user notebook (Pro) |
| **Notebooks** | `/api/v1/notebooks/{lesson_id}/mine` | GET | Get user notebook (Pro) |
| **Execute** | `/api/v1/execute` | POST | Submit hosted execution run (Pro) |
| **Execute** | `/api/v1/execute/{run_id}/stream` | WS | Stream execution output (Pro) |
| **Quota** | `/api/v1/me/quota` | GET | Get GPU minutes remaining (Pro) |
| **Billing** | `/api/v1/billing/checkout` | POST | Create Stripe checkout session |
| **Billing** | `/api/v1/billing/portal` | POST | Create Stripe customer portal session |
| **Webhooks** | `/api/v1/webhooks/stripe` | POST | Stripe webhook handler |
| **Webhooks** | `/api/v1/webhooks/clerk` | POST | Clerk webhook handler |

### Authentication

All endpoints except health checks and content reads require authentication via Clerk JWT.

Include the authorization header:
```bash
Authorization: Bearer <clerk_jwt_token>
```

The backend verifies the JWT using the Clerk secret key.

## 🔧 Key Components

### Hermes Orchestrator

The in-process AI orchestration library that:
- Assembles context from multiple sources (lesson, notebook state, learner history)
- Routes between LLM providers (MiMo default, Anthropic/OpenAI fallback)
- Enforces guardrails and cost controls
- Formats responses with action chips

**Context Assembly (per tutor message):**

| Context Block | Source | Token Budget |
|---------------|--------|---------------|
| Lesson summary + current section | Pre-computed at build time | ~800 tokens |
| Notebook state | Client-supplied | ~1,500 tokens |
| Simulation state | Client-supplied | ~100 tokens |
| Open misconceptions | Database query | ~200 tokens |
| Conversation history | Session transcript | ~2,000 tokens |

### Diagnosis Engine

**Tier 1 (Rule-based, Free):**
- Quiz: distractor → misconception tag lookup
- Predictions: rule-based mapping from prediction vs actual
- Code: pattern matching on common errors

**Tier 2 (LLM-based, Pro):**
- Classifies learner code against lesson's misconception catalog
- Forced to choose from catalog or 'unknown'
- Structured output: `{misconception_id, confidence, evidence}`

### Execution Service (Modal Integration)

Hosted execution for GPU-intensive lessons:

```python
# Example Modal function
@modal.web_endpoint(method="POST")
def execute_notebook(request: ExecuteRequest):
    # Validate quota
    # Run in isolated container
    # Return outputs and artifacts
    pass
```

**Security Controls:**
- Network egress disabled
- Hard timeouts (default 120s, max 10min)
- Output size caps (≤10MB)
- Per-user quotas (GPU-minutes/month)
- Pinned images with only lesson dependencies

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=backend --cov-report=html

# Run specific test file
pytest tests/test_attempts.py

# Run integration tests
pytest tests/integration/
```

### Test Structure

```
tests/
├── conftest.py               # Fixtures (test database, clients)
├── test_health.py             # Health check tests
├── test_auth.py               # Authentication tests
├── test_progress.py           # Progress tracking tests
├── test_attempts.py           # Attempt recording tests
├── test_diagnosis_rules.py    # Tier-1 diagnosis rule tests
├── test_tutor.py              # Tutor context assembly tests
├── test_notebooks.py          # Notebook serving tests
└── integration/
    ├── test_api_flow.py       # End-to-end API flow tests
    └── test_webhooks.py        # Webhook handler tests
```

### Test Database

Tests use a separate test database configured via `TEST_DATABASE_URL`.

```bash
# Create test database
createdb ail_test

# Run migrations on test database
DATABASE_URL=postgresql://user:password@localhost:5432/ail_test alembic upgrade head

# Run tests
DATABASE_URL=postgresql://user:password@localhost:5432/ail_test pytest
```

## 📦 Deployment

### Docker

Build the Docker image:

```bash
docker build -t ail-backend:latest .

# Run locally with Docker
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e CLERK_SECRET_KEY=... \
  ail-backend:latest
```

### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy to Fly.io
flyctl launch
flyctl deploy

# Set secrets
flyctl secrets set \
  DATABASE_URL=... \
  CLERK_SECRET_KEY=... \
  STRIPE_SECRET_KEY=...

# Scale
flyctl scale count 2
flyctl scale memory 1024
```

### Railway

```bash
# Deploy to Railway
railway init
railway add
railway up

# Set environment variables via Railway dashboard
```

## 📊 Observability

### Structured Logging

All logs are JSON-formatted for easy parsing:

```json
{
  "timestamp": "2026-06-13T10:00:00Z",
  "level": "INFO",
  "logger": "backend.api.tutor",
  "message": "Tutor message processed",
  "user_id": "user_123",
  "lesson_id": "attention-002",
  "token_usage": 1500,
  "duration_ms": 234
}
```

### Sentry

Error tracking with Sentry for both frontend and backend:
- Automatically captures exceptions
- Tags by user, lesson, endpoint
- Includes breadcrumbs for context

### PostHog

Product analytics events:
- `sync_interaction` — Sync engine usage
- `prediction_made` — Prediction submitted
- `diagnosis_shown` — Diagnosis displayed
- `diagnosis_experiment_taken` — Experiment link clicked
- `misconception_resolved` — Misconception marked resolved
- `tutor_chip_clicked` — Action chip used

**Key Funnel:**
```
diagnosis_shown → experiment_taken → re-test passed
```

This is the single most important product metric — it measures whether the moat (diagnosis → experiment → learning) works.

## 🔐 Security

### Rate Limiting

Per-user token bucket rate limiting on all write endpoints:

| Endpoint | Limit |
|----------|-------|
| `/attempts` | 60/min |
| `/tutor/message` | 10/min |
| `/notebooks/*/mine` | 12/min |

Per-IP limits on unauthenticated routes.

### Security Headers

- CSP headers to restrict origins
- CORS configured for frontend domains only
- Secure cookies (HttpOnly, Secure, SameSite)

### Sandboxing

**Pyodide Execution:**
- Worker runs in isolated thread
- API tokens never exposed to worker
- No notebook sharing at MVP
- When sharing ships: read-only mode with explicit trust gate

**Hosted Execution (Modal):**
- Container isolation
- Network egress disabled
- Hard timeouts
- Output size caps
- Per-user quotas
- No credentials in runtime

## 📝 API Contracts

### Request/Response Schemas

All endpoints use Pydantic schemas for validation and OpenAPI documentation.

**Example: Record Attempt**

```python
class AttemptCreate(BaseModel):
    lesson_id: str
    kind: Literal["quiz", "prediction", "checkpoint"]
    item_id: str  # question id / checkpoint id
    payload: dict  # answer given, prediction made, code hash
    correct: bool | None = None

class AttemptResponse(BaseModel):
    id: UUID
    user_id: str
    lesson_id: str
    kind: str
    item_id: str
    payload: dict
    correct: bool | None
    diagnosis: dict | None  # Tier-1 diagnosis if triggered
    created_at: datetime
```

### Error Responses

Standard error format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid lesson_id format",
    "details": {
      "field": "lesson_id",
      "issue": "must match pattern ^[a-z0-9-]+$"
    }
  }
}
```

Common error codes:
- `VALIDATION_ERROR` — Request validation failed
- `AUTHENTICATION_ERROR` — Invalid or missing auth token
- `PERMISSION_ERROR` — User doesn't have required permission
- `NOT_FOUND` — Resource doesn't exist
- `RATE_LIMITED` — Rate limit exceeded
- `QUOTA_EXCEEDED` — User quota exceeded (Pro features)
- `SERVER_ERROR` — Internal server error

## 🚀 Performance Considerations

### Caching

- Lesson summaries pre-computed at build time
- Prompt caching for tutor context blocks
- Redis deferred until queue exists (Month 4+)

### Database Optimization

- Indexes on frequently queried columns (user_id, lesson_id)
- JSONB for flexible schemas (attempts.payload)
- Connection pooling configured
- Read replicas for analytics queries (future)

### Cost Controls

**The Rule:** Every marginal-cost feature is Pro-gated and per-user quota-capped.

| Feature | Cost Driver | Control |
|---------|-------------|---------|
| LLM calls | Token usage | Per-user daily budget (150k tokens/day) |
| Hosted execution | GPU-minutes | Per-user monthly quota (50 GPU-minutes/month) |
| Storage | R2 usage | Per-user notebook limits |

This ensures costs can only scale with revenue.

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| v0.1.0 | 2026-06-13 | Initial specification |

---

## 📚 Related Documentation

- [Design Spec](../design-spec.md) — Product requirements and UX
- [Technical Spec](../technical-spec.md) — Full architecture overview
- [Content Directory](../content/README.md) — Lesson content structure
