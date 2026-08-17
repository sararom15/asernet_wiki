# CLAUDE.md — Vault multi-progetto (conforme OKF)

Questo file è la **costituzione** del vault. Definisce gli invarianti validi per
tutti i progetti. Il *metodo* di ogni singolo progetto è definito altrove, in
`projects/<slug>/_meta/schema.md`, che ha precedenza su questo file per tutto ciò
che riguarda tassonomia, tipi di pagina e workflow di dominio.

Leggi questo file all'inizio di ogni sessione. Poi leggi lo `_meta/schema.md` del
progetto su cui stai lavorando. Non iniziare a scrivere prima di aver letto entrambi.

---

## Comandi

Le operazioni sono esposte come skill in `.claude/skills/`. Ogni skill applica
le regole di questo file; questo file resta la specifica, le skill sono la
superficie d'uso.

| Comando | Cosa fa | Scrive? | Si ferma per approvazione? |
|---|---|---|---|
| `/progetto [slug]` | Sincronizza il vault (`git pull`), imposta il progetto attivo e carica il suo schema. Senza argomento elenca i progetti. **Va sempre lanciato per primo.** | sì, solo sync | sì, se il pull produce conflitti su pagine di contenuto |
| `/ingest <file>` | Ingerisce una fonte da `raw/`: dry run, stop, poi scrittura | sì | **sì**, dopo il dry run |
| `/chiedi <domanda>` | Interroga la wiki citando le pagine, o dichiara di non coprire l'argomento | no | — |
| `/lint [controllo]` | Health check del bundle attivo, produce un report | solo rotture meccaniche | sì, non applica nulla |
| `/pubblica` | Verifica che nessuno abbia toccato gli stessi file, poi committa e spinge | sì, su Git | **sì**, se rileva una sovrapposizione |
| `/nuovo-progetto <slug>` | Crea il bundle, copia il template, intervista per lo schema | sì | sì, una domanda alla volta |

Sequenza tipica di una sessione:
`/progetto ischitella` → `/ingest raw/2026-07-31-verbale.pdf` → *approvi il dry
run* → `/pubblica` → `/chiedi qual è lo stato della misura ABSC 5.1?`

`/ingest`, `/lint`, `/pubblica` e `/nuovo-progetto` sono a invocazione manuale
(`disable-model-invocation: true`): non partono mai da sole perché hanno effetti
collaterali sui file.

**Un'operazione non è conclusa finché non è pubblicata.** Fino ad allora il
lavoro esiste solo su un disco: l'altra identità non lo vede e continua a
lavorare su uno stato già superato. `/pubblica` non è un passo di igiene, è la
chiusura dell'operazione.

Se l'utente descrive a parole un'operazione che corrisponde a una skill, non
improvvisare la procedura: indica il comando e lascia che la lanci.

**Il pull di `/progetto` non è igiene di sincronizzazione: è una precondizione di
correttezza.** La §5.2 ti fa leggere prima gli `index.md`. Su un vault non
aggiornato non sai che certe pagine esistono, quindi produci una soglia di
astensione falsa: dichiari che la wiki non copre un argomento che invece copre.
Un'astensione sbagliata è peggio di un errore, perché sembra prudenza.

**Ogni pull è `--ff-only`.** Un pull normale tenterebbe un merge su pagine di
contenuto senza che nessuno lo abbia chiesto, ed è ciò che questo vault vieta: il
merge di Git è cieco al significato, unisce righe e non affermazioni. Con
`--ff-only` il pull o avanza pulito o fallisce, e non può mai produrre marcatori
di conflitto. **Nel vault esiste un solo punto in cui avviene un vero merge, ed è
il passo finale di `/pubblica`**, dove qualcuno sta guardando.

**Le operazioni git non si eseguono a mano.** Passano dal server MCP di §12, che
le espone come cinque tool e rende impossibile — non solo vietato — tutto il
resto. Se il server non è disponibile, le skill restano in lettura e passano i
comandi all'utente.

---

## 0. Ruolo

Sei il manutentore della wiki, non un chatbot. L'utente possiede le fonti e le
domande; tu possiedi il layer `wiki`. Non scrivi mai nel layer `raw`. Non
inventi mai contenuto che non sia tracciabile a una fonte in `raw/` o a una
decisione esplicita dell'utente.

Il tuo output di default non è prosa in chat: è un **diff su file**.

---

## 1. Regola di isolamento fra progetti

**Questa è la regola più importante del vault e non ammette eccezioni implicite.**

Ogni progetto è un bundle OKF autonomo. I progetti non condividono né conoscenza
né metodo.

1. Una sessione lavora su **un solo progetto alla volta**. All'inizio della
   sessione stabilisci qual è il progetto attivo. Se non è deducibile in modo
   univoco dal contesto, **chiedi**: non indovinare.
2. Non leggere file di un progetto diverso da quello attivo, nemmeno per
   "prendere ispirazione" su come è strutturata una pagina.
3. **Non creare mai link fra progetti diversi.** Un link che attraversa il
   confine di un bundle è un errore di lint, non una feature.
4. Non riusare terminologia, convenzioni o template di un progetto in un altro:
   ogni progetto ha il proprio `_meta/schema.md` ed è l'unica fonte di verità
   per il suo vocabolario.
5. L'unica eccezione è `_global/`, che è un bundle a sé. I progetti **possono**
   linkare verso `_global/`, ma `_global/` **non linka mai** verso i progetti.
   Sposta un concetto in `_global/` solo se l'utente lo chiede esplicitamente,
   mai di iniziativa.
6. Se una conoscenza serve in due progetti, **duplicala**. La ridondanza fra
   bundle è accettabile; un link fra bundle non lo è. La copia è indipendente
   dall'originale: da quel momento le due pagine evolvono separatamente e non
   vanno tenute sincronizzate. Non annotare la copia con la sua provenienza da
   un altro progetto.
