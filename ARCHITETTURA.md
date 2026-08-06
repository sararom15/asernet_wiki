# ARCHITETTURA.md — Come è fatto questo vault

Questo documento spiega **come è costruita** la knowledge base: quali pezzi la
compongono, che rapporto hanno fra loro e perché sono stati messi così.

**Non è normativo.** Le regole stanno in [`CLAUDE.md`](CLAUDE.md), che è la
costituzione del vault, e negli `_meta/schema.md` dei singoli progetti. Se questo
documento e `CLAUDE.md` dicessero cose diverse, ha ragione `CLAUDE.md`: qui si
descrive, lì si prescrive. Ogni sezione rimanda al paragrafo corrispondente della
costituzione, che resta l'unico testo da seguire quando si lavora.

Serve a tre cose: far capire l'impianto a chi arriva, dare una mappa a chi ci
lavora già, e permettere di presentarlo a chi deve valutarlo senza fargli leggere
`CLAUDE.md` riga per riga.

---

## 1. Il problema che risolve

Una knowledge base condivisa fallisce quasi sempre per lo stesso motivo: nessuno
sa più da dove viene un'affermazione. Le pagine si accumulano, qualcuno le
modifica, e dopo sei mesi non è possibile distinguere ciò che una fonte dice
davvero da ciò che qualcuno ha dedotto, ricordato male o inventato. A quel punto
la wiki va creduta sulla parola, ed è inutile proprio quando servirebbe di più.

Questo vault è progettato attorno a un solo requisito: **ogni affermazione deve
essere risalibile alla fonte che la giustifica, e a chi l'ha scritta.**

Tutto il resto — l'isolamento fra progetti, il dry run prima di scrivere, la
soglia di astensione, i campi di attribuzione — discende da lì.

Il formato di riferimento è **OKF v0.2** (Open Knowledge Format), una convenzione
per rendere leggibile a una macchina un insieme di documenti markdown senza
toglierlo dalle mani di un umano.

---

## 2. I quattro livelli

L'architettura si legge dall'esterno verso l'interno. Ogni livello ha una regola
propria che non vale per gli altri.

```
REPOSITORY  ──  un repo Git = un perimetro di accesso
   └── VAULT   ──  ciò che vale per tutti i progetti
        └── BUNDLE  ──  un progetto = un dominio autonomo
             └── PAGINA  ──  un'unità di conoscenza
```

| Livello | Cos'è | Regola caratteristica |
|---|---|---|
| Repository | Un repo Git su GitHub | Chi lo clona vede tutto: è il confine di riservatezza |
| Vault | La radice del repo | Contiene le regole comuni e il registro delle identità |
| Bundle | Una cartella sotto `projects/` | Non comunica con gli altri bundle |
| Pagina | Un file `.md` con frontmatter | Dichiara tipo, provenienza, stato e autore |

---

## 3. Il vault

```
vault/
├── CLAUDE.md              ← la costituzione: le regole
├── AGENTS.md              ← puntatore a CLAUDE.md, non una copia
├── ARCHITETTURA.md        ← questo file: la mappa
├── .claude/skills/        ← i cinque comandi
├── _meta/authors.md       ← registro delle identità che scrivono
├── _TEMPLATES/            ← moduli in bianco, mai configurazione attiva
├── _global/               ← bundle trasversale, raro e opt-in
└── projects/<slug>/       ← un bundle per progetto
```

Tre cose valgono per tutto il vault e non stanno dentro nessun progetto: le
regole (`CLAUDE.md`), i comandi (`.claude/skills/`) e le identità
(`_meta/authors.md`). Il motivo è lo stesso per tutte e tre: **le persone e le
procedure attraversano i progetti, la conoscenza no.**

`_TEMPLATES/` contiene moduli in bianco. Non è configurazione: si copiano quando
si crea un progetto e da quel momento non si consultano più
([`CLAUDE.md`](CLAUDE.md) §9.6). Un template non ha mai effetto sul lavoro
ordinario.

---

## 4. Il bundle

Un bundle è un progetto. È l'unità di isolamento dell'intera architettura.

