# Dermaself - Production-Ready Skincare Advisor

Applicazione web scalabile per l'analisi di selfie con AI, ottimizzata per Azure con supporto per centinaia di utenti concorrenti.

## 🚀 Funzionalità Enterprise

### Sicurezza

- ✅ **Azure Key Vault** per gestione sicura dei segreti
- ✅ **Managed Identity** per autenticazione senza chiavi
- ✅ **Validazione robusta** degli input con Joi
- ✅ **CORS configurabile** per ambienti multi-dominio
- ✅ **SAS token** con permessi granulari e scadenza

### Scalabilità  

- ✅ **Rate Limiting** con Redis (50 req/ora per utente)
- ✅ **Caching distribuito** per ridurre carico API
- ✅ **Circuit Breaker** per gestire fallimenti esterni
- ✅ **Queue asincrona** con Azure Service Bus
- ✅ **Retry automatico** con backoff esponenziale

### Monitoring

- ✅ **Application Insights** integrato
- ✅ **Logging strutturato** con metriche custom
- ✅ **Health checks** per tutti i servizi
- ✅ **Distributed tracing** per debug
- ✅ **Performance metrics** in real-time

## 📁 Architettura

```
├── api/                     # Azure Functions v4
│   ├── upload-url/         # Genera SAS per upload
│   ├── infer/              # Inferenza con Roboflow
│   ├── health/             # Health check endpoint
│   └── shared/             # Moduli condivisi
│       ├── config.js       # Configurazione centralizzata
│       ├── logger.js       # Logging strutturato
│       ├── rateLimit.js    # Rate limiting
│       └── cache.js        # Cache e circuit breaker
├── frontend/               # Static Web App
│   ├── index.html         
│   ├── main.js            # Con retry logic e error handling
│   └── style.css          # UI responsiva con stati
└── host.json              # Configurazione Functions ottimizzata
```

## 🔧 Setup Locale

### Prerequisiti

- Node.js 20+
- Azure Functions Core Tools v4
- Redis (o Azure Cache for Redis)
- Azurite per storage emulator

### Configurazione

1. **Crea il file delle impostazioni locali:**
   Crea un file `api/local.settings.json` con le tue credenziali:

```json
{
  "Values": {
    "AZURE_STORAGE_ACCOUNT": "your-account",
    "AZURE_STORAGE_KEY": "your-key",
    "ROBOFLOW_API_KEY": "your-key",
    "REDIS_CONNECTION_STRING": "localhost:6379",
    "APPLICATION_INSIGHTS_CONNECTION_STRING": "your-connection"
  }
}
```

2. **Installa dipendenze:**

```bash
npm install
cd frontend && npm install
```

3. **Avvia i servizi:**

```bash
# Terminal 1 - Redis
redis-server

# Terminal 2 - Storage Emulator
azurite

# Terminal 3 - Functions (dalla root o dalla cartella api)
npm start
# oppure: cd api && func start

# Terminal 4 - Frontend
cd frontend && npm run dev
```

## 🚀 Deployment su Azure

### 1. Crea Infrastruttura

```bash
# Resource Group
az group create -n dermaself-prod-rg -l westeurope

# Storage Account
az storage account create \
  -n dermaselfprod \
  -g dermaself-prod-rg \
  -l westeurope \
  --sku Standard_LRS \
  --allow-blob-public-access false

# Key Vault
az keyvault create \
  -n dermaself-kv \
  -g dermaself-prod-rg \
  -l westeurope

# Redis Cache
az redis create \
  -n dermaself-redis \
  -g dermaself-prod-rg \
  -l westeurope \
  --sku Basic \
  --vm-size C0

# Service Bus (opzionale)
az servicebus namespace create \
  -n dermaself-sb \
  -g dermaself-prod-rg \
  -l westeurope \
  --sku Basic

# Application Insights
az monitor app-insights component create \
  -a dermaself-insights \
  -g dermaself-prod-rg \
  -l westeurope
```

### 2. Configura Key Vault

