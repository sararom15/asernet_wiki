# Schema — Asernet

> Compilato insieme all'agente. Ha precedenza su `CLAUDE.md` per tassonomia,
> tipi e metodo. Non ha precedenza sulla regola di isolamento (§1) né sulla
> soglia di astensione (§5.2) del `CLAUDE.md`.

---

## 1. Identità

| | |
|---|---|
| **Slug** | `asernet` |
| **Lingua** | italiano |
| **Dominio** | Wiki interna di Asernet, agenzia di consulenza strategica per progetti e-commerce e strategie di marketing digitale rivolta a PMI italiane esistenti: posizionamento, proposta di valore, mercato, competitor, clienti e decisioni aziendali. |
| **Domanda guida** | … — non ancora definita. Da rivedere prima di considerare lo schema pronto: senza, il resto del vocabolario resta vago. |
| **Cosa è fuori scope** | Contabilità; altri clienti/progetti seguiti da Asernet (isolati in bundle propri se e quando nasceranno). |
| **Orizzonte** | dominio permanente |

## 2. Cosa conta come fonte

- Ammesse: documenti di analisi strategica interna (positioning canvas, business plan, benchmark competitor), contenuti del sito web istituzionale (asernet.it), case study pubblicati, materiali di marketing e USP, verbali di riunioni interne.
- Escluse: …
- Autorevolezza: se due fonti confliggono, prevale quella con la data più recente.

## 3. Tipi di pagina (vocabolario `type`)

Questo è l'unico elenco valido per il campo `type` del frontmatter in questo
bundle. Aggiungere un tipo richiede una modifica esplicita a questo file.

| `type` | Cartella | Cos'è | Sezioni obbligatorie del corpo |
|---|---|---|---|
| `Source` | `sources/` | Una fonte ingerita, sintetizzata | Sintesi, Affermazioni chiave, Cosa non copre |
| `Entity` | `entities/` | Un attore concreto: persona, ente, sistema, prodotto | Definizione, Ruolo, Relazioni, Fonti |
| `Concept` | `concepts/` | Un'idea, un meccanismo, una regola | Definizione, Dettaglio, Fonti |
| `Decision` | `decisions/` | Una scelta fatta, con contesto e alternative scartate | Contesto, Decisione, Alternative, Conseguenze |
| `Synthesis` | `syntheses/` | Una risposta elaborata, archiviata | Domanda, Risposta, Limiti, Fonti |

Rimuovi i tipi che non servono. Aggiungi quelli specifici del dominio (es.
`Requirement`, `Norm`, `Stakeholder`, `Process`, `Risk`, `Dataset`).

## 4. Criteri di granularità

- Cosa merita una pagina propria in questo dominio: …
- Cosa invece resta una sezione dentro una pagina esistente: …
- Lunghezza target di una pagina: … parole.

## 5. Regole di astensione specifiche

Oltre alla soglia generale del `CLAUDE.md`, in questo dominio l'agente **deve**
astenersi quando: …

Esempi di domande su cui è obbligatorio rispondere "non coperto": …

## 6. Convenzioni di naming locali

- Nomi canonici: … (es. sempre la ragione sociale completa, mai l'acronimo)
- Date: …
- Riferimenti esterni (protocolli, numeri di norma, ID cliente): …

## 7. Lint specifico

Controlli aggiuntivi rispetto a quelli standard, es.:

- Ogni `Decision` deve avere almeno una `Source` fra le sue `refs`.
- Nessuna `Entity` senza link entranti da almeno una `Source`.
- …

## 8. Frontmatter esteso

Chiavi aggiuntive usate solo in questo bundle:

```yaml
# esempio
owner: nome.cognome
review_by: 2026-12-31
```

## 9. Storico dello schema

| Data | Modifica |
|---|---|
| 2026-08-06 | Creazione. §1 e §2 compilate a partire dal Positioning Canvas Asernet (30-06-2023) e dall'intervista; domanda guida, granularità, astensione, naming e lint specifico restano da definire. |