```
projects/<slug>/
├── index.md          ← la mappa del bundle (dichiara okf_version)
├── log.md            ← indice dei log per identità
├── log/<id>.md       ← storico append-only, uno per persona
├── _meta/
│   ├── schema.md     ← il metodo DI QUESTO progetto
│   └── glossary.md   ← nomi canonici e alias
├── raw/              ← le fonti, immutabili
└── <sezioni>/        ← le pagine, una cartella per type
```

Le sezioni di default sono `sources/`, `entities/`, `concepts/`, `decisions/`,
`syntheses/`. **Ogni progetto può ridefinirle interamente** nel proprio
`_meta/schema.md`, che su tassonomia e metodo ha precedenza su `CLAUDE.md`
([§4](CLAUDE.md)). Un bundle che documenta un sistema software, per esempio,
potrebbe aggiungere `modules/`, `requirements/` e `processes/`; uno che
documenta un adempimento normativo, `obblighi/` e `scadenze/`.

### 4.1 I due layer: `raw` e `wiki`

Dentro un bundle convivono due strati con statuti opposti.

| | `raw/` | tutto il resto |
|---|---|---|
| Contenuto | I file originali: PDF, docx, trascrizioni, note | Pagine markdown scritte dal manutentore |
| Chi scrive | Solo l'utente | Solo l'agente, e solo dopo approvazione |
| Modificabile | **Mai** | Sì, chirurgicamente |
| Frontmatter | No | Sì, obbligatorio |
| Negli `index.md` | No | Sì |

`raw/` è **versionato in Git** ([§3.4](CLAUDE.md)). Non è una scelta di comodità:
se le fonti non viaggiano col vault, chi lo clona trova pagine il cui
`derived_from` punta a file che non possiede, e non può verificare niente. Una
wiki con le fonti fuori è una wiki da credere sulla parola.

Al tempo stesso `raw/` è **escluso dalla lettura ordinaria**: si apre solo
durante l'ingest del file specifico, o su richiesta esplicita. È un archivio di
verifica, non materiale da consultare. Al suo posto si cita sempre la pagina in
`sources/` che lo sintetizza.

### 4.2 L'isolamento fra bundle

**È la regola più importante del vault** ([§1](CLAUDE.md)). Due progetti non
condividono né conoscenza né metodo:

- una sessione lavora su **un solo progetto alla volta**;
- non si aprono le pagine di un bundle non attivo, per nessuna ragione;
- non esistono link fra bundle: se una conoscenza serve in due progetti **si
  duplica**, e da quel momento le due copie evolvono separatamente;
- non si riusano terminologia, convenzioni o template di un progetto in un altro.

L'unica superficie visibile attraverso il confine sono gli `index.md`, che per
costruzione contengono solo titoli, descrizioni di una riga, date e stato
([§1.1](CLAUDE.md)). Da questo discende un vincolo di scrittura: il campo
`description` non deve contenere niente che non possa uscire dal bundle.

**L'isolamento è metodo, non sicurezza** ([§1.2](CLAUDE.md)). Il vault vive in un
unico repository Git, e Git non ha permessi di lettura parziali: chiunque possa
clonare vede tutti i bundle e tutta la loro cronologia. Le regole di isolamento
vincolano *chi scrive*, non chi ha accesso al disco. Servono a impedire che una
convenzione o un'inferenza migrino dove non hanno fondamento.

Il corollario è operativo e va detto subito a chiunque proponga il contrario: se
un materiale non deve essere leggibile da una delle persone con accesso al
repository, **serve un repository separato**, non un bundle separato.

### 4.3 `_global/`

Un bundle a sé, per la conoscenza che vale davvero ovunque. I progetti possono
linkarlo; lui non linka mai i progetti. Ci si sposta un concetto **solo su
richiesta esplicita dell'utente**: la promozione non è mai un'iniziativa
dell'agente ([§9.4](CLAUDE.md)).

È previsto ma raro. Nel dubbio, si duplica.

---

## 5. La pagina

Ogni pagina è un file markdown UTF-8 in `kebab-case.md`, che si apre con un
blocco YAML e prosegue con un corpo strutturato.

### 5.1 Il frontmatter

