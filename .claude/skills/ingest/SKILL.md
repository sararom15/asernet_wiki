---
name: ingest
description: Ingerisce una fonte da raw/ nella wiki del progetto attivo. Esegue prima un dry run che elenca le modifiche proposte, si ferma per approvazione, risincronizza il vault e scrive solo dopo. Non usare per domande - per quelle c'e /chiedi.
argument-hint: "[percorso del file in raw/]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
disable-model-invocation: true
---

# Ingest di una fonte

File da ingerire: `$ARGUMENTS`

## Come si eseguono le operazioni git

La risincronizzazione della fase A.1 passa dalla tool **`vault_sync`** del server
MCP del vault. Chiamala per nome corto: il nome pieno cambia col modo di
installazione (`mcp__vault-asernet__…` con la config manuale,
`mcp__plugin_asernet-vault_vault__…` se il server arriva col plugin).

`vault_sync` fa `git pull --ff-only` e non ti dà modo di farlo diversamente. Un
pull normale tenterebbe un merge su pagine di contenuto senza che nessuno lo
abbia chiesto, ed è esattamente ciò che questo vault vieta.

Bash ti resta concesso **solo in lettura** — `git fetch`, `git diff`, `git log`,
`git status` — per arricchire il report della fase A.1. Niente `commit`, niente
`push`: per quelli c'è `/pubblica`. E niente `merge`, `rebase`, `reset`,
`checkout`, `stash` in nessuna circostanza.

Se la tool non c'è (server non installato, plugin non aggiornato), **non
sincronizzare a mano**: passa all'utente `git pull --ff-only` da lanciare, e
fermati finché non l'ha fatto.

## Precondizioni — verificale prima di tutto

- Esiste un progetto attivo dichiarato in questa sessione? Se no, **fermati** e
  chiedi di lanciare `/progetto`.
- Sai qual è l'**identità attiva** (l'`id` di `/_meta/authors.md` stabilito da
  `/progetto`)? Se no, **fermati e chiedila**: senza non sai in quale
  `log/<id>.md` scrivere, e non si tira a indovinare.
- Hai letto lo `_meta/schema.md` del progetto attivo? Se no, leggilo ora.
- Il file è dentro `projects/<slug>/raw/`? Se è altrove, fermati: le fonti si
  depositano in `raw/` prima di essere ingerite.
- Il file rispetta i criteri di ammissibilità della §2 dello schema di progetto?
  Se non li rispetta, dillo e fermati.

---

## FASE A — dry run. Nessuna scrittura, nessuna eccezione.

1. Leggi il file sorgente.
2. Leggi l'`index.md` di radice e gli `index.md` di sezione. Apri **solo** le
   pagine che gli index indicano come potenzialmente rilevanti. Non fare una
   scansione completa del bundle.
3. Consulta `_meta/glossary.md` prima di proporre entità nuove: metà dei
   duplicati nasce da qui.

Presenta il risultato esattamente in questo formato:

```
## Fonte
<titolo> — <tipo di documento> — <data>

## Takeaway
1. …   (da 3 a 5, nessuno oltre)

## Creerei
| Path | type | Perché serve una pagina propria |

## Modificherei
| Path | Cosa cambia in una riga |

## Contraddizioni rilevate
| Pagina | Afferma | La fonte afferma | Data delle due fonti |

## Entità nuove non a glossario
- <nome proposto> (alias visti: …)

## Non ho capito
- <ambiguità della fonte che ti servirebbe risolvere prima di scrivere>
```

Poi **fermati**. Non anticipare la fase B nemmeno se la fonte sembra banale.
L'utente può ridurre lo scope, rinominare le entità, o annullare.

**Tieni da parte l'insieme P**: tutti i path che compaiono in `## Creerei` e
`## Modificherei`, come approvati dall'utente. Ti serve al passo successivo.

---

## FASE A.1 — risincronizza prima di scrivere

