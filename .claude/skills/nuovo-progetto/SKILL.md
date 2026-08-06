---
name: nuovo-progetto
description: Crea un nuovo bundle di progetto, copia il template dello schema e intervista l'utente per compilarlo. Non ingerisce fonti - quella e una sessione successiva.
argument-hint: "[slug in kebab-case]"
allowed-tools: Read, Write, Glob
disable-model-invocation: true
---

# Nuovo progetto

Slug proposto: `$ARGUMENTS`

## Verifiche

- Lo slug è `kebab-case`, senza date, senza spazi? Se no, proponine uno corretto.
- `projects/$ARGUMENTS/` esiste già? Se sì, **fermati**.

## 1. Scheletro

Crea `projects/$ARGUMENTS/` con: `_meta/`, `raw/`, `sources/`, `entities/`,
`concepts/`, `decisions/`, `syntheses/`.

Copia `_TEMPLATES/schema.template.md` in `projects/$ARGUMENTS/_meta/schema.md`.

**Copia sempre il template in bianco.** Non copiare né consultare lo `schema.md`
di un progetto esistente: importerebbe la tassonomia di un altro dominio e
violerebbe §1 punto 4 del CLAUDE.md.

## 2. Intervista

Segui l'ordine delle sezioni del template. **Una domanda alla volta**, aspettando
la risposta prima di procedere. Non riempire i campi con valori plausibili di tua
iniziativa: un campo lasciato `…` è meglio di un campo inventato.

1. **Identità** — di cosa tratta questo progetto, in una frase.
2. **Domanda guida** — a quale domanda questo bundle deve saper rispondere fra
   sei mesi. È il campo più importante: se resta vago, tutto il resto sarà vago.
3. **Fuori scope** — cosa non deve finirci dentro.
4. **Orizzonte** — progetto che si chiude e si archivia, o dominio permanente.
5. **Fonti** — cosa conta come fonte ammissibile, cosa è escluso, e quale fonte
   prevale quando due confliggono.
6. **Vocabolario dei `type`** — parti dai cinque di default (`Source`, `Entity`,
   `Concept`, `Decision`, `Synthesis`), chiedi quali servono davvero e quali
   tipi specifici del dominio aggiungere. Per ciascuno: cartella e sezioni
   obbligatorie del corpo.
7. **Granularità** — cosa merita una pagina propria in questo dominio e cosa no.
8. **Astensione** — su quali domande è obbligatorio rispondere "non coperto".
9. **Naming** — nomi canonici, date, riferimenti esterni.
10. **Lint specifico** — controlli aggiuntivi propri del dominio.

## 3. Chiusura

- Rimuovi dallo schema i `type` di default che l'utente **non** ha confermato.
  Il vocabolario deve contenere solo ciò che serve.
- Crea `index.md` di radice con `okf_version` e le sezioni previste.
- Crea la cartella `log/` e dentro `log/<id>.md` dell'identità che sta creando il
  progetto, con l'intestazione `# Log — <slug> · <id>` e la prima voce:
  `## [YYYY-MM-DD] creazione | <slug>`.
- Crea `log.md` alla radice del bundle come **indice dei log**: elenca i file di
  `log/` e non contiene voci di operazione (CLAUDE.md §8).
- Crea `_meta/glossary.md` vuoto con l'intestazione.
- Se lo schema prevede meno di 30 pagine attese per sezione, **non creare** gli
  `index.md` di sezione: basta quello di radice finché non si supera la soglia.

## 4. Riepilogo, e stop

Riporta il vocabolario finale e la domanda guida, poi fermati.

**La prima fonte si ingerisce in una sessione separata.** Non proporre di
ingerire nulla adesso: lo schema appena scritto va riletto a mente fredda prima
di essere messo alla prova.