```yaml
---
type: Concept                  # OBBLIGATORIO — valori dallo schema del progetto
title: Nome canonico           # coincide con l'H1
description: Una sola frase.   # alimenta gli index.md
tags: [tag-a, tag-b]
timestamp: 2026-08-03T14:30:00+02:00

project: <slug>                # guardia anti-cross-project
status: draft | reviewed | stale | deprecated
confidence: high | medium | low
derived_from: [raw/2026-07-26-fonte.docx]
refs: [concepts/x.md, sources/y.md]
authored_by: <id-agente>       # chi ha PRODOTTO il testo
reviewed_by: <id-umano>        # chi lo ha VALIDATO
---
```

Il solo campo obbligatorio per OKF è `type`. Tutto il blocco sotto la riga vuota
è **estensione locale**: chiavi definite da noi, ammesse dalla spec, che servono
a tre funzioni diverse.

| Funzione | Campi | A cosa serve |
|---|---|---|
| Provenienza | `derived_from`, `refs` | Da dove viene ciò che la pagina afferma |
| Affidabilità | `status`, `confidence` | Quanto ci si può contare |
| Responsabilità | `authored_by`, `reviewed_by` | Chi risponde di cosa |

`project:` è una ridondanza deliberata: ripete l'informazione già contenuta nel
percorso della cartella, così che un file finito nel bundle sbagliato sia
rilevabile con un `grep` invece che con una lettura.

### 5.2 Il corpo

```markdown
# Nome canonico

Una o due frasi di definizione, autoconsistenti.

## Sintesi
## Dettaglio            ← sottosezioni definite dal type nello schema
## Contraddizioni aperte ← solo se presenti; ogni voce cita le due fonti
## Fonti
```

Le sezioni obbligatorie **dipendono dal `type`** e sono elencate nello schema del
progetto. Uno schema può per esempio prescrivere che una `Decision` abbia
Contesto, Decisione, Alternative, Conseguenze e Fonti: la sezione «Alternative»
esiste perché una decisione senza alternative scartate non è una decisione, è
una constatazione.

Vincoli di scrittura ([§6](CLAUDE.md)): markdown strutturale invece di prosa
libera, ~400 parole per pagina come soglia oltre la quale si propone la
scissione, voce dichiarativa senza hedging — l'incertezza si esprime con
`confidence`, non con giri di parole.

### 5.3 I due grafi

Questa è la distinzione che più spesso viene fraintesa. Una pagina partecipa a
**due reti diverse**, e i campi che le rappresentano non sono intercambiabili.

| | Link inline `[testo](../sez/pagina.md)` | `refs:` nel frontmatter |
|---|---|---|
| Cos'è | Il grafo **semantico**: cosa c'entra con cosa | Il grafo di **dipendenza**: cosa poggia su cosa |
| Definito da | La spec OKF | Estensione nostra |
| Serve a | Navigare, e alla graph view di Obsidian | Calcolare lo staleness |
| Regola | Si linka la prima occorrenza, non tutte | Elenca le pagine che, se cambiano, invalidano questa |

`refs` **non sostituisce i link inline** e non è un campo OKF ([§3.2](CLAUDE.md)).

Due vincoli sui link: **niente wikilink `[[...]]`** — Obsidian va configurato con
*Files and links → Use Wikilinks: off*, ed è esattamente ciò che impone
`.obsidian/app.json`, l'unico file di configurazione versionato — e **niente link
a pagine inesistenti**: se una pagina manca si apre una voce nella sezione `Gap`
dell'`index.md`, non un link rotto che qualcuno riempirà un giorno.

---

## 6. Gli `index.md`

Un `index.md` per directory. Non hanno frontmatter, con una sola eccezione:
quello alla radice del bundle, dove va dichiarato `okf_version`.

**Sono file derivati.** Il loro contenuto si rigenera dal frontmatter delle
pagine; non si scrivono a mano e non si lasciano divergere ([§7](CLAUDE.md)).

Il motivo è che sono **la prima cosa che si legge**. Ogni operazione parte dagli
index: l'ingest li consulta per sapere cosa esiste già, la query li consulta per
decidere quali pagine aprire. Se un index mente, tutto ciò che segue è
compromesso — e il modo più insidioso è per omissione: una pagina che esiste ma
non è indicizzata è una pagina che l'agente dichiarerà inesistente.

L'`index.md` di radice contiene anche due sezioni che non sono derivate e che
sono il vero valore del formato:

- **Domande aperte** — ciò che il progetto non ha ancora deciso;
- **Gap** — concetti citati dalle fonti che non hanno ancora una pagina.

Sono il posto dove la wiki dichiara i propri buchi invece di nasconderli.

### 6.1 Perché i conflitti Git sugli index non si risolvono a mano

Un file derivato non ha una versione «corretta» in nessuno dei due rami del
merge: quella corretta sta nel frontmatter delle pagine. Quindi si accetta una
delle due versioni a caso e si rigenera con `/lint`.

Il `.gitattributes` dichiara `**/index.md merge=ours`, che automatizza la scelta.
Perché abbia effetto serve però `git config merge.ours.driver true` **su ogni
macchina**: è configurazione locale e non viaggia col repository. Se compaiono
marcatori di conflitto dentro un `index.md`, quella configurazione manca da
qualche parte.

`/progetto` la verifica all'apertura di sessione e `/pubblica` la riverifica
subito prima del passo di merge — l'unico punto in cui la sua assenza produce
danno reale. Nessuna delle due la imposta: solo la segnalano.

---

## 7. Le identità

Il vault è condiviso. Tre domande diverse — *chi ha scritto*, *chi ha
controllato*, *chi ha deciso* — hanno tre risposte diverse, e l'architettura si
rifiuta di collassarle in una sola.

| Domanda | Dove sta la risposta |
|---|---|
| Chi ha **prodotto il testo**? | `authored_by` nel frontmatter |
| Chi lo ha **validato**? | `reviewed_by` nel frontmatter |
| Chi ha **deciso ed eseguito** l'operazione? | Il file `log/<id>.md` in cui è scritta |

Gli `id` ammessi sono quelli registrati in [`_meta/authors.md`](_meta/authors.md),
in `kebab-case` e stabili nel tempo: cambiano nome ed email, non l'id. Ogni
identità ha un **tipo**, `human` o `agent`, e da quel tipo discendono regole.

**Se il testo l'ha scritto un LLM, `authored_by` è l'id dell'agente** — anche
quando un umano ha letto, approvato e si assume la responsabilità del risultato.
Non è un campo di merito: è tracciabilità della provenienza. Attribuire a una
persona una pagina scritta da una macchina è più comodo e falso, ed è esattamente
l'errore che il campo esiste per prevenire.

Da questo discende il vincolo più netto dell'intero impianto: **un agente non può
validare il proprio lavoro.** `authored_by` e `reviewed_by` uguali, con un id di
tipo `agent`, sono un errore bloccante di lint. È la forma meccanica del
principio per cui il contenuto prodotto da un LLM richiede validazione umana.

### 7.1 Il registro e le pagine `Entity` sono spazi di nomi distinti

Che una persona abbia un `id` in `_meta/authors.md` e che esista una pagina
`entities/nome.md` con lo stesso nome proprio sono **due fatti indipendenti**
([§3.1](CLAUDE.md)).

- Un `id` identifica *chi scrive nel vault*: vale a livello di vault, attraversa
  i progetti, compare solo in `authored_by`, `reviewed_by` e nei nomi dei log.
- Una pagina `Entity` identifica *un soggetto documentato da una fonte*: vale
  dentro un solo bundle, ha `derived_from`, e dice ciò che le fonti affermano.

La coincidenza di nome non è un duplicato e non va sanata. Il controllo di lint
sui duplicati opera dentro un bundle e non deve mai confrontare `entities/` con
il registro.

### 7.2 Un file di log per identità

I log sono append-only, **più recente in cima**, uno per persona: `log/<id>.md`.

La separazione non è organizzativa, è tecnica. Un unico `log.md` per bundle era
lo scenario peggiore possibile per Git: due persone che aggiungono una voce in
cima allo stesso file producono un conflitto sulla stessa riga a ogni singola
operazione. Con un file per identità, due autori che lavorano in parallelo non si
toccano mai.

Il prezzo è che l'ordine cronologico globale non è più dato dal file, ma va
ricostruito. Da qui il formato vincolante del titolo di ogni voce —
`## [YYYY-MM-DD] <operazione> | <oggetto>` — e il contratto di interrogazione:

```bash
grep -h "^## \[" log/*.md | sort -r | head -20
```

Il `sort -r` non è decorativo: senza, si ottengono i primi N di *ciascun* file
invece dei più recenti in assoluto.