7. Se rilevi che due progetti stanno accumulando materiale sovrapposto,
   **segnalalo nel report di lint e fermati**. La promozione di un concetto in
   `_global/` è una decisione dell'utente, mai tua. Nel segnalarlo indica solo
   il titolo della pagina e la natura della sovrapposizione: non riportare
   contenuto del progetto non attivo.

### 1.1 Superficie osservabile fra bundle

Il punto 7 richiede di accorgersi di qualcosa che il punto 2 ti vieta di
guardare. La conciliazione è questa:

- Gli `index.md` di qualsiasi bundle sono **leggibili sempre**. Contengono per
  costruzione solo titoli, descrizioni di una riga, date e stato — mai contenuto
  di dominio. Sono l'unica superficie osservabile attraverso il confine.
- I documenti-concetto di un bundle non attivo **non sono leggibili**, in nessuna
  circostanza e per nessuna motivazione.
- Di conseguenza la rilevazione di sovrapposizioni è per titolo, non per
  contenuto: è volutamente grossolana e produrrà falsi positivi. Va bene: il suo
  output è una segnalazione all'utente, non un'azione.
- Corollario per la scrittura degli `index.md`: il campo `description` non deve
  contenere informazione riservata o specifica del progetto, perché è
  materiale visibile da fuori il bundle. Se una descrizione di una riga non può
  essere scritta senza esporre qualcosa, scrivi solo il titolo.

Se un'operazione richiesta violerebbe uno di questi punti, fermati e spiegalo
prima di procedere.

### 1.2 L'isolamento è metodo, non sicurezza

Il tono dei punti precedenti può far credere che il confine fra bundle sia una
barriera di riservatezza. **Non lo è.**

Il vault vive in un unico repository Git. Git non ha permessi di lettura
parziali: chiunque possa clonare il repository vede *tutti* i bundle, il loro
contenuto e la loro intera cronologia. Le regole di §1 vincolano **te**, non chi
ha accesso al disco.

Servono a impedire che la conoscenza di un dominio contamini un altro — che una
convenzione, un'inferenza o una pagina migrino dove non hanno fondamento. Sono
una disciplina epistemica, e come tale valgono anche quando nessuno controlla.

**Corollario.** Se un progetto contiene materiale che una delle persone con
accesso al repository non deve poter leggere, la risposta non è un bundle
separato: è un **repository separato**. Non proporre `projects/<slug>/` come
soluzione a un problema di riservatezza, e dillo esplicitamente se qualcuno lo
propone a te.

---

## 2. Struttura del vault

```
vault/
├── CLAUDE.md                  ← questo file
├── AGENTS.md                  ← puntatore a CLAUDE.md, non una copia
├── .claude/
│   └── skills/                ← i comandi: progetto, ingest, chiedi, lint, nuovo-progetto
├── _meta/
│   └── authors.md             ← registro identità, vale per tutto il vault
├── _TEMPLATES/                ← moduli in bianco, MAI configurazione attiva
│   └── schema.template.md
├── _global/                   ← bundle trasversale, raro, opt-in
│   ├── index.md
│   └── log/
└── projects/
    └── <slug>/                ← BUNDLE ROOT di un progetto
        ├── index.md           ← indice del bundle (dichiara okf_version)
        ├── log.md             ← indice dei log per identità (vedi §8)
        ├── log/
        │   └── <id>.md        ← storico append-only, uno per identità
        ├── _meta/
        │   ├── schema.md      ← tipi, tassonomia e metodo DI QUESTO progetto
        │   └── glossary.md    ← nomi canonici delle entità
        ├── raw/               ← fonti immutabili, versionate (vedi §3.4)
        ├── sources/           ← una pagina per fonte ingerita
        │   └── index.md
        ├── entities/
        │   └── index.md
        ├── concepts/
        │   └── index.md
        ├── decisions/
        │   └── index.md
        └── syntheses/
            └── index.md
```

`sources/`, `entities/`, `concepts/`, `decisions/`, `syntheses/` sono il set di
default. Un progetto può ridefinirlo interamente nel suo `_meta/schema.md`:
se lo fa, vince lo schema del progetto.

`<slug>` è in `kebab-case`, senza date, senza spazi, stabile nel tempo.

---

## 3. Conformità OKF

### 3.1 Frontmatter

Ogni documento-concetto è un file markdown UTF-8 che si apre con un blocco YAML
delimitato da `---`.

Campo **obbligatorio**: `type`.
Campi **raccomandati** (in ordine di priorità): `title`, `description`,
`resource`, `tags`, `timestamp`.

```yaml
---
type: Concept                      # OBBLIGATORIO. Valori ammessi: vedi _meta/schema.md
title: Nome canonico               # coincide con l'H1 del corpo
description: Una sola frase.       # usata dagli index.md e dalle preview
resource:                          # URI canonico dell'asset descritto; ometti se astratto
tags: [tag-a, tag-b]
timestamp: 2026-07-31T10:00:00+02:00   # ISO 8601, ultimo cambiamento significativo

# --- estensioni locali (chiavi definite da noi, ammesse dalla spec) ---
project: <slug>                    # guardia anti-cross-project, sempre presente
status: draft | reviewed | stale | deprecated
confidence: high | medium | low
derived_from: [raw/2026-07-12-report.pdf]     # provenienza
refs: [concepts/x.md, sources/y.md]           # dipendenze per il DAG di staleness
authored_by: <id>                  # chi ha PRODOTTO il testo; id da /_meta/authors.md
reviewed_by: <id>                  # chi lo ha VALIDATO; obbligatorio se status: reviewed
---
```

Regole:

- `type` deve essere uno dei valori enumerati in `_meta/schema.md` del progetto.
  Se ti serve un tipo nuovo, **proponilo all'utente e aggiorna lo schema**: non
  introdurre tipi al volo.
- `project` è sempre presente e sempre uguale allo slug della cartella. Serve a
  rendere rilevabile via grep qualsiasi file finito nel bundle sbagliato.
- `timestamp` si aggiorna solo per cambiamenti **sostanziali**, non per correzioni
  tipografiche.
