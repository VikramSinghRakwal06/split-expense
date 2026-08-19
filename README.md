# Split Expense

A Splitwise-style expense-sharing platform built as a Java microservices system with a Next.js frontend. Groups of users track shared expenses, split them by exact amount or percentage, and settle up — with balances, notifications, and cross-service events all kept consistent through async messaging.

This repository is the orchestration root: Docker Compose, database bootstrap, and environment templates for the full stack. Each backend service lives in its own repository and is pulled in here as a build context.

## Architecture

```
                        ┌──────────────┐
                        │   frontend   │  Next.js 16 / React 19
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │ api-gateway  │  Spring Cloud Gateway (WebFlux)
                        │ JWT auth ·   │  — single public entry point
                        │ rate limit   │
                        └──────┬───────┘
              ┌────────────────┼────────────────┬─────────────────┐
              │                │                 │                 │
       ┌──────▼─────┐   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼───────────┐
       │auth-service│   │group-service│   │expense-svc  │   │notification-svc  │
       │  JWT issue │   │groups ·     │   │expenses ·   │   │notifications     │
       │  & users   │   │balances     │   │settlements  │   │(Kafka consumer)  │
       └──────┬─────┘   └──────┬──────┘   └──────┬──────┘   └──────┬───────────┘
              │                │                 │                 │
              └────────────────┴────────┬────────┴─────────────────┘
                                         │
                          ┌──────────────┼──────────────┐
                          │              │              │
                    ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
                    │ PostgreSQL│  │   Redis   │  │   Kafka   │
                    │ (1 DB per │  │  (cache)  │  │ (events)  │
                    │  service) │  │           │  │           │
                    └───────────┘  └───────────┘  └───────────┘
```

- **api-gateway** — the only publicly exposed port. Validates JWTs, rate-limits requests, and routes to the internal services.
- **auth-service** — user registration/login, JWT issuance and refresh.
- **group-service** — groups, membership, and per-pair balances, with Redis caching for balance reads.
- **expense-service** — expense creation, splitting (exact/percentage), and settlements; calls group-service to apply balance deltas and publishes domain events to Kafka.
- **notification-service** — consumes expense/settlement events from Kafka and generates in-app notifications.
- **frontend** — Next.js app that talks to the API gateway.

Each service owns its own PostgreSQL database (`init-db.sql`) — no service reads another's tables directly; all cross-service reads go through HTTP, and cross-service side effects go through Kafka events.

## Tech stack

| Layer | Technology |
|---|---|
| Backend services | Java 21, Spring Boot 4.1, Spring Security, Spring Data JPA |
| Gateway | Spring Cloud Gateway (WebFlux), Redis-backed rate limiting |
| Auth | Stateless JWT (jjwt), refresh tokens |
| Messaging | Apache Kafka |
| Cache | Redis |
| Database | PostgreSQL 16, Flyway migrations |
| API docs | springdoc-openapi (Swagger UI) per service |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, react-hook-form + zod |
| Infra | Docker Compose |

## Repository layout

```
split-expense/
├── docker-compose.yml   # full stack: postgres, redis, kafka, all services
├── init-db.sql          # creates one database per service
├── .env.example         # JWT_SECRET / DB_PASSWORD template
├── frontend/             # Next.js app
├── api-gateway/          # gitignored — separate repo, cloned alongside
├── auth-service/         # gitignored — separate repo
├── group-service/        # gitignored — separate repo
├── expense-service/      # gitignored — separate repo
└── notification-service/ # gitignored — separate repo
```

## Running locally

Clone each backend service repository into the corresponding directory alongside this one, then:

```bash
cp .env.example .env
# set JWT_SECRET and DB_PASSWORD in .env

docker compose up --build
```

The API gateway comes up on `http://localhost:8090` (override with `GATEWAY_PORT`). All other services are internal-only, reachable through the gateway.

## Service repositories

- [api-gateway](https://github.com/VikramSinghRakwal06/api-gateway)
- [auth-service](https://github.com/VikramSinghRakwal06/split-expense-AuthService)
- [group-service](https://github.com/VikramSinghRakwal06/split-expense-GroupService)
- [expense-service](https://github.com/VikramSinghRakwal06/payment-service)
- [notification-service](https://github.com/VikramSinghRakwal06/notification-service)
