---
okf_version: "0.2"
---

# Asernet

Wiki interna di Asernet, agenzia di consulenza strategica per progetti e-commerce e strategie di marketing digitale rivolta a PMI italiane esistenti: posizionamento, proposta di valore, mercato, competitor, clienti e decisioni aziendali.

**Metodo**: vedi [schema](_meta/schema.md) · **Storico**: vedi [log](log.md)

## Sezioni
- Fonti — 4 pagine
- Entità — 16 pagine
- Concetti — 6 pagine
- Decisioni — 0 pagine
- Sintesi — 0 pagine

## Domande aperte
- Domanda guida del bundle non ancora definita (schema §1) — da stabilire prima di considerare lo schema pronto.
- Criteri di granularità non definiti (schema §4): le pagine create finora riflettono scelte caso per caso, non una regola. La sessione del 2026-08-17 ha deciso caso per caso una pagina `Entity` per persona per il team Asernet — non ancora formalizzato come criterio generale nello schema.
- `type` di Datapyx.ai: oggi `Concept`, ma lo schema definisce `Entity` come "attore concreto: persona, ente, sistema, prodotto". Da decidere.
- Ammissibilità delle fonti (schema §2): la §2 nomina solo asernet.it, ma sono già stati ingeriti anche datapyx.ai e un estratto da un altro vault (FullBrain, cross-vault, 2026-08-17). Da estendere esplicitamente.
- Datapyx.ai è strumento interno o prodotto autonomo? Contraddizione aperta su `concepts/datapyx-ai.md`.
- Il Positioning Canvas (2023) ha un tono da esercizio guidato, forse assistito da IA: non è chiaro se rifletta una posizione validata dal team Asernet — vedi `sources/2023-06-30-positioning-canvas-asernet.md`.

## Gap
- Mancano gli `index.md` di sezione (`sources/`, `entities/`, `concepts/`), richiesti dalla §7 del CLAUDE.md: da rigenerare con `/lint`.
- Le sottopagine del menu di asernet.it (Agency, Business Design, Performance marketing, E-commerce & IT, IA & Data Analysis, Case studies, Blog, Contatti, Team, Partnership, Area clienti) non sono ancora state recuperate/ingerite.
- Le "quattro aree di offerta" (Business Design, Performance Marketing, E-commerce & IT, IA & Data Analysis) non hanno ancora pagine `Concept` proprie: per ora sono descritte solo dentro `entities/asernet.md`, in attesa di decidere la granularità (schema §4, ancora aperta).
- Di datapyx.ai non sono state recuperate la sezione "News & Approfondimenti" né l'area applicativa dietro login.
- Beople è citato come ente formatore dei consulenti Asernet ma non ha una pagina: una sola menzione non la giustifica.
- Boraso, Floox, Making Science: pagine `Entity` basate su un'unica fonte (Positioning Canvas 2023), nessuna fonte propria ancora raccolta.
- Le 6 nuove pagine `Entity` del team (2026-08-17) hanno tutte `confidence: medium` e un'unica fonte (l'estratto FullBrain): nessun dettaglio biografico o professionale oltre nome e ruolo.
- Visual identity, palette colori, font, valori aziendali e tono di voce di Asernet sono documentati in dettaglio in FullBrain ma restano fuori dal perimetro OKF di questo bundle (posizionamento/proposta di valore/mercato/competitor/clienti/decisioni): non riportati qui deliberatamente.