Dopo l'approvazione e **prima** di toccare qualsiasi file.

Il pull di `/progetto` è avvenuto all'inizio della sessione. Se il dry run è
durato mezz'ora, stai per scrivere su uno stato vecchio di mezz'ora — e il piano
che l'utente ha appena approvato è stato calcolato su un indice che nel
frattempo potrebbe non essere più vero.

Chiama **`vault_sync`**.

### Esiti

| `result` | Cosa fai |
|---|---|
| `UP_TO_DATE` | Prosegui con la fase B senza dire nulla |
| `OK`, `OK_STASH_REAPPLIED` | Il pull ha portato qualcosa: vedi sotto |
| `AHEAD`, `DIVERGED` | **Non è un problema di sincronizzazione: è lavoro di un'operazione precedente mai pubblicato.** Dillo con queste parole, manda l'utente a `/pubblica`, e **fermati** |
| `OK_STASH_HELD`, `STASH_POP_FAILED` | Il vault è aggiornato ma c'è lavoro in uno stash. **Fermati e riportalo**: scrivere ora sopra a un working tree che non contiene tutto ciò che credevi è il modo per perdere qualcosa senza accorgersene |
| `FAILED` | Riporta `stderr` e **fermati**. Se c'è `cause: INDEX_LOCK`, chiedi all'utente se ha operazioni git in corso e solo in caso negativo chiama `vault_unlock` con `confirm: true`. Non tentare altri rimedi: `merge`, `rebase`, `reset` e `stash` non sono nel tuo elenco |

### Se il pull ha portato qualcosa

L'insieme **R** — i file arrivati — te lo dà la tool, già separato: usa
`received.content_pages` e `received.index_and_log`.

**Gli `index.md` e i file di `log/` non contano**: ogni operazione li
tocca, quindi includerli farebbe scattare l'allarme a ogni singolo pull e in
pochi giorni impareresti a ignorarlo. Guarda solo le pagine di contenuto.

| Situazione | Cosa fai |
|---|---|
| R contiene solo `index.md` e `log/` | Prosegui. Annota che servirà `/lint` per rigenerare gli index, e dillo nel diff finale |
| **R ∩ P ≠ ∅** — pagine di contenuto che il tuo piano tocca | **STOP.** Il piano approvato è scaduto proprio dove stavi per scrivere |
| **R porta pagine di contenuto fuori da P** | **Segnala e chiedi.** Nessuna collisione, ma il dry run ha deciso *cosa esiste già* leggendo un indice ormai vecchio |

Il secondo caso non è pignoleria: una pagina che avevi in `## Creerei` potrebbe
esistere adesso, e la creeresti duplicata; un concetto che avevi segnalato come
gap potrebbe avere una pagina, e non la linkeresti.

### Cosa presenti

Per ogni pagina interessata: chi l'ha toccata — email dell'autore del commit
cercata in `/_meta/authors.md` per ricavarne l'`id` — e la voce in cima al suo
log:

```bash
git log --format='%an <%ae> · %ad · %s' ORIG_HEAD..HEAD -- <file>
```

(Il campo `received.commits` di `vault_sync` copre già il caso generale; questo
comando serve quando ti serve sapere chi ha toccato **un file specifico**.)

Poi elenca le opzioni **senza sceglierne una**:

1. **Rifare la fase A.** Dilla per prima: non hai ancora scritto niente, quindi
   ricalcolare il piano costa un minuto. È il motivo per cui questo controllo sta
   qui e non dopo. Lo stesso problema scoperto dopo la pubblicazione non si
   ricalcola: si registra come contraddizione e resta sulla pagina.
2. **Procedere lo stesso**, se l'utente ha letto le novità e le giudica
   irrilevanti. In quel caso **devi annotarlo** nella voce di log, con i path
   arrivati e la decisione presa.
3. **Fermarsi.**