Il file non ha un limite di crescita: è append-only e nessuna skill lo pota da
sola. Oltre le ~50 voci, l'archiviazione a mano delle più vecchie in
`log/<id>-archivio.md` è la convenzione prevista (CLAUDE.md §8) — un'operazione
manuale, mai automatica.

`log.md` alla radice del bundle sopravvive come **indice** dei log: elenca i file
e non contiene mai voci di operazione.

**Nel log scrive l'umano.** Il log risponde a *chi ha deciso*, quindi porta l'id
della persona che ha eseguito e approvato l'operazione, non dell'agente che ha
materialmente scritto le pagine — quello sta in `authored_by`. Un agente ha un
log proprio solo quando gira in autonomia con credenziali sue.

---

## 8. Le operazioni

Sei comandi, esposti come skill in `.claude/skills/`. Le skill sono la
superficie d'uso; le regole restano in `CLAUDE.md`.

| Comando | Cosa fa | Scrive? | Si ferma? |
|---|---|---|---|
| `/progetto [slug]` | Sincronizza il vault, imposta il progetto attivo, carica lo schema | solo sync | sì, se ci sono commit non pubblicati |
| `/ingest <file>` | Ingerisce una fonte da `raw/` | sì | **sì**, dopo il dry run |
| `/chiedi <domanda>` | Interroga la wiki citando le pagine | no | — |
| `/lint [controllo]` | Health check del bundle, produce un report | solo rotture meccaniche | sì, non applica nulla |
| `/pubblica` | Verifica le sovrapposizioni, poi committa e spinge | sì, su Git | **sì**, se rileva una sovrapposizione |
| `/nuovo-progetto <slug>` | Crea il bundle e intervista per lo schema | sì | sì, una domanda alla volta |

`/ingest`, `/lint`, `/pubblica` e `/nuovo-progetto` sono a invocazione manuale
(`disable-model-invocation: true`): non partono mai da sole, perché hanno effetti
collaterali sui file.

### 8.1 `/progetto` — la precondizione

Va lanciato per primo in ogni sessione. Fa tre cose: `git pull`, imposta il
progetto attivo, e stabilisce **l'identità attiva** confrontando l'email di
configurazione Git con il registro — senza la quale `/ingest` e `/lint` non
saprebbero in quale log scrivere.

Il pull non è igiene di sincronizzazione, **è una precondizione di correttezza**.
Su un vault non aggiornato l'agente non sa che certe pagine esistono, quindi
applica la soglia di astensione a un bundle incompleto e dichiara scoperto un
argomento che invece è coperto. Un'astensione sbagliata è peggio di un errore,
perché sembra prudenza.

Il pull è sempre `--ff-only`: o avanza pulito o fallisce, e non può mai produrre
marcatori di conflitto. Se fallisce, non è un problema di rete — è lavoro di
un'operazione precedente mai pubblicato, e la risposta è `/pubblica`.

Quando il pull porta qualcosa, `/progetto` riporta anche **cosa è cambiato da
quando eri qui l'ultima volta**: le pagine di contenuto arrivate, chi le ha
scritte e la voce in cima al suo log. Serve soprattutto a chi apre una sessione
per interrogare la wiki, che non passerà da nessun altro controllo.

### 8.2 `/ingest` — le due fasi

È l'unica operazione che aggiunge conoscenza, ed è divisa in due per costruzione
([§5.1](CLAUDE.md)).

**Fase A — dry run, nessuna scrittura.** L'agente legge la fonte e gli
`index.md`, poi presenta: i takeaway della fonte, le pagine che creerebbe con il
loro `type` e la motivazione, le pagine che modificherebbe con una riga ciascuna,
le contraddizioni rilevate rispetto a quanto già scritto, le entità nuove non
ancora nel glossario. **Poi si ferma.**

**Fase A.1 — risincronizza.** Dopo l'approvazione e prima di toccare un file, un
altro `git pull --ff-only`. Se il dry run è durato mezz'ora, il piano appena
approvato è stato calcolato su un indice vecchio di mezz'ora. Se sono arrivate
pagine che il piano tocca — o pagine nuove che avrebbero cambiato il piano — si
ferma e chiede.

