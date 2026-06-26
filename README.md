# @signdocs-brasil/api

SDK oficial em TypeScript/Node.js para a API SignDocsBrasil.

## Requisitos

- Node.js 18+
- Zero dependências em runtime (usa `fetch` nativo)

## Instalação

```bash
npm install @signdocs-brasil/api
```

## Início Rápido

```typescript
import { SignDocsBrasilClient } from '@signdocs-brasil/api';

const client = new SignDocsBrasilClient({
  clientId: 'seu_client_id',
  clientSecret: 'seu_client_secret',
});

// Criar uma transação com documento
const tx = await client.transactions.create({
  purpose: 'DOCUMENT_SIGNATURE',
  policy: { profile: 'CLICK_ONLY' },
  signer: {
    name: 'João Silva',
    email: 'joao@example.com',
    userExternalId: 'user-001',
  },
  document: {
    content: pdfBase64,
    filename: 'contrato.pdf',
  },
});

console.log(tx.transactionId, tx.status);
```

### Private Key JWT (ES256)

```typescript
const client = new SignDocsBrasilClient({
  clientId: 'seu_client_id',
  privateKey: readFileSync('./private-key.pem', 'utf-8'),
  kid: 'seu-key-id',
});
```

## Recursos Disponíveis

| Recurso | Métodos |
|---------|---------|
| `client.transactions` | `create`, `list`, `get`, `cancel`, `finalize`, `listAutoPaginate` |
| `client.documents` | `upload`, `presign`, `confirm`, `download` |
| `client.steps` | `list`, `start`, `complete` |
| `client.signing` | `prepare`, `complete` |
| `client.evidence` | `get` |
| `client.verification` | `verify`, `downloads` |
| `client.users` | `enroll` |
| `client.webhooks` | `register`, `list`, `delete`, `test` |
| `client.signingSessions` | `create`, `getStatus`, `cancel`, `list`, `waitForCompletion` |
| `client.envelopes` | `create`, `get`, `addSession`, `combinedStamp` |
| `client.documentGroups` | `combinedStamp` |
| `client.health` | `check`, `history` |

## Assinatura Expressa (Sessões de Assinatura)

```typescript
const session = await client.signingSessions.create({
  purpose: 'DOCUMENT_SIGNATURE',
  policy: { profile: 'BIOMETRIC' },
  signer: {
    name: 'João Silva',
    email: 'joao@example.com',
    userExternalId: 'user-001',
  },
  document: { content: pdfBase64, filename: 'contrato.pdf' },
  returnUrl: 'https://meusite.com.br/assinado',
});

console.log(session.url); // URL da página de assinatura hospedada
```

## Envelopes (Múltiplos Signatários)

```typescript
const envelope = await client.envelopes.create({
  signingMode: 'PARALLEL',
  totalSigners: 2,
  document: { content: pdfBase64, filename: 'contrato.pdf' },
});

const session1 = await client.envelopes.addSession(envelope.envelopeId, {
  signer: { name: 'João Silva', email: 'joao@example.com', userExternalId: 'user-001' },
  policy: { profile: 'CLICK_ONLY' },
  signerIndex: 1,
});

const session2 = await client.envelopes.addSession(envelope.envelopeId, {
  signer: { name: 'Maria Santos', email: 'maria@example.com', userExternalId: 'user-002' },
  policy: { profile: 'CLICK_ONLY' },
  signerIndex: 2,
});

console.log(session1.url, session2.url);
```

## Configuração Avançada

### HTTP Client customizado

Injete uma implementação de `fetch` personalizada (ex: para proxying, métricas ou testes):

```typescript
import { SignDocsBrasilClient } from '@signdocs-brasil/api';

const client = new SignDocsBrasilClient({
  clientId: 'seu_client_id',
  clientSecret: 'seu_client_secret',
  httpClient: customFetch,
});
```

### Logging

O SDK aceita um logger com interface `{ debug, info, warn, error }`. São logados apenas: método HTTP, path, status code e duração. Headers de autorização, corpos de request/response e tokens nunca são logados.

```typescript
import { SignDocsBrasilClient, Logger } from '@signdocs-brasil/api';

const logger: Logger = {
  debug: (msg, ...args) => console.debug(msg, ...args),
  info:  (msg, ...args) => console.info(msg, ...args),
  warn:  (msg, ...args) => console.warn(msg, ...args),
  error: (msg, ...args) => console.error(msg, ...args),
};

const client = new SignDocsBrasilClient({
  clientId: 'seu_client_id',
  clientSecret: 'seu_client_secret',
  logger,
});
```

### Timeout por requisição

Todas as operações aceitam `options.timeout` (em milissegundos), que sobrescreve o timeout padrão do client:

```typescript
const tx = await client.transactions.get('tx_123', { timeout: 5000 });
```

## Documentação

Para guias completos de integração com exemplos passo-a-passo de todos os fluxos de assinatura, veja a [documentação completa da API](https://docs.signdocs.com.br).
