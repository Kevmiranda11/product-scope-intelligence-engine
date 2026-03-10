## Setup

1. Create `.env.local` with:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
OPENAI_API_KEY=...
AZDO_ENCRYPTION_KEY=32+ character secret (or base64/hex key)
```

2. Install dependencies:

```bash
npm install
```

3. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Bootstrap the first admin user:

```bash
npm run seed:admin -- --email admin@company.com --password "TempPass!123"
```

5. Start the app:

```bash
npm run dev
```

## Features

- Email/password login with `httpOnly` session cookies and login rate limit.
- User isolation: each account sees only its own projects.
- Admin panel for user management and Azure DevOps integration setup.
- Step 5 export to Azure DevOps with Project/Epic selection.
- Re-export updates existing work items instead of duplicating them.