L'asimmetria che giustifica questo passo: **prima di scrivere, rifare il dry run
costa un minuto; dopo la pubblicazione, lo stesso problema non si ricalcola più —
si registra come contraddizione e resta sulla pagina.** Lo stesso controllo,
spostato trenta secondi prima, cambia di categoria.

**Fase B — scrittura, solo dopo approvazione.** Crea la pagina in `sources/`,
applica *solo* le modifiche approvate in modo chirurgico, aggiorna `refs`, gli
`index.md` toccati e il log — nella stessa operazione, mai «dopo, tutti insieme».

La regola di decisione fra creare e modificare è semplice: **pagina nuova** se è
un'entità o un concetto distinto che si linkerebbe da altrove; **modifica in
place** se è un attributo, un aggiornamento o una sfumatura di qualcosa che già
esiste. Nel dubbio si modifica in place e lo si segnala.

**Le contraddizioni non si risolvono.** Non si cancella la versione vecchia: si
registra il conflitto in una sezione `## Contraddizioni aperte` sulla pagina,
citando entrambe le fonti con la data, e lo si segnala nel log. Un contenuto
contraddetto si marca `deprecated`, non si toglie.

### 8.3 `/chiedi` — la soglia di astensione

È la regola che definisce il valore dell'intero sistema, e non è derogabile
nemmeno dallo schema di un progetto ([§5.2](CLAUDE.md)).

Se le pagine trovate non contengono una risposta, la risposta corretta è
dichiararlo:

> La wiki di `<slug>` non contiene una risposta affidabile a questa domanda.

seguita da cosa manca e quale fonte servirebbe per colmare il gap. Non si
sintetizza da match a bassa rilevanza, non si integra con conoscenza generale del
mondo senza dichiararlo separatamente, e una risposta di questo tipo non viene
mai archiviata come pagina.

Ogni progetto può aggiungere **regole di astensione locali** nel proprio schema:
un elenco di argomenti su cui il bundle non risponde, e le distinzioni che non
deve mai collassare — per esempio fra come una cosa è *progettata* e come si
comporta *in esercizio*.

Se invece una risposta è ben fondata e ha valore duraturo, l'agente **propone**
di archiviarla in `syntheses/`. Propone: non archivia di iniziativa.

### 8.4 `/lint` — il controllo di salute

Produce un report ordinato per gravità e si ferma. Non modifica contenuto: può
correggere solo rotture meccaniche — link morti verso file rinominati, `index.md`
disallineati — mai affermazioni.

I quindici controlli standard coprono sei famiglie:

| Famiglia | Cosa verifica |
|---|---|
| Isolamento | Link e `refs` che escono dal bundle; `project:` incoerente con la cartella |
| Conformità | Frontmatter assente; `type` non nello schema; `title` diverso dall'H1; `okf_version` diverso dal riferimento di `CLAUDE.md` §10 |
| Salute del grafo | Staleness via `refs`, orfani, link morti (inclusi i path spenti in `refs`/`derived_from`), duplicati, gap |
| Identità | Id non registrati; `reviewed` senza revisore; **autovalidazione di un agente** |
| Cronologia | **Fusioni silenziose**: pagine che Git ha unito da due rami senza conflitto |
| Igiene | `description` oltre 120 caratteri e index disallineati dal frontmatter; contraddizioni aperte da oltre 30 giorni; deriva stilistica |

Il controllo sulle **fusioni silenziose** è l'unico che non guarda i file ma la
cronologia di Git, perché è l'unico posto dove quel problema lascia traccia: nel
file non resta niente, il frontmatter è a posto e i link risolvono. Segnala che
una pagina è stata fusa e che nessuno l'ha riletta da allora — senza aprirla per
giudicare, perché stabilire se due affermazioni si contraddicono è la decisione
che il vault riserva a un umano.

A questi ogni progetto aggiunge i propri, elencati nel suo schema. Sono controlli
del tipo: ogni `Decision` ha almeno una `Source` fra le `refs`; ogni pagina la cui
unica provenienza è una conversazione con un'AI porta `confidence: low`.
Quest'ultimo è la controparte meccanica di una regola di astensione — dove una
regola epistemica può essere verificata da un `grep`, lo si fa.

