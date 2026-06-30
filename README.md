# RoomBook AP — Backend

Node.js + Express API para o sistema de agendamento de salas de reunião.

## Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Conta Firebase com um projeto configurado
- (Opcional) Servidor SMTP para envio de e-mails

---

## Configuração

### 1. Instale as dependências

```bash
cd roombook-ap-backend
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` com os valores reais:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão PostgreSQL |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Caminho para o JSON de credenciais do Firebase Admin |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Alternativa: JSON em base64 |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Configuração SMTP |
| `SMTP_FROM` | Remetente dos e-mails |
| `FRONTEND_URL` | Origin do frontend para CORS (ex: `http://localhost:5173`) |
| `PORT` | Porta do servidor (padrão: `3001`) |

### 3. Obtenha o arquivo de credenciais do Firebase

No [Firebase Console](https://console.firebase.google.com):
1. Vá em **Configurações do Projeto** → **Contas de serviço**
2. Clique em **Gerar nova chave privada**
3. Salve o JSON como `firebase-service-account.json` na raiz do projeto

Ou gere a versão base64 para variável de ambiente:
```bash
base64 -i firebase-service-account.json
# Cole o resultado em FIREBASE_SERVICE_ACCOUNT_BASE64
```

### 4. Execute as migrações do banco de dados

```bash
# Aplica o schema e gera o Prisma Client
npm run db:migrate

# Alternativa rápida em desenvolvimento (sem gerar arquivo de migração)
npm run db:push
```

### 5. Popule as salas (seed)

```bash
npm run db:seed
```

Isso insere as salas: **Sala 1** (cap. 8), **Sala 2** (cap. 12), **Sala 3** (cap. 6).

---

## Executando

```bash
# Produção
npm start

# Desenvolvimento (com auto-reload)
npm run dev
```

O servidor inicia em `http://localhost:3001` e o job de lembretes é agendado automaticamente.

---

## Endpoints

Todas as rotas exigem o header:
```
Authorization: Bearer <firebase-id-token>
```

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/api/bookings` | Lista todos os agendamentos |
| `POST` | `/api/bookings` | Cria um novo agendamento |
| `DELETE` | `/api/bookings/:id` | Cancela um agendamento (somente o criador) |
| `GET` | `/health` | Health check (sem autenticação) |

### POST /api/bookings — body

```json
{
  "date": "2024-08-15",
  "startTime": "14:00",
  "endTime": "15:30",
  "environment": "room",
  "room": "Sala 1",
  "title": "Sprint Review",
  "participants": ["alice@empresa.com", "bob@empresa.com"]
}
```

Campos `room` e `meetingLink` são mutuamente exclusivos conforme `environment`.

---

## Regras de negócio

- **Conflito de sala:** checado via query no banco (`startTime < newEnd AND endTime > newStart`). Retorna **409** em caso de conflito.
- **Cancelamento:** apenas o `uid` do criador pode deletar. Retorna **403** caso contrário.
- **Participantes:** cada e-mail é armazenado uma única vez em `booking_participants`. O booking guarda um array JSON de IDs.
- **Lembretes:** job cron (`0,15,30,45 * * * *`) verifica agendamentos do dia com `startTime` entre `agora+10min` e `agora+60min` que ainda não receberam lembrete (`reminderSentAt IS NULL`). Envia e-mail e marca o campo.
- **Confirmação:** e-mail de confirmação enviado assincronamente após a criação (não bloqueia a resposta HTTP).