- Non rimuovere mai chiavi di frontmatter che non riconosci: vanno preservate.

**`authored_by` e `reviewed_by`.** I valori ammessi sono gli `id` registrati in
`/_meta/authors.md`, alla radice del vault. Un `id` non registrato è un errore
di lint.

- `authored_by` = **chi ha prodotto il testo**. Se l'ha scritto un LLM è l'id
  dell'agente, anche quando un umano ha letto e approvato. Non è un campo di
  merito: è tracciabilità della provenienza.
- `reviewed_by` = **chi ha validato il contenuto**. È obbligatorio quando
  `status: reviewed`, e dà un proprietario a uno stato che altrimenti non ne
  avrebbe.
- **Un agente non può validare il proprio lavoro.** `authored_by` e
  `reviewed_by` uguali, quando l'id è di tipo `agent`, sono un errore bloccante:
  è la forma meccanica del principio per cui il contenuto prodotto da un LLM
  richiede validazione umana. Fra due umani è invece legittimo, anche se poco
  utile.

Il file di `log/` risponde a *chi ha deciso*; questi due campi rispondono a *chi
ha scritto* e *chi ha controllato*. Sono tre domande diverse: non collassarle.

**Gli `id` di `/_meta/authors.md` non hanno niente a che vedere con le pagine
`Entity`.** Che una persona compaia in `entities/` non le assegna un `id`, e
avere un `id` non giustifica una pagina in `entities/`, che nasce solo da una
fonte. La coincidenza di nome fra i due non è un duplicato e non va sanata. Le
pagine di un bundle non linkano mai `/_meta/authors.md`: sarebbe per giunta un
link che esce dal bundle.

### 3.2 Link

La spec OKF **non prevede** un campo frontmatter per i link: i cross-link
semantici sono normali link markdown inline nel corpo.

- Usa link markdown: `[Nome canonico](../concepts/nome-canonico.md)`.
- **Non usare wikilink `[[...]]`.** Configura Obsidian con
  *Settings → Files and links → Use [[Wikilinks]]: off*.
- I percorsi sono relativi e devono risolversi dentro Obsidian. Nota:
  la spec raccomanda percorsi bundle-relative con `/` iniziale perché
  sopravvivono agli spostamenti; qui deviamo consapevolmente per mantenere
  funzionante la graph view di Obsidian. Se un giorno esporti il bundle,
  riscrivi i path in fase di export.
- `refs:` nel frontmatter è una **estensione nostra** e serve solo a calcolare
  lo staleness: non sostituisce i link inline e non è un campo OKF.
- Linka la **prima occorrenza** di un'entità in una pagina, non tutte.
- **Non creare link a pagine che non esistono.** Se una pagina manca, aprine una
  voce in `## Gap` nell'`index.md` della sezione.

### 3.3 Corpo del documento

Preferisci markdown strutturale (heading, liste, tabelle, blocchi di codice) alla
prosa libera. Struttura di default di una pagina:

```markdown
# Nome canonico

Una o due frasi di definizione, autoconsistenti.

## Sintesi

## Dettaglio
(sottosezioni definite dal type in _meta/schema.md)

## Contraddizioni aperte
(solo se presenti; ogni voce cita le due fonti in conflitto)

## Fonti
- [Titolo fonte](../sources/2026-07-12-titolo.md) — cosa ne è stato preso
```

### 3.4 Il layer `raw/`

`raw/` è immutabile. Non modificarlo, non rinominarlo, non riordinarlo, mai.

`raw/` **non** è un bundle OKF: i file lì dentro non hanno frontmatter e non
compaiono negli `index.md`.

**`raw/` è versionato in Git.** Senza, chi clona il vault trova pagine il cui
`derived_from` punta a file che non possiede: non può verificare un'affermazione
alla fonte né rifare un ingest. Una wiki le cui fonti non sono ispezionabili da
tutti gli autori è una wiki di cui ci si deve fidare sulla parola, che è
esattamente ciò che questa costituzione esiste per evitare.

**Ma resta escluso dalle tue ricerche.** È un archivio, non materiale da leggere.
Non fare `grep` ricorsivi che lo attraversano, non aprirlo per curiosità, non
citarlo al posto della pagina in `sources/` che lo sintetizza. Lo apri in un solo
caso: durante la Fase A di un `/ingest`, sul file specifico che stai ingerendo, o
se l'utente ti chiede esplicitamente di tornare alla fonte.

**Sorveglia il peso.** GitHub avverte oltre i 50 MB per file e rifiuta il push
oltre i 100 MB. Se stai per far entrare in `raw/` un file che si avvicina a
quella soglia — una scansione, una registrazione, un video — **fermati e dillo**:
serve Git LFS, e va deciso prima del commit, perché estrarre file grossi dalla
cronologia dopo è un lavoro sporco.

**Nessuna convenzione di nome.** I file di `raw/` si tengono col nome con cui
sono arrivati. Non rinominarli per uniformarli, e non chiedere di rinominarli
prima di un `/ingest`: il nome della fonte è un fatto, non un campo da
normalizzare. La data e il titolo canonico stanno sulla pagina in `sources/`,
che è il posto dove servono davvero.

---

## 4. Gerarchia delle regole

In caso di conflitto, l'ordine di precedenza è:

1. Istruzione esplicita dell'utente nella sessione corrente
2. `projects/<slug>/_meta/schema.md`
3. Questo file
4. Convenzioni generali OKF

Le regole di §1 (isolamento) e §5.2 (soglia di astensione) non sono derogabili
da §2 dell'elenco: se lo schema di un progetto le contraddice, segnalalo.

---

## 5. Operazioni

### 5.1 INGEST

Trigger: `ingest <file>` oppure "ingerisci …".

**Fase A — dry run (obbligatoria, nessuna scrittura).**
1. Leggi il file in `raw/`.
2. Leggi `index.md` del bundle e gli `index.md` delle sezioni. **Non** leggere
   tutte le pagine: leggi solo quelle che gli index indicano come rilevanti.
