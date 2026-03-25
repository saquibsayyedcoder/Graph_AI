<<<<<<< HEAD
# ContextGraph-AI
AI-powered context graph system that transforms relational business data into an interactive graph with natural language querying using LLMs.

Overview
In traditional systems, business data is spread across multiple tables such as orders, deliveries, invoices, and payments, making it difficult to trace relationships.

This project solves that problem by:
Converting relational data into a graph structure
Providing an interactive visualization UI
Enabling natural language queries using LLMs
Returning data-backed insights dynamically

Architecture
Frontend: React.js + Graph Visualization Library
Backend: Node.js / Express
Database: PostgreSQL / Graph DB (Neo4j optional)
LLM Integration: (e.g., Groq / Gemini / OpenRouter)
Query Engine: Natural Language → SQL / Graph Queries

Features
📊 Graph-based data modeling (Nodes & Relationships)
🖥️ Interactive graph visualization
💬 Chat-based query interface (LLM-powered)
🔍 Natural language → structured query conversion
✅ Data-backed responses (no hallucination)
🚫 Guardrails for irrelevant queries

Example Queries
Which products have the highest number of billing documents?
Trace the full lifecycle of a sales order
Identify incomplete or broken flows in transactions

Guardrails
The system strictly limits responses to dataset-related queries.

Tech Stack
React.js
Node.js
PostgreSQL / Prisma
LLM APIs (Groq)
Graph Visualization Library (React Flow)
=======
# SAP Order-to-Cash Graph Explorer

An interactive graph visualization and natural language query system built on real SAP O2C data.

Live demo: _your-deployment-url_  
GitHub: _your-github-url_

---

## What It Does

- Visualizes the full SAP Order-to-Cash flow as an interactive graph: Customers → Sales Orders → Deliveries → Billing Documents → Payments → Journal Entries
- Lets users click any node to inspect its full details and line items
- Provides a chat interface that translates natural language into SQL, executes it, and returns data-backed answers
- Restricts off-topic queries with a two-layer guardrail system

---

## Architecture

```
Frontend (React + Vite)          Backend (Express + Prisma)       Database
┌──────────────────────┐         ┌──────────────────────────┐     ┌─────────────────┐
│  React Flow Graph    │◄──────►│  GET /api/graph           │────►│  PostgreSQL      │
│  Chat Panel          │         │  POST /api/chat           │     │  14 tables       │
│  Node Inspector      │         │  GET /api/graph/node/:id  │     │  ~5,000 records  │
│  Stats Bar           │         │  GET /api/graph/stats     │     └─────────────────┘
└──────────────────────┘         └──────────────┬────────────┘
                                                │
                                                ▼
                                  ┌─────────────────────────┐
                                  │  Groq LLM (free tier)    │
                                  │  llama-3.3-70b-versatile │
                                  │  llama-3.1-8b-instant    │
                                  └─────────────────────────┘
```

### Key Design Decisions

**PostgreSQL over a graph DB (Neo4j)**  
The dataset is relational SAP data with well-defined FK relationships. PostgreSQL handles the complex JOIN queries the LLM generates more reliably than Cypher. The "graph" is a visual representation of relational data, not a native graph store. This also keeps the stack in PERN (familiar, deployable on Railway for free).

**Tiered layout for graph visualization**  
Nodes are arranged left-to-right following the O2C business flow: Customer → Sales Order → Delivery → Billing → Payment/Journal Entry. This mirrors how a business analyst would read the flow.

**Two-stage LLM pipeline with schema injection**  
Stage 1 (guardrail): A fast `llama-3.1-8b-instant` call classifies whether the query is relevant to the O2C domain. This costs minimal tokens and returns in ~100ms.  
Stage 2 (SQL generation): `llama-3.3-70b-versatile` receives the full PostgreSQL schema, table relationships, and status code definitions injected into the system prompt. This grounds the SQL generation in real schema reality.  
Stage 3 (answer synthesis): The raw SQL results are passed back to the LLM with a business analyst persona to generate plain-English answers.