Dopo il report **fermati**. Non scrivere niente finché l'utente non risponde.

---

## FASE B — scrittura. Solo dopo approvazione esplicita e dopo la fase A.1.

Se l'utente ha ridotto lo scope, applica **solo** ciò che ha approvato: non
reintrodurre pagine che ha tolto.

1. Crea `sources/YYYY-MM-DD-slug.md` con `type: Source`, `derived_from` che punta
   al file in `raw/`, e le sezioni previste dallo schema.
2. Crea le pagine approvate. Frontmatter completo: `type`, `title`,
   `description` (≤120 caratteri, senza informazione riservata), `tags`,
   `timestamp`, `project`, `status: draft`, `confidence`, `derived_from`, `refs`,
   `authored_by`.

   **`authored_by` sei tu**, cioè l'id dell'agente — non l'id dell'umano che ha
   approvato il dry run. Il campo dice chi ha *prodotto* il testo, non chi lo ha
   autorizzato. Non scrivere `reviewed_by` e non usare `status: reviewed`: la
   validazione è un atto umano successivo, non parte dell'ingest.
3. Modifica le pagine approvate **in modo chirurgico**: tocca i paragrafi
   interessati, non riscrivere la pagina. Aggiorna il loro `timestamp` solo se il
   cambiamento è sostanziale.
4. Registra le contraddizioni in `## Contraddizioni aperte` sulle pagine
   coinvolte, citando entrambe le fonti con data. **Non risolverle** e non
   cancellare la versione precedente.
5. Aggiorna `refs:` sulle pagine toccate.
6. Aggiorna `_meta/glossary.md` con le entità nuove e i loro alias.
7. Aggiorna gli `index.md` delle sezioni interessate e quello di radice.
8. Appendi in cima a `log/<id>.md`, dove `<id>` è l'identità **umana** che ha
   approvato l'operazione — non la tua. Il log risponde a *chi ha deciso*,
   `authored_by` a *chi ha scritto*. Se il file non esiste, crealo con
   l'intestazione `# Log — <slug> · <id>`.

```
## [YYYY-MM-DD] ingest | <titolo fonte>
- Creato: <path, path>
- Aggiornato: <path (cosa), path (cosa)>
- Contraddizioni: <n oppure nessuna>
- Sync: <— oppure: risincronizzato in fase A.1, arrivati <path>; deciso di procedere>
```

   Non scrivere mai in `log.md` alla radice del bundle: è solo l'indice dei log.

   **L'elenco dei file in questa voce è un contratto**: `/pubblica` lo confronta
   con ciò che trova sul disco e si ferma se non coincidono. Non ometterne
   nessuno e non nominarne di non toccati.

9. Chiudi con il **diff riassuntivo**: elenco dei file toccati, uno per riga.
   Niente prosa esplicativa oltre a quello.
10. Ricorda all'utente di lanciare **`/pubblica`**. L'operazione non è conclusa
    finché il lavoro è solo sul tuo disco: l'altra identità non lo vede, e
    continuerà a lavorare su uno stato che tu hai già superato.

## Divieti specifici di questa operazione

- Non scrivere mai dentro `raw/`.
- Non introdurre un `type` non enumerato nello schema: proponilo e aspetta.
- Non creare link verso pagine che non esistono: registrali come gap nell'index.
- Non ingerire più di una fonte per invocazione.
- Non firmare `authored_by` con un'identità umana: le pagine le hai scritte tu.
- Non scrivere in un `log/<id>.md` che non è dell'identità attiva.
- Non saltare la fase A.1, nemmeno se il dry run è durato due minuti.
- Non usare `git pull` senza `--ff-only`, e non committare né pushare: per quello
  c'è `/pubblica`.
- Se la fonte che stai per far entrare in `raw/` si avvicina ai 50 MB, fermati e
  segnalalo: serve Git LFS e va deciso prima del commit (CLAUDE.md §3.4).
