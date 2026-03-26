# 🏗️ Architecture Overview

## System Design

Frontend (React + Vite)
        ↓
Backend API (Node.js + Express)
        ↓
Database (PostgreSQL via Prisma)
        ↓
LLM Layer (Groq)

---

## 🔗 Data Flow

1. User interacts with UI
2. Frontend calls backend APIs
3. Backend:
   - Fetches graph data via Prisma
   - Sends to frontend
4. Chat:
   - User query → LLM
   - LLM generates SQL
   - SQL executed → DB
   - Result returned as answer

---

## 📊 Graph Modeling

Nodes:
- Business Partner
- Sales Order
- Delivery
- Billing Document
- Payment

Edges:
- places
- fulfilled by
- billed
- clears

---

## ⚙️ Key Decisions

### Why Graph?
- Better visualization of relationships vs tables

### Why Prisma?
- Type safety
- Fast iteration

### Why LLM?
- Dynamic querying without writing APIs