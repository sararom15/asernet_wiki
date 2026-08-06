---
okf_version: "0.2"
---

# Asernet

Wiki interna di Asernet, agenzia di consulenza strategica per progetti e-commerce e strategie di marketing digitale rivolta a PMI italiane esistenti: posizionamento, proposta di valore, mercato, competitor, clienti e decisioni aziendali.

**Metodo**: vedi [schema](_meta/schema.md) · **Storico**: vedi [log](log.md)

## Sezioni
- Fonti — 2 pagine
- Entità — 5 pagine
- Concetti — 4 pagine
- Decisioni — 0 pagine
- Sintesi — 0 pagine

## Domande aperte
- Domanda guida del bundle non ancora definita (schema §1) — da stabilire prima di considerare lo schema pronto.
- Criteri di granularità non definiti (schema §4): le pagine create finora riflettono scelte caso per caso, non una regola.
- `type` di Datapyx.ai: oggi `Concept`, ma lo schema definisce `Entity` come "attore concreto: persona, ente, sistema, prodotto". Da decidere.
- Ammissibilità delle fonti (schema §2): la §2 nomina solo asernet.it, ma è già stato ingerito anche datapyx.ai. Da estendere.
- Datapyx.ai è strumento interno o prodotto autonomo? Contraddizione aperta su `concepts/datapyx-ai.md`.

## Gap
- Mancano gli `index.md` di sezione (`sources/`, `entities/`, `concepts/`), richiesti dalla §7 del CLAUDE.md: da rigenerare con `/lint`.
- Le sottopagine del menu di asernet.it (Agency, Business Design, Performance marketing, E-commerce & IT, IA & Data Analysis, Case studies, Blog, Contatti, Team, Partnership, Area clienti) non sono ancora state recuperate/ingerite.
- Le "quattro aree di offerta" (Business Design, Performance Marketing, E-commerce & IT, IA & Data Analysis) non hanno ancora pagine `Concept` proprie: per ora sono descritte solo dentro `entities/asernet.md`, in attesa di decidere la granularità (schema §4, ancora aperta).
- Di datapyx.ai non sono state recuperate la sezione "News & Approfondimenti" né l'area applicativa dietro login.
- Beople è citato come ente formatore dei consulenti Asernet ma non ha una pagina: una sola menzione non la giustifica.