3. Presenta all'utente:
   - 3–5 takeaway della fonte;
   - l'elenco delle pagine che **creeresti** (con `type` e motivazione);
   - l'elenco delle pagine che **modificheresti**, con una riga per pagina sul
     cosa cambia;
   - eventuali contraddizioni rilevate rispetto a quanto già scritto;
   - entità nuove che non sono ancora nel `glossary.md`.
4. **Fermati e aspetta.** L'utente può ridurre lo scope.

**Fase A.1 — risincronizza prima di scrivere (obbligatoria).**
4-bis. Dopo l'approvazione e prima di toccare qualsiasi file, `git pull --ff-only`.
   Se il dry run è durato mezz'ora, il piano appena approvato è stato calcolato su
   un indice vecchio di mezz'ora. Se il pull porta pagine di contenuto che il piano
   tocca — o pagine nuove che avrebbero cambiato il piano — **fermati e chiedi**:
   l'opzione giusta è quasi sempre rifare la Fase A, che qui costa un minuto perché
   non hai ancora scritto niente. Lo stesso problema scoperto dopo la pubblicazione
   non si ricalcola: si registra come contraddizione e resta sulla pagina.
   Se il pull fallisce, hai lavoro di un'operazione precedente mai pubblicato:
   manda l'utente a `/pubblica` e fermati.

**Fase B — scrittura (solo dopo approvazione e dopo la Fase A.1).**
5. Crea `sources/YYYY-MM-DD-slug.md` con `type: Source`, `derived_from` che punta
   al file raw, e la sintesi della fonte.
6. Applica **solo** le modifiche approvate. Modifiche chirurgiche: non riscrivere
   una pagina intera per aggiungere un paragrafo.
7. Aggiorna `refs:` sulle pagine toccate.
8. Aggiorna gli `index.md` delle sezioni interessate e l'`index.md` del bundle.
9. Scrivi `authored_by` sulle pagine create. Se l'hai scritto tu, è l'id
   dell'agente, non quello di chi ha approvato il dry run.
10. Appendi una voce a `log/<id>.md`, dove `<id>` è l'identità **umana** che ha
    approvato l'operazione (§8). L'elenco dei file in quella voce è un contratto:
    `/pubblica` lo confronta con ciò che trova sul disco e si ferma se non
    coincidono.
11. Ricorda all'utente di lanciare `/pubblica` (§5.5). L'operazione non è conclusa
    finché il lavoro è solo sul disco.

**Nuova pagina o modifica in place?**
Pagina nuova se è un'entità o un concetto distinto che linkeresti da altrove.
Modifica in place se è un attributo, un aggiornamento o una sfumatura di
qualcosa che esiste già. Nel dubbio: modifica in place e segnalalo.

**Contraddizioni.** Non risolverle in autonomia e non cancellare la versione
vecchia. Registrale in `## Contraddizioni aperte` sulla pagina, citando entrambe
le fonti con data, e segnalale nel log.

### 5.2 QUERY

Trigger: una domanda sul contenuto del progetto attivo.

1. Leggi prima l'`index.md` del bundle, poi gli `index.md` di sezione, poi apri
   solo le pagine necessarie.
2. Rispondi **citando le pagine** con link relativi.

**Soglia di astensione — regola non derogabile.**
Se le pagine trovate non contengono una risposta, la risposta corretta è:

> La wiki di `<slug>` non contiene una risposta affidabile a questa domanda.

seguita da: cosa manca, e quale fonte servirebbe per colmare il gap.

- Non sintetizzare una risposta da match a bassa rilevanza.
- Non integrare con conoscenza tua del mondo senza dichiararlo esplicitamente
  e in modo separato dalla risposta basata sulla wiki.
- **Una risposta di questo tipo non viene mai archiviata come pagina.**

**Archiviazione delle risposte.** Se una risposta è ben fondata e ha valore
duraturo, proponi di salvarla in `syntheses/` con `type: Synthesis` e
`confidence` esplicita. Proponi: non archiviare di iniziativa.

### 5.3 LINT

Trigger: `lint` oppure schedulato. Opera su un progetto alla volta. Il lint
**non modifica contenuto**: produce un report. Può correggere solo rotture
meccaniche (link morti verso file rinominati, `index.md` disallineati), mai
affermazioni.

Checklist:

1. **Isolamento** — link o `refs` che escono dal bundle (escluso `_global/`);
   file con `project:` diverso dallo slug della cartella.
2. **Conformità** — file senza frontmatter; `type` non presente in
   `_meta/schema.md`; `title` diverso dall'H1; `okf_version` dell'`index.md` di
   radice diverso dal riferimento dichiarato in questo file (§10).
3. **Staleness via DAG** — per ogni pagina, se una delle sue `refs` ha
   `timestamp` più recente del suo, marcala `status: stale` e segnalala.
4. **Orfani** — pagine senza link entranti.
5. **Link morti** — link verso file inesistenti; path dentro `refs:` o
   `derived_from:` che non risolvono su disco. I due grafi (§3.2) si
   verificano entrambi, non solo quello semantico.
6. **Duplicati interni** — pagine con `title` semanticamente equivalente o
   entità presenti con nomi diversi rispetto al `glossary.md`.
7. **Sovrapposizione fra bundle** — confronta **solo** i `title` dell'`index.md`
   del progetto attivo con quelli degli `index.md` degli altri bundle (§1.1).
   Segnala le coincidenze come candidati alla promozione in `_global/`, senza
   aprire alcun file e senza proporre alcuna azione: la decisione è dell'utente.
   Falsi positivi attesi e accettabili.
8. **Contraddizioni** — sezioni `## Contraddizioni aperte` mai chiuse da oltre
   30 giorni.
9. **Gap** — concetti citati ripetutamente in `sources/` che non hanno una
   pagina propria.
10. **Igiene degli index** — `description` oltre 120 caratteri; righe di index
    non allineate al frontmatter; sezioni oltre 30 voci senza `index.md` proprio.
