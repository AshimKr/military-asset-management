# Military Asset Management System — Starter Framework

A starter full-stack inventory/logistics application built with **React (JavaScript)**, **Node.js + Express**, and **PostgreSQL**.

> Scope: asset accountability, purchases, inter-base transfers, assignments, expenditures, dashboard balances, RBAC, and audit history. It intentionally does not implement tactical planning or deployment optimization.

## Architecture

```text
React/Vite SPA
    |
    | HTTPS + Bearer JWT
    v
Node.js / Express REST API
    |-- authentication middleware
    |-- RBAC + base-scope checks
    |-- business transaction services
    |-- audit logging
    v
PostgreSQL
    |-- source-of-truth business tables
    |-- immutable inventory_ledger
    |-- audit_logs
```

### Why PostgreSQL?

The domain is highly relational: users belong to bases, equipment types are referenced by purchases/transfers/assignments, and transfers must update two bases atomically. PostgreSQL provides foreign keys, checks, transactions, indexes, and strong consistency, which fit these requirements well.

## Balance model

Every stock-changing event creates a signed row in `inventory_ledger`:

- `OPENING_BALANCE`: positive
- `PURCHASE`: positive
- `TRANSFER_IN`: positive
- `TRANSFER_OUT`: negative
- `ASSIGNMENT`: negative from available stock
- `EXPENDITURE`: negative
- `RETURN`: positive (schema supports it for a future return workflow)

For a selected period:

```text
Opening Balance = sum(all ledger deltas before start date)
Net Movement    = Purchases + Transfer In - Transfer Out
Assigned        = quantity assigned during period
Expended        = quantity expended during period
Closing Balance = Opening Balance + Net Movement - Assigned - Expended (+ Returns, if added)
```

The dashboard calculates values from the ledger instead of storing editable totals.

## RBAC

| Capability | Admin | Base Commander | Logistics Officer |
|---|---:|---:|---:|
| View all bases | Yes | No | No |
| View assigned base | Yes | Yes | Yes (purchase/transfer pages only) |
| Dashboard | Yes | Yes | No |
| Create purchases | Yes | Yes, own base | Yes, own base |
| Create transfers | Yes | Yes, from own base | Yes, from own base |
| Assign assets | Yes | Yes, own base | No |
| Record expenditures | Yes | Yes, own base | No |
| Initialize opening balance | Yes | No | No |
| View audit log | Yes | No | No |

## Project structure

```text
military-asset-management/
├─ docker-compose.yml
├─ backend/
│  ├─ package.json
│  ├─ .env.example
│  ├─ db/
│  │  └─ 001_init.sql
│  └─ src/
│     ├─ app.js
│     ├─ server.js
│     ├─ config/db.js
│     ├─ middleware/
│     ├─ routes/
│     ├─ services/
│     ├─ utils/
│     └─ scripts/seed.js
└─ frontend/
   ├─ package.json
   ├─ vite.config.js
   └─ src/
      ├─ api/client.js
      ├─ auth/AuthContext.jsx
      ├─ components/
      ├─ pages/
      ├─ App.jsx
      ├─ main.jsx
      └─ styles.css
```

## Run locally

### 1. Start PostgreSQL

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:init
npm run seed
npm run dev
```

API: `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173`

### Demo users

The seed script creates local development users. Change these credentials immediately outside local development.

| Role | Email | Password |
|---|---|---|
| Admin | admin@gmail.com | admin@123456 |
| Base Commander | commander.alpha@example.com | Commander@12345 |
| Logistics Officer | logistics.alpha@example.com | Logistics@12345 |

## REST endpoints

### Authentication

- `POST /api/auth/login`
- `GET /api/auth/me`

### Metadata

- `GET /api/meta/bases`
- `GET /api/meta/equipment-types`
- `GET /api/meta/transfer-bases` — destination lookup only; does not expose inventory data

### Dashboard

- `GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&baseId=&equipmentTypeId=`
- `GET /api/dashboard/movements?...` — purchase / transfer-in / transfer-out details for the Net Movement modal

### Purchases

- `GET /api/purchases?...`
- `POST /api/purchases`

### Transfers

- `GET /api/transfers?...`
- `POST /api/transfers`

### Assignments & expenditures

- `GET /api/assignments?...`
- `POST /api/assignments`
- `GET /api/expenditures?...`
- `POST /api/expenditures`

### Inventory administration

- `POST /api/inventory/opening-balance` — Admin only

### Audit

- `GET /api/audit` — Admin only

## Security notes before production

This starter demonstrates application-layer RBAC and base scoping. Before production deployment:

- Put the API behind TLS and a trusted reverse proxy/WAF.
- Replace demo login with an enterprise identity provider (OIDC/SAML) and short-lived access tokens.
- Store secrets in a secret manager, never in source control.
- Add MFA, account lockout/SSO controls, device/session policies, and token revocation as required.
- Apply PostgreSQL least-privilege accounts and consider row-level security as defense in depth.
- Add request-schema validation throughout, CSRF protection if cookies replace bearer tokens, and stricter CORS rules.
- Send audit logs to append-only/centralized logging with retention and monitoring controls.
- Encrypt database volumes/backups and define backup/restore and disaster-recovery procedures.
- Use immutable identifiers for personnel rather than unnecessary personal information.
- Add approval workflows if policy requires dual authorization for sensitive transactions.

## Render deployment (demo / evaluation)

This repository includes a `render.yaml` Blueprint that provisions:

- `military-assets-web`: React/Vite static site
- `military-assets-api`: Node/Express web service
- `military-assets-db`: Render PostgreSQL database

