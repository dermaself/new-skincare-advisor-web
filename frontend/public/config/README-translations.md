# Sistema di Traduzione Moduli

Questo sistema permette di tradurre i nomi dei moduli skincare dall'inglese all'italiano senza modificare il comportamento della creazione della routine.

## File Coinvolti

### 1. `module-translations.json` (Configurazione Principale)
File di configurazione che contiene tutte le traduzioni dei moduli organizzate per categoria.

**Struttura:**
```json
{
  "skincare_morning": {
    "Cleansing": "Detergente",
    "Tonic/Serum": "Tonico/Siero",
    "SPF": "Protezione Solare"
  },
  "skincare_evening": {
    "Night Cream": "Crema Notturna"
  },
  "skincare_weekly": {
    "Face Mask/Scrub": "Maschera/Scrub Viso"
  },
  "makeup": {
    "Foundation": "Fondotinta",
    "Concealer": "Correttore"
  },
  "fallback": {
    "Skincare Step": "Passo Skincare"
  }
}
```

### 2. `moduleTranslations.ts` (Logica di Traduzione)
File TypeScript che contiene:
- Traduzioni statiche hardcoded (fallback)
- Funzioni per caricare traduzioni dinamiche
- Logica di matching case-insensitive

## Come Funziona

1. **Traduzione Statica**: Prima cerca nelle traduzioni hardcoded nel file TypeScript
2. **Traduzione Dinamica**: Se non trova, carica il file JSON di configurazione
3. **Fallback**: Se non trova traduzione, mantiene il nome originale

## Vantaggi

✅ **Non modifica la logica di business**: I nomi originali dall'API rimangono invariati per la logica interna
✅ **Facile da mantenere**: Le traduzioni sono in un file JSON separato
✅ **Flessibile**: Può essere aggiornato senza ricompilare l'app
✅ **Fallback robusto**: Se una traduzione manca, mostra il nome originale
✅ **Case-insensitive**: Funziona anche con variazioni di maiuscole/minuscole

## Come Aggiungere Nuove Traduzioni

1. Apri `frontend/public/config/module-translations.json`
2. Aggiungi la nuova traduzione nella categoria appropriata:
   ```json
   "skincare_morning": {
     "New Module": "Nuovo Modulo"
   }
   ```
3. Salva il file - le modifiche sono immediate (no rebuild necessario)

## Come Modificare Traduzioni Esistenti

1. Modifica il valore nel file `module-translations.json`
2. Salva - le modifiche sono immediate

## Esempi di Utilizzo

```typescript
import { translateModuleName } from '../lib/moduleTranslations';

// Traduzione sincrona
const italianName = translateModuleName('Cleansing'); // "Detergente"

// Traduzione asincrona (con caricamento dinamico)
const italianNameAsync = await translateModuleNameAsync('Foundation'); // "Fondotinta"
```

## Note Tecniche

- Le traduzioni sono caricate una sola volta e cachate
- Il sistema è case-insensitive per robustezza
- Se il file JSON non è disponibile, usa le traduzioni statiche
- Non influisce sulla logica di ordinamento dei moduli o sulla creazione della routine