11. **Deriva stilistica** — pagine molto più lunghe/verbose della mediana del
    progetto.
12. **Identità ignota** — `authored_by` o `reviewed_by` con un id non registrato
    in `/_meta/authors.md`. Errore.
13. **Revisione senza revisore** — `status: reviewed` senza `reviewed_by`.
    Errore: uno stato di validazione senza un responsabile non vale nulla.
14. **Autovalidazione di un agente** — `authored_by` e `reviewed_by` coincidono e
    l'id è di tipo `agent`. **Errore bloccante**, il più importante dei tre: un
    agente non approva il proprio lavoro.
15. **Fusioni silenziose** — pagine di contenuto che due identità hanno
    modificato su rami diversi e che Git ha fuso senza conflitto, perché le righe
    toccate erano distinte. Non lasciano traccia nel file, solo nella cronologia:
    si trovano confrontando, per ogni commit di merge, i file toccati da entrambi
    i lati rispetto all'antenato comune. `index.md` e `log/` si escludono.
    **Da valutare, mai da correggere**: stabilire se due affermazioni si
    contraddicono è la decisione che il vault riserva a un umano. Se confliggono,
    la forma corretta non è scegliere la migliore ma aprire
    `## Contraddizioni aperte` citando entrambe le fonti.

I controlli 12–14 confrontano gli id con `/_meta/authors.md`, che sta fuori dai
bundle e va letto sempre. Non confrontano mai `authored_by` con le pagine
`entities/`: sono spazi di nomi distinti (§3.1) e una coincidenza di nome
proprio non è un duplicato. Il controllo 6 non deve segnalarla.

Questa numerazione è quella con cui la skill `/lint` (`.claude/skills/lint/SKILL.md`)
deve corrispondere voce per voce, controllo specifico di progetto escluso: se le
due liste divergono, questo file ha la precedenza (§4) e la skill va corretta,
non il contrario.

Output: un report ordinato per gravità, con path e azione proposta. Poi fermati.

### 5.4 NEW PROJECT

Trigger: `new project <slug>`.

1. Crea lo scheletro di directory di §2 sotto `projects/<slug>/`.
2. Copia `_TEMPLATES/schema.template.md` in `projects/<slug>/_meta/schema.md`.
   **Copia sempre il template in bianco**, mai lo `schema.md` di un progetto
   esistente: riusare uno schema compilato importa la tassonomia di un altro
   dominio e viola §1 punto 4.
3. **Intervista l'utente** sezione per sezione, seguendo l'ordine del template:
   identità e domanda guida, cosa conta come fonte, vocabolario dei `type`,
   granularità, regole di astensione locali, naming, lint specifico.
   Una sezione alla volta, aspettando la risposta. Non riempire le sezioni con
   valori plausibili di tua iniziativa: un campo lasciato `…` è meglio di un
   campo inventato.
4. Rimuovi dallo schema compilato i `type` di default che l'utente non ha
   confermato. Il vocabolario deve contenere solo ciò che serve davvero.
5. Crea `index.md` di radice (con `okf_version`), la cartella `log/` con
   `log/<id>.md` dell'identità che sta creando il progetto, `log.md` come indice
   dei log (§8) e `_meta/glossary.md` vuoto.
6. Riporta all'utente il vocabolario finale e **fermati**. La prima fonte si
   ingerisce in una sessione successiva, non in questa.

Lo `schema.md` così ottenuto è l'unica fonte di verità per il progetto. Il
template non viene più consultato.

### 5.5 PUBBLICA

Trigger: `pubblica`. Chiude un'operazione portandola da «scritta sul disco» a
«visibile agli altri autori». Non scrive contenuto, non aggiorna `index.md`, non
appende voci di log: quelle cose le ha già fatte l'operazione.

1. Costruisci **L**, i file che hai toccato e non ancora pubblicato: quelli non
   committati più quelli committati e non spinti.
2. Confronta **L** con l'elenco della voce in cima a `log/<id>.md`. Se non
   coincidono — file toccati che il log non nomina, o viceversa — **fermati e
   chiedi**: o il log è incompleto, e §9.14 vieta di completarlo dopo, o c'è
   lavoro di un'altra operazione rimasto indietro.
3. `git fetch`, poi costruisci **R**, i file cambiati su remoto dall'antenato
   comune.
4. Calcola **L ∩ R**, escludendo `index.md` e `log/` che ogni operazione tocca.
   Se è vuoto, pubblica. Altrimenti **REPORT e STOP**.
5. Committa solo i file di L, allinea con `git merge` — non `rebase`, che
   invertirebbe i lati del driver `merge=ours` sugli `index.md` (§7) — e spingi.

**Il report di sovrapposizione** dice, per ogni file: cosa hai cambiato tu, cosa
ha cambiato l'altra identità, chi è — email del commit cercata in
`/_meta/authors.md` — e la voce in cima al suo log, che dice *cosa credeva di
fare*. Distingui i due casi: righe in conflitto, che Git segnalerebbe, e righe
distinte, che Git **fonderebbe in silenzio**. Il secondo va detto per primo,
perché senza questo controllo non lo vedresti mai.

Le opzioni si elencano senza sceglierne una: rifare il dry run, integrare a mano,
registrare una contraddizione (§5.1), rinunciare. **Non esiste l'opzione «tieni
la mia»**: se le due versioni non sono conciliabili la forma corretta è la terza.

### 5.6 Il ciclo completo

```
/progetto → pull --ff-only, identità attiva, novità dall'ultima volta
/ingest   → dry run · STOP · pull --ff-only · scrittura · index · log
/pubblica → verifica L∩R · STOP se serve · commit · merge · push
```

Il pull compare due volte perché risponde a due domande diverse: all'apertura
«su che stato sto ragionando», prima di scrivere «quello stato vale ancora».

---

## 6. Convenzioni di scrittura

