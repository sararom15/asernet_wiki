# Schema — <Nome progetto>

> Copia questo file in `projects/<slug>/_meta/schema.md` e compilalo insieme
> all'agente prima di ingerire la prima fonte.
> Questo file ha precedenza su `CLAUDE.md` per tassonomia, tipi e metodo.
> Non ha precedenza sulla regola di isolamento (§1) né sulla soglia di
> astensione (§5.2) del `CLAUDE.md`.

---

## 1. Identità

| | |
|---|---|
| **Slug** | `<slug>` |
| **Lingua** | italiano |
| **Dominio** | … |
| **Domanda guida** | La domanda a cui questo bundle deve saper rispondere fra sei mesi. |
| **Cosa è fuori scope** | … |
| **Orizzonte** | progetto chiuso (si archivia) / dominio permanente (si mantiene) |

## 2. Cosa conta come fonte

Elenca i tipi di materiale ammessi in `raw/` e quelli esclusi. Es.: verbali di
riunione sì, thread di chat no; PDF normativi sì, post LinkedIn no.

- Ammesse: …
- Escluse: …
- Autorevolezza: se due fonti confliggono, quale prevale e perché.

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
| YYYY-MM-DD | Creazione |