Il controllo sulle **sovrapposizioni fra bundle** merita una nota, perché
concilia due regole che sembrano incompatibili: bisogna accorgersi che due
progetti stanno accumulando materiale simile, senza poter guardare dentro il
progetto non attivo. La soluzione è confrontare **solo i titoli negli
`index.md`**. È volutamente grossolano e produce falsi positivi: va bene, perché
l'output è una segnalazione all'utente, mai un'azione.

### 8.5 `/pubblica` — la chiusura dell'operazione

Porta il lavoro da «scritto sul disco» a «visibile agli altri autori». Non scrive
contenuto: quello l'ha già fatto l'operazione.

Il meccanismo è un'intersezione fra due insiemi. **L** sono i file che hai toccato
e non ancora pubblicato; **R** quelli cambiati su remoto dall'antenato comune.
Se `L ∩ R` è vuoto pubblica; altrimenti si ferma e chiede. Dal conto si escludono
`index.md` e `log/`, che ogni operazione tocca: contarli farebbe scattare
l'allarme sempre, e un allarme che scatta sempre si impara a ignorare.

Prima ancora, confronta L con l'elenco della voce in cima al log. Se non
coincidono, si ferma: è il controllo che rende `/pubblica` una skill invece di un
hook Git. Un hook pubblica ciò che trova; qui si verifica che quello che stai per
pubblicare sia *l'operazione che dici di aver fatto*.

**Il caso pericoloso non è il conflitto.** Se due persone toccano le stesse righe,
Git si ferma da solo: rumoroso ma visibile. Se toccano righe diverse della stessa
pagina, Git fonde in silenzio, e la pagina può finire per affermare due cose
incompatibili scritte da due persone che non si sono lette — cioè esattamente ciò
che §5.1 vieta all'agente, fatto dal merge testuale. Per questo il controllo è
**per file, non per riga**: un controllo per riga si perderebbe il caso peggiore.

Il report dice, per ogni file: cosa hai cambiato tu, cosa ha cambiato l'altro,
chi è, e la voce in cima al suo log — che dice *cosa credeva di fare*, ed è
l'informazione che serve per decidere. Le opzioni sono quattro: rifare il dry run,
integrare a mano, registrare una contraddizione, rinunciare. **Non c'è «tieni la
mia»**: metterla in un menu la renderebbe la scelta comoda alle 19.

L'allineamento finale usa `merge`, non `rebase`: in un rebase i lati si
invertono e il driver `merge=ours` terrebbe l'`index.md` dell'altro invece del
tuo (§6.1).

### 8.6 `/nuovo-progetto` — l'intervista

Crea lo scheletro, copia `_TEMPLATES/schema.template.md` **in bianco** — mai lo
schema compilato di un altro progetto, che importerebbe la tassonomia di un
dominio estraneo — e poi intervista l'utente sezione per sezione: identità e
domanda guida, cosa conta come fonte, vocabolario dei `type`, granularità, regole
di astensione locali, naming, lint specifico.

Una sezione alla volta, aspettando la risposta. Le sezioni non si riempiono con
valori plausibili: **un campo lasciato `…` è meglio di un campo inventato.**

Alla fine si potano i `type` di default che l'utente non ha confermato, si riporta
il vocabolario e ci si ferma. La prima fonte si ingerisce in una sessione
successiva.

---

## 9. Il ciclo di lavoro

```
/progetto <slug>          ← pull --ff-only, progetto attivo, identità attiva,
      ↓                      cosa è cambiato da quando eri qui
/ingest raw/<file>        ← dry run
      ↓
   [approvi o riduci lo scope]
      ↓
   pull --ff-only         ← il piano approvato vale ancora?
      ↓
   scrittura + index + log
      ↓
/pubblica                 ← verifica L∩R, poi commit, merge e push
      ↓
/chiedi <domanda>         ← in qualunque momento, sul vault sincronizzato
```

**Git è la fonte di verità**, non la cartella locale. Il push sta alla fine di
ogni operazione completata, perché una modifica non spinta è una modifica che
l'altro autore non vede e su cui costruirà un conflitto.

Il pull compare **due volte**, e non è una ridondanza: risponde a due domande
diverse. All'apertura, «su che stato sto ragionando». Prima di scrivere, «quello
stato vale ancora». Fra le due c'è un dry run che può essere durato mezz'ora.