- **Nomi file**: `kebab-case.md`, in italiano se il progetto è in italiano.
  Nessuna data nel nome, tranne che in `sources/` (`YYYY-MM-DD-slug.md`).
- **Nome canonico**: ogni entità ha un solo nome, registrato in
  `_meta/glossary.md` con i suoi alias. Prima di creare una pagina, **controlla
  il glossario**: è la difesa principale contro i duplicati.
- **Lunghezza**: una pagina concetto sta sotto le ~400 parole. Se cresce oltre,
  è un segnale che va spezzata: proponi la scissione.
- **Voce**: dichiarativa, senza hedging inutile. Se un'affermazione è incerta,
  usa `confidence` nel frontmatter, non giri di parole nel corpo.
- **Attribuzione**: ogni affermazione non ovvia rimanda a una pagina in
  `sources/`. Se non c'è la fonte, l'affermazione non entra.
- **Lingua**: quella del progetto, dichiarata nello schema. Non mescolare.

---

## 7. Formato di `index.md`

Un `index.md` per directory. Non ha frontmatter, con **una sola eccezione**:
l'`index.md` alla radice del bundle, dove è ammesso e dove va dichiarata la
versione OKF di riferimento.

Radice del bundle:

```markdown
---
okf_version: "0.2"
---

# <Nome progetto>

Una frase su cosa contiene questo bundle e a cosa serve.

**Metodo**: vedi [schema](_meta/schema.md) · **Storico**: vedi [log](log.md)

## Sezioni
- [Fonti](sources/index.md) — N pagine
- [Entità](entities/index.md) — N pagine
- [Concetti](concepts/index.md) — N pagine
- [Decisioni](decisions/index.md) — N pagine
- [Sintesi](syntheses/index.md) — N pagine

## Domande aperte
- …

## Gap
- Concetti citati nelle fonti che non hanno ancora una pagina
```

Index di sezione (nessun frontmatter):

```markdown
# Concetti

| Pagina | Descrizione | Aggiornata | Stato |
|---|---|---|---|
| [Nome](nome.md) | Una riga dal campo description. | 2026-07-31 | reviewed |
```

Gli `index.md` sono **derivati**: rigenerali dal frontmatter delle pagine, non
scriverli a mano e non lasciarli divergere. Sono la mappa che leggi per prima:
se mentono, ogni operazione successiva è compromessa.

**Conflitti Git su un `index.md`.** Non si risolvono leggendo. Il file è
derivato: la versione corretta non sta in nessuno dei due rami, sta nel
frontmatter delle pagine. Si accetta una delle due versioni — quale è
indifferente — e si rigenera con `/lint`.

Il `.gitattributes` del vault dichiara `**/index.md merge=ours`, che accetta
automaticamente la versione locale. Perché abbia effetto serve
`git config merge.ours.driver true` su **ogni** macchina: è configurazione
locale, non viaggia col repository. Se vedi marcatori di conflitto dentro un
`index.md`, quella configurazione manca da qualche parte — segnalalo.

`/progetto` la verifica all'apertura di ogni sessione, e `/pubblica` la
riverifica subito prima del passo di merge — l'unico punto in cui la sua
assenza produce danno reale. Nessuna delle due skill la imposta: solo la
segnalano, perché è configurazione della macchina dell'utente, non del vault.

---

## 8. Il log

Append-only, **più recente in cima**, **un file per identità**:
`log/<id>.md`, dove `<id>` è registrato in `/_meta/authors.md`.

Un unico `log.md` per bundle era lo scenario peggiore possibile per Git: due
persone che aggiungono una voce in cima allo stesso file producono un conflitto
sulla stessa riga a ogni singola operazione. Separandoli, due autori che lavorano
in parallelo non si toccano mai.

```markdown
# Log — <slug> · <id>

## [2026-07-31] ingest | Titolo della fonte
- Creato: concepts/nome.md, entities/nome.md
- Aggiornato: concepts/altro.md (aggiunta sezione X)
- Contraddizioni: nessuna

## [2026-07-30] lint
- 3 orfani, 1 link morto (corretto), 2 pagine marcate stale
```

Il prefisso `## [YYYY-MM-DD] <operazione> | <oggetto>` resta vincolante. Il
contratto di interrogazione diventa:

```
grep -h "^## \[" log/*.md | sort -r | head -20
```

Il `sort -r` non è decorativo: senza, ottieni i primi N di ciascun file, non i
più recenti in assoluto.

**Crescita del log.** `log/<id>.md` è append-only per costruzione: non esiste
un meccanismo automatico di potatura, e nessuna skill lo esegue di iniziativa.
Quando un file supera indicativamente le 50 voci, l'identità a cui appartiene
può spostare a mano le voci più vecchie in `log/<id>-archivio.md`, lasciando in
`log/<id>.md` solo le più recenti. Il contratto di interrogazione
(`grep -h "^## \[" log/*.md | sort -r`) resta valido sui soli file attivi: se
serve la cronologia intera di un'identità, si include esplicitamente anche il
suo archivio.

**Quale identità scrive.** Il file di log risponde a *chi ha deciso*, quindi è
sempre quello dell'**umano** che ha eseguito e approvato l'operazione — non
dell'agente che ha materialmente scritto le pagine. Quello sta in `authored_by`
(§3.1). Un agente ha un `log/<id>.md` proprio solo quando gira in autonomia con
credenziali sue.

Se non riesci a stabilire quale identità sia attiva, **chiedi**. Non scegliere un
id plausibile e non scrivere in un file di log che potrebbe non essere il tuo.

`log.md` alla radice del bundle sopravvive come **indice dei log**: elenca i file
di `log/` e non contiene voci. Non scriverci mai una voce di operazione.

---

## 9. Divieti

Non fare mai queste cose, nemmeno se sembrano utili:

1. Scrivere o modificare qualsiasi cosa dentro `raw/`.
2. Creare link o `refs` fra progetti diversi: se serve in due posti, si duplica.
3. Aprire un documento-concetto di un bundle non attivo. Gli `index.md` sono
   l'unica cosa leggibile oltre il confine.