```bash
# Aggiungi segreti
az keyvault secret set --vault-name dermaself-kv \
  --name StorageKey --value "<storage-key>"
  
az keyvault secret set --vault-name dermaself-kv \
  --name RoboflowApiKey --value "<roboflow-key>"
  
az keyvault secret set --vault-name dermaself-kv \
  --name RedisConnection --value "<redis-connection>"
```

### 3. Deploy Function App

```bash
# Crea Function App con Managed Identity
az functionapp create \
  -n dermaself-api \
  -g dermaself-prod-rg \
  --consumption-plan-location westeurope \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --assign-identity

# Configura accesso a Key Vault
az keyvault set-policy \
  -n dermaself-kv \
  --object-id <managed-identity-id> \
  --secret-permissions get list
```

### 4. Configurazione App Settings

```bash
# Variabili d'ambiente
az functionapp config appsettings set \
  -n dermaself-api \
  -g dermaself-prod-rg \
  --settings \
    AZURE_KEYVAULT_URI=https://dermaself-kv.vault.azure.net/ \
    AZURE_STORAGE_ACCOUNT=dermaselfprod \
    CORS_ORIGINS=https://yourdomain.com \
    ENABLE_AUTH=true \
    RATE_LIMIT_PER_HOUR=100
```

### 5. Deploy Static Web App

```bash
# Collega repo GitHub
az staticwebapp create \
  -n dermaself-web \
  -g dermaself-prod-rg \
  -s https://github.com/youruser/dermaself \
  -b main \
  --app-location "/frontend" \
  --api-location "/api"
```

## 📊 Monitoring

### Dashboard Application Insights

1. **Metriche chiave:**
   - Request rate e latenza
   - Tasso di errore
   - Dipendenze esterne (Roboflow)
   - Custom metrics (cache hit rate, rate limit)

2. **Alert configurabili:**
   - Error rate > 5%
   - Latenza P95 > 2s
   - Circuit breaker aperto
   - Redis non disponibile

### Health Check

```bash
curl https://dermaself-api.azurewebsites.net/api/health
```

Risposta:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "storage": { "status": "healthy", "latency": 23 },
    "redis": { "status": "healthy", "latency": 2 },
    "roboflow": { "status": "healthy" },
    "memory": { "status": "healthy", "percentage": 45 }
  }
}
```

## 🔒 Sicurezza Best Practices

1. **Network Security:**
   - Private endpoints per Storage e Redis
   - IP whitelisting per Function App
   - WAF su Static Web App

2. **Identity & Access:**
   - Managed Identity per tutte le risorse
   - RBAC minimo privilegio
   - Rotation automatica chiavi

3. **Data Protection:**
   - Encryption at rest e in transit
   - Blob soft delete abilitato
   - Backup automatici Redis

## 📈 Performance Tuning

1. **Function App:**
   - Premium plan per cold start ridotto
   - Always On per funzioni critiche
   - Pre-warmed instances

2. **Redis Cache:**
   - Eviction policy: volatile-lru
   - Persistence disabilitata per performance
   - Clustering per alta disponibilità

3. **Storage:**
   - Hot tier per blob recenti
   - Cool tier dopo 30 giorni
   - Lifecycle management automatico

## 🛠️ Troubleshooting

### Rate Limit Raggiunto

- Aumenta `RATE_LIMIT_PER_HOUR`
- Implementa autenticazione per limiti più alti
- Usa cache più aggressiva

### Circuit Breaker Aperto

- Controlla stato Roboflow API
- Verifica quota API disponibile
- Aumenta timeout se necessario

### Performance Degradata

- Scala Redis a tier superiore
- Abilita autoscaling Function App
- Ottimizza query Application Insights

## 📝 Costi Stimati (Azure)

Per 100.000 richieste/mese:

- Function App (Consumption): ~€15
- Storage (100GB): ~€5
- Redis Cache (C0): ~€40
- Application Insights: ~€10
- **Totale: ~€70/mese**

Per volumi maggiori considera:

- Function Premium Plan
- Redis Premium con clustering
- CDN per asset statici