Entrambi sono `--ff-only` e quindi non fondono mai. **Nel vault esiste un solo
punto in cui avviene un vero merge, ed è il passo finale di `/pubblica`** — dove
qualcuno sta guardando, e dove l'intersezione fra i due lavori è già stata
verificata.

I conflitti si trattano in due modi opposti a seconda del file: gli `index.md`
sono derivati e si rigenerano (§6.1); i **conflitti su pagine di contenuto non si
automatizzano mai** e richiedono giudizio umano, per la stessa ragione per cui una
contraddizione fra fonti non si risolve da sola.

Obsidian resta un editor opzionale: utile per la graph view e la lettura, ma non
è dove il vault vive.

---

## 10. Dove è scritto cosa

Quattro testi hanno autorità, in quest'ordine ([§4](CLAUDE.md)):

1. **L'istruzione esplicita dell'utente** nella sessione corrente
2. **`projects/<slug>/_meta/schema.md`** — tassonomia, tipi, metodo del progetto
3. **`CLAUDE.md`** — gli invarianti del vault
4. Le convenzioni generali OKF

Con due eccezioni che nemmeno lo schema di un progetto può derogare:
**l'isolamento fra bundle** (§1) e **la soglia di astensione** (§5.2). Se lo
schema di un progetto le contraddicesse, l'agente lo segnala invece di
obbedirgli.

Questo file non compare nell'elenco: **non ha autorità.**

| Se cerchi… | Guarda in… |
|---|---|
| Una regola da seguire | [`CLAUDE.md`](CLAUDE.md) |
| I `type` validi in un progetto | `projects/<slug>/_meta/schema.md` |
| Come si chiama davvero una cosa | `projects/<slug>/_meta/glossary.md` |
| Chi può scrivere nel vault | [`_meta/authors.md`](_meta/authors.md) |
| Cosa contiene un progetto | `projects/<slug>/index.md` |
| Cosa è successo e quando | `projects/<slug>/log/<id>.md` |
| Cosa fa un comando | `.claude/skills/<nome>/SKILL.md` |
| Perché è fatto così | questo file |

---

## 11. I principi, in breve

Se di tutto questo documento va ricordata una pagina sola, è questa.

1. **Nessuna affermazione senza fonte.** Se non c'è la fonte, l'affermazione non
   entra.
2. **Chi ha scritto, chi ha validato e chi ha deciso sono tre domande diverse.**
   Non si collassano.
3. **Un agente non approva il proprio lavoro.** È un errore bloccante, non una
   raccomandazione.
4. **Non sapere è una risposta.** Dichiarare che la wiki non copre un argomento
   vale più di una sintesi plausibile.
5. **L'isolamento fra progetti è metodo, non sicurezza.** Per la riservatezza
   serve un altro repository.
6. **Se serve in due posti, si duplica.** Un link fra bundle è un errore.
7. **Si scrive dopo aver mostrato cosa si scriverà.** Il dry run non è
   facoltativo.
8. **Le contraddizioni si registrano, non si risolvono.** Il contenuto
   contraddetto si marca `deprecated`, non si cancella.
9. **`raw/` è immutabile.** Si versiona, non si tocca.
10. **Gli `index.md` sono derivati.** Se mentono, ogni operazione successiva è
    compromessa.

---

## 12. Storico

| Data | Modifica |
|---|---|
| 2026-08-04 | Creazione. Descrive l'architettura alla revisione di `CLAUDE.md` del 2026-08-03. |
| 2026-08-05 | Aggiornata alla chiusura di quattro difetti strutturali: link morti estesi a `refs`/`derived_from` e conformità estesa al drift di `okf_version` (§8.4); verifica del merge driver in `/progetto` e `/pubblica` (§6.1); convenzione di archiviazione dei log oltre le ~50 voci (§7.2). |
| 2026-08-05 | Seconda passata: corretto il conteggio dei controlli di lint (da "tredici" a "quindici", il numero di famiglie da "cinque" — già sbagliato dal 2026-08-04 — a "sei" effettive) e aggiunta la famiglia "Igiene degli index" mancante in §8.4; tolto il riferimento a "639 righe" di `CLAUDE.md` in §1, un numero destinato a invecchiare a ogni modifica. |