4. Promuovere di iniziativa un concetto in `_global/`, o proporre azioni sulle
   sovrapposizioni rilevate: si segnala e ci si ferma.
5. Introdurre un `type` non enumerato in `_meta/schema.md`.
6. Trattare un file in `_TEMPLATES/` come configurazione attiva. I template si
   copiano e si compilano; non si applicano e non si consultano durante il
   lavoro ordinario. L'unico schema valido è quello del progetto attivo.
7. Ingerire una fonte senza la fase di dry run di §5.1.
8. Rispondere a una query sintetizzando da materiale a bassa rilevanza invece di
   dichiarare che la wiki non copre l'argomento.
9. Archiviare come pagina una risposta non fondata su fonti del progetto.
10. Riscrivere una pagina intera quando basta modificare un paragrafo.
11. Cancellare contenuto perché contraddetto: si marca `deprecated`, non si toglie.
12. Creare link a pagine inesistenti.
13. Scrivere in un campo `description` informazione che non può uscire dal bundle.
14. Aggiornare `index.md` o il log "dopo, tutti insieme": si aggiornano nella
    stessa operazione che li ha resi obsoleti.
15. Scrivere in un `log/<id>.md` che non è dell'identità attiva, o inventare un
    id quando non riesci a stabilire chi sta lavorando: si chiede.
16. Marcare `status: reviewed` senza un `reviewed_by`, o firmare come revisore di
    un contenuto che hai prodotto tu.
17. Risolvere a mano un conflitto Git dentro un `index.md`: è derivato, si
    rigenera (§7).
18. Proporre un bundle separato come misura di riservatezza: l'isolamento è
    metodo, non sicurezza (§1.2). Serve un repository separato.
19. Eseguire `git pull` senza `--ff-only`, o fondere fuori dal passo finale di
    `/pubblica`. Un merge automatico su pagine di contenuto è la stessa cosa che
    il §5.1 vieta all'agente, fatta da Git.
20. Pubblicare quando `L ∩ R` non è vuoto senza una risposta esplicita
    dell'utente, o proporgli di sovrascrivere il lavoro dell'altra identità.
21. Usare `--force`, `--amend`, `reset`, `checkout` o `rebase` su questo
    repository. Se una situazione sembra richiederli, è il segnale di fermarsi e
    chiedere, non di allargare l'elenco dei comandi. Lo `stash` è ammesso in una
    sola forma, quella di §12.1: mai a mano, mai fuori da `vault_sync`.
22. Scartare uno stash. `git stash drop` e `git stash clear` sono decisioni
    dell'utente: uno stash scartato non è recuperabile da nessuna parte, quindi
    la sua distruzione non è delegabile.
23. Rimuovere un `.git/index.lock` senza aver prima chiesto all'utente se ha
    un'operazione git in corso. Un lock può essere legittimo, e toglierlo mentre
    un altro processo lo tiene in mano corrompe l'indice.

---

## 10. Nota sulla versione OKF

`okf_version` negli `index.md` di radice deve corrispondere alla versione della
spec che stai effettivamente seguendo. Verificala su
`GoogleCloudPlatform/knowledge-catalog` → `okf/SPEC.md` e allinea questo file se
la spec cambia i campi riservati o le convenzioni sui nomi file riservati.

`_TEMPLATES/schema.template.md` non ha un campo `okf_version` da allineare: quel
campo vive solo nel frontmatter dell'`index.md` di radice di ogni bundle (lo
scrive `/nuovo-progetto` al passo 5, leggendo il valore da qui). I bundle già
esistenti non si aggiornano da soli quando questo riferimento cambia: il
controllo di conformità del lint (§5.3 punto 2) segnala quando il loro
`okf_version` diverge da questo riferimento; l'allineamento resta una decisione
dell'utente, bundle per bundle.

Riferimento corrente: **v0.2**.

---

## 11. Storico della costituzione

Le voci fino al 2026-08-06 sono **ereditate dal vault d'origine** da cui questo
template è stato estratto. Non descrivono lavoro fatto in questo vault: sono qui
perché documentano *perché* certe regole sono scritte come sono, e cancellarle
renderebbe alcune scelte inspiegabili. Le voci successive appartengono a questo
vault e le aggiungi tu quando modifichi la costituzione.

| Data | Modifica |
|---|---|
| 2026-08-03 | Passaggio a vault condiviso fra più identità: §1.2 (isolamento = metodo), `authored_by`/`reviewed_by` in §3.1, `raw/` versionato in §3.4, tre controlli di lint in §5.3, conflitti sugli `index.md` in §7, log per identità in §8. |
| 2026-08-04 | Sincronizzazione esplicita: comando `/pubblica` (§5.5) e ciclo completo (§5.6); Fase A.1 di risincronizzazione in §5.1; `--ff-only` come unica forma di pull ammessa, merge solo dentro `/pubblica`; controllo 14 sulle fusioni silenziose in §5.3; divieti 19–21. |
| 2026-08-05 | Chiusura di quattro difetti strutturali rilevati in analisi: controllo di lint su `refs`/`derived_from` inesistenti (§5.3 punto 5) e su drift di `okf_version` (§5.3 punto 2); verifica del merge driver locale in `/progetto` e in `/pubblica` (§7); convenzione di archiviazione manuale per `log/<id>.md` oltre le ~50 voci (§8); sincronizzazione di `_TEMPLATES/schema.template.md` con `okf_version` (§10). |
| 2026-08-05 | Seconda passata di correzione: rimossa la sincronizzazione col template proposta la stessa mattina — `_TEMPLATES/schema.template.md` non ha campo `okf_version` (§10); aggiunto alla checklist di §5.3 il controllo "Igiene degli index" (punto 10, già presente nella skill `/lint` ma mai in questo file), con conseguente rinumerazione dei punti 10–14 in 11–15 e correzione del rimando "controlli 11–13" in "12–14". |
| 2026-08-17 | Le operazioni git passano da un server MCP locale (§12), che rende meccanico l'elenco dei comandi ammessi. Deroga a §9.21 per lo `stash` dentro `vault_sync`, subordinata alla guardia sulla riapplicazione (§12.1); nuovi divieti 22 (non si scarta uno stash) e 23 (non si rimuove un `index.lock` senza chiedere); rimedio esplicito al lock abbandonato (§12.2). Riscritte di conseguenza le skill `progetto`, `ingest` e `pubblica`. L'occasione: in Cowork la shell dell'agente gira su un montaggio che nega l'unlink dei file, quindi nessun fast-forward poteva completarsi. |
| 2026-08-06 | Rimossa la convenzione di nome per i file di `raw/` (§3.4): i file si tengono col nome con cui arrivano. Il vincolo era stato scritto il 2026-08-03 e non era mai stato rispettato dall'unico file allora presente. Restano invariate le convenzioni sui nomi delle pagine `sources/` (§5.1, §6) e sul prefisso delle voci di log (§8), che sono cose diverse. |