**Why not embeddings/RAG?**  
The dataset is structured relational data, not documents. SQL generation with schema injection is more accurate, faster, and cheaper for this use case than semantic search. The LLM doesn't need to "find" relevant chunks — it needs to write precise JOINs.

---

## LLM Prompting Strategy

### Guardrail Prompt (fast model)
Classifies queries as RELEVANT or OFF_TOPIC before any SQL is generated. Returns structured JSON for reliable parsing. Uses the cheapest/fastest model since it's a binary classification.

### SQL Generation Prompt
- Full schema with column types injected
- FK relationships explicitly listed (e.g., `outbound_delivery_items.referenceSdDocument = sales_order_headers.salesOrder`)
- Status code legend (A/B/C meanings)
- Instruction to use LEFT JOINs for "broken flow" queries
- Strict safety: only SELECT statements allowed, validated server-side

### Answer Synthesis Prompt
- Business analyst persona
- Currency formatting in INR
- Instructions to highlight anomalies
- No mention of SQL/database internals in the output

---

## Dataset

SAP Order-to-Cash data with 19 entity types:

| Entity | Records |
|--------|---------|
| product_storage_locations | 16,723 |
| product_plants | 3,036 |
| billing_document_items | 245 |
| sales_order_items | 167 |
| billing_document_headers | 163 |
| outbound_delivery_items | 137 |
| journal_entry_items | 123 |
| payments | 120 |
| sales_order_headers | 100 |
| outbound_delivery_headers | 86 |
| billing_document_cancellations | 80 |
| products | 69 |
| plants | 44 |
| business_partners | 8 |

---

## Local Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Groq API key (free at console.groq.com)

### Steps

```bash
# 1. Clone and install
git clone <your-repo>
npm run install:all

# 2. Set up backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and GROQ_API_KEY

# 3. Place dataset
mkdir -p backend/data
cp -r /path/to/sap-o2c-data backend/data/

# 4. Push schema and seed database
npm run db:setup

# 5. Set up frontend environment
cp frontend/.env.example frontend/.env

# 6. Run both servers
npm run dev:backend   # Terminal 1 → http://localhost:4000
npm run dev:frontend  # Terminal 2 → http://localhost:3000
```

---

## Deployment

### Backend → Railway

1. Create a new Railway project
2. Add a PostgreSQL plugin
3. Connect your GitHub repo, set root directory to `backend/`
4. Add environment variables: `DATABASE_URL` (auto-filled by Railway), `GROQ_API_KEY`, `FRONTEND_URL`
5. After first deploy, run the seed: Railway console → `npm run db:seed`

### Frontend → Vercel

1. Import your GitHub repo on vercel.com
2. Set root directory to `frontend/`
3. Add environment variable: `VITE_API_URL=https://your-railway-backend.railway.app/api`
4. Deploy

---

## Example Queries the System Can Answer

- "Which products appear in the most billing documents?"
- "Trace the full flow of billing document 90504248 — from sales order to payment"
- "Show sales orders that were delivered but never billed"
- "Which customers have the highest total invoiced amount?"
- "List all cancelled billing documents and their amounts"
- "Are there any sales orders with a billing block?"
- "What is the total revenue for April 2025?"
- "Which deliveries haven't had goods movement completed?"

---

## Guardrails Demo

Off-topic queries are rejected:

> "What is the capital of France?" → "This system is designed to answer questions related to the SAP Order-to-Cash dataset only."

> "Write me a poem" → "This system is designed to answer questions related to the SAP Order-to-Cash dataset only."

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, @xyflow/react (React Flow), TypeScript |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| LLM | Groq (llama-3.3-70b-versatile + llama-3.1-8b-instant) |
| Deployment | Railway (backend + DB), Vercel (frontend) |
>>>>>>> 0f6150c (backend and frontend connectivity is done)