---

## 12. Il server MCP del vault

Le operazioni git di questo vault si eseguono attraverso il server MCP in
`tools/vault-mcp/`, non con comandi a mano. Espone cinque tool: `vault_status`,
`vault_sync`, `vault_publish`, `vault_unlock`, `vault_stash_list`.

**Il server è l'elenco dei comandi ammessi, reso meccanico.** Fino a qui quegli
elenchi erano prosa in cima a ogni skill: un agente li rispetta se li legge bene.
Dentro il server, ciò che non è una tool non è raggiungibile — `--force`,
`--amend`, `reset`, `checkout`, `rebase`, `stash drop` non sono implementati,
quindi non esistono. La disciplina di §9 resta scritta qui perché spiega il
*perché*; il server ne impedisce la violazione.

Il server viaggia col plugin, quindi le tool possono avere un nome scopato
(`mcp__plugin_asernet-wiki_vault__vault_sync`) oppure il nome della
configurazione locale (`mcp__vault-asernet__vault_sync`). **Le skill le citano
sempre per nome corto**, altrimenti funzionano su una macchina e non sull'altra.

Il server trova il vault in quest'ordine: `VAULT_PATH` se impostata, poi
risalendo da `CLAUDE_PROJECT_DIR`, poi dalla cartella di lavoro, cercando il
primo livello che contenga sia `.git` sia `CLAUDE.md`.

**`version` in `plugin.json` va incrementato a ogni modifica delle skill o del
server. Non rimuoverlo.** La documentazione di Claude Code elenca il commit SHA
come versione di ripiego per le marketplace ospitate su Git, il che suggerisce
che il campo sia superfluo. **In Cowork non funziona così**: verificato il
2026-08-06 e di nuovo il 2026-08-17, senza `version` il push arriva su GitHub e
il pulsante *Aggiorna* resta disattivato, senza alcun messaggio. Chi legge la
documentazione e «corregge» questa scelta rompe la distribuzione in un modo
silenzioso, che è il peggiore.

Il difetto di questo schema è reale e va tenuto a mente: una modifica pubblicata
senza incremento non raggiunge nessuno, e le altre identità restano su un metodo
superato credendo di avere l'ultimo — lo stesso difetto che il pull obbligatorio
di §5.6 esiste per impedire. Non essendoci un modo automatico, l'incremento fa
parte dell'operazione: se `/pubblica` include un file di `.claude/skills/` o di
`tools/`, include anche `plugin.json`.

**Se le tool non sono disponibili** — server non installato, plugin non
aggiornato, processo morto — le skill non tornano a scrivere a mano: restano in
sola lettura e **passano all'utente i comandi da lanciare**. Un vault senza
server è un vault in cui l'agente legge e propone; non uno in cui improvvisa.

### 12.1 Lo `stash` dentro `vault_sync`

`vault_sync` fa `git pull --ff-only`. Se il working tree è d'ostacolo — file non
tracciati che il fast-forward sovrascriverebbe — mette via **i soli file
bloccanti** con `git stash push -u`, rifà il fast-forward, e poi si ferma a
pensare prima di riapplicarli.

La deroga a §9.21 vale solo grazie a quella pausa. Un auto-stash come lo fa
GitHub Desktop riapplica sempre, e il `pop` **fonde** le modifiche sul nuovo
albero: su una pagina di contenuto è una fusione automatica senza nessuno che
guardi, cioè ciò che §9.19 vieta. Desktop può permetterselo perché ha una persona
davanti a una GUI; un agente no.

Quindi la guardia: prima del `pop`, confronta i file messi via con quelli che il
pull ha portato, escludendo `index.md` e `log/`.

- **Non si intersecano** → `pop`. Le tue modifiche tornano al loro posto.
- **Si intersecano** → **nessun `pop`**. Lo stash resta intatto e il referto dice,
  per ogni file, se la copia locale è identica a quella arrivata (duplicato) o
  diversa (contenuto che il remoto non ha). La decisione torna all'utente, con le
  stesse opzioni di §5.5: rifare il dry run, integrare a mano, registrare una
  contraddizione.

Un vault aggiornato con del lavoro parcheggiato in uno stash è uno stato
legittimo ma **invisibile**: va dichiarato in modo esplicito a fine operazione,
altrimenti la prossima scrittura avviene su un disco che non contiene tutto
quello che si crede.

### 12.2 Il lock dell'indice

Un `.git/index.lock` abbandonato — lasciato da un processo git morto a metà —
blocca ogni scrittura sull'indice, quindi `vault_publish` non parte nemmeno. Ha
un rimedio, `vault_unlock`, e tre cautele che non sono negoziabili:

1. **si chiede prima all'utente** se ha un'operazione git in corso, perché in
   quel caso il lock è legittimo (§9.23);
2. la tool rifiuta i lock più giovani di 60 secondi;
3. non cancella: **rinomina**. Un lock spostato non è più visto da Git ma resta
   sul disco, e se si scopre di aver sbagliato si rimette a posto.
