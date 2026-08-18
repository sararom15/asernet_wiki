# <VAULT>

Wiki condivisa, conforme allo standard OKF v0.2, gestita da agenti LLM sotto una
costituzione scritta.

Il repository è la fonte di verità. Le pagine sono file markdown con frontmatter;
non c'è un database, un server o un'applicazione. Obsidian è un editor opzionale,
GitHub Desktop è l'interfaccia quotidiana per sincronizzare.

**Le regole stanno in [CLAUDE.md](CLAUDE.md).** Quel file ha sempre la precedenza su
questo README, sulle skill e su qualsiasi altra indicazione. Questo file spiega solo
come partire; non ripete il metodo, perché due copie della stessa regola divergono e
la copia sbagliata è quella che qualcuno legge.

---

## Struttura

```
asernet-wiki/
├── CLAUDE.md              ← la costituzione: leggila per prima
├── ARCHITETTURA.md        ← perché il vault è fatto così
├── AGENTS.md              ← puntatore a CLAUDE.md
├── _meta/authors.md       ← registro delle identità
├── _TEMPLATES/            ← moduli in bianco
├── projects/<slug>/       ← un bundle OKF autonomo per progetto
└── .claude/skills/        ← i sei comandi
```

Ogni progetto sotto `projects/` è un bundle isolato: non condivide né conoscenza né
metodo con gli altri, e i link non attraversano mai il confine fra bundle. Il perché
è in CLAUDE.md §1.

---

## Primo avvio

### 1. Clona il repository

```bash
git clone https://github.com/sararom15/asernet-wiki.git
```

Su Windows, se il clone fallisce per percorsi troppo lunghi:

```bash
git config --global core.longpaths true
```

### 2. Configura l'identità

Git timbra ogni commit con un nome e un'email. Il vault usa **quell'email** per sapere
chi sta lavorando: `/pubblica` e `/lint` la cercano in [`_meta/authors.md`](_meta/authors.md)
e ne ricavano il tuo `id`, quello che finisce in `authored_by` e nel nome del tuo file
di log. Deve quindi essere **la stessa** che compare nella tua riga del registro:
un'email non registrata è un errore di lint, perché rende l'operazione non
attribuibile.

**Da GitHub Desktop**, senza toccare il terminale:

> `File` → `Options…` → scheda `Git` → compila `Name` e `Email`

Vale per tutti i repository della macchina.

**Da terminale**, se preferisci — aperto dentro la cartella del vault
(`Repository` → `Open in Command Prompt` da GitHub Desktop):

```bash
git config user.email "la-tua@email"
git config user.name "Il Tuo Nome"
```

Senza `--global` la configurazione vale solo per questo repository, il che è utile se
usi email diverse per progetti diversi.

> **Attenzione all'email mascherata.** Se su GitHub è attiva la protezione
> dell'indirizzo, alcuni commit — tipicamente quelli fatti dall'interfaccia web —
> risultano firmati `<numero>+<utente>@users.noreply.github.com` invece che con la tua
> email vera. Quell'indirizzo nel registro non c'è, quindi il lint lo segnala come
> identità ignota. O disattivi la protezione, o registri l'indirizzo mascherato come
> alias nella tua riga di `_meta/authors.md`.

### 3. Il merge driver: non devi fare niente

**Lo imposta `/progetto`**, alla prima sessione che apri su questa macchina:
`vault_status` si accorge che manca e la skill chiama `vault_setup`, che scrive
`merge.ours.driver` dentro il `.git/config` di questo clone. Solo in locale —
nessun altro repository della tua macchina viene toccato.

Serve perché la configurazione non viaggia col repository, quindi ogni clone
parte senza. Se vuoi farlo a mano, o se `vault_setup` riporta che `.git/config`
non è scrivibile, il comando è questo, da lanciare dentro la cartella del vault
(in GitHub Desktop: `Repository` → `Open in Command Prompt`):

```bash
git config merge.ours.driver true
```

Gli `index.md` sono file derivati: la loro versione corretta non sta in nessuno dei
due rami di un conflitto, sta nel frontmatter delle pagine. Il `.gitattributes`
dichiara `**/index.md merge=ours` per accettare automaticamente la versione locale e
rigenerarla poi con `/lint`. Senza questa configurazione la dichiarazione non ha
effetto e al primo merge ti ritrovi marcatori di conflitto dentro un file che
CLAUDE.md §7 dice di non risolvere mai a mano.

### 4. Installa i comandi

I sei comandi vivono in `.claude/skills/` e sono distribuiti come plugin: si
installano in un colpo solo, invece di uno alla volta a mano.

Il repository fa da vault **e** da marketplace: i due file in `.claude-plugin/`
dichiarano il catalogo e il manifesto, e quest'ultimo punta a `.claude/skills/`.
L'installazione però **copia** il repository altrove sul disco: il plugin che gira è
uno snapshot, non la cartella che hai davanti. Modificare una skill nel vault non la
cambia nell'ambiente finché non aggiorni il plugin — la procedura è al punto 6.

#### Da Cowork

1. Apri la scheda **Cowork**, poi il menu **Customize** nella barra laterale.
2. Vai alla scheda **Plugins**.
3. Nella sezione **Personal plugins**, premi il pulsante **`+`** e scegli
   **Add marketplace**.
4. Scegli **Add from a repository** e indica `sararom15/asernet-wiki`. Accetta anche
   l'URL Git completo.
5. A sincronizzazione avvenuta, installa il plugin **`asernet-wiki`** dalla
   marketplace appena aggiunta.

Serve accesso in lettura al repository: la marketplace viene sincronizzata da GitHub,
non letta dalla cartella locale.

#### Da Claude Code

Con la cartella del vault aperta:

```
/plugin marketplace add ./
/plugin install asernet-wiki@<VAULT>
```

Qui la sorgente è il percorso locale, quindi non passa da GitHub.

#### Come si chiamano dopo l'installazione

I comandi risultano prefissati dal nome del plugin: `/asernet-wiki:progetto`,
`/asernet-wiki:chiedi`, `/asernet-wiki:ingest` e così via. Il nome dopo i due punti
viene dal campo `name` nel frontmatter della skill, non dal nome della cartella,
quindi resta stabile.

> **Se avevi già installato le skill una per una**, rimuovile dopo aver installato il
> plugin. Due copie dello stesso comando divergono nel tempo, e la copia sbagliata è
> quella che qualcuno lancia per errore.

### 5. (Opzionale) Fai funzionare pull e push da Cowork

**Salta questa sezione se ti va bene sincronizzare con GitHub Desktop.** Serve solo a
chi vuole che `/progetto` e `/pubblica` arrivino fino in fondo da soli.

In Cowork i comandi Git non girano sul tuo computer, ma in un ambiente Linux separato
che monta la cartella del vault. Lì Git funziona per tutto ciò che è locale — `status`,
`diff`, `log`, `commit` — ma non ha le tue credenziali GitHub, che vivono nel gestore
credenziali del sistema operativo e non attraversano quel confine. Il risultato è che
`fetch`, `pull` e `push` falliscono con:

```
fatal: could not read Username for 'https://github.com'
```

Le skill si fermano correttamente quando succede, ma non possono andare avanti:
`/progetto` non carica lo schema, `/pubblica` si ferma prima del controllo delle
sovrapposizioni.

Si risolve mettendo un token nell'URL del remote. `.git/config` è locale al clone e
non viene mai committato, quindi il token resta sulla tua macchina.

**Prerequisito**: essere collaboratore del repository. Il proprietario aggiunge le
persone da `Settings` → `Collaborators`; l'invito arriva via email e **va accettato**,
altrimenti nessun token funzionerà.

1. Sul **tuo** account GitHub: `Settings` → `Developer settings` →
   `Personal access tokens` → `Fine-grained tokens` → `Generate new token`.
   Link diretto: <https://github.com/settings/personal-access-tokens/new>
2. Compila: *Repository access* → `Only select repositories` → `<VAULT>`;
   *Permissions* → *Repository permissions* → **Contents: Read and write** (`Metadata:
   Read-only` si attiva da solo, è obbligatorio); metti una scadenza.
3. Copia il token — GitHub lo mostra una volta sola.
4. Da terminale, nella cartella del vault (`Repository` → `Open in Command Prompt`
   da GitHub Desktop), su una riga sola:

   ```bash
   git remote set-url origin https://TOKEN@github.com/sararom15/asernet-wiki.git
   ```

   Il comando non stampa niente se va a buon fine.

Poi verifica con `git fetch`: se non chiede credenziali ed esce senza errori, è a
posto.

> **Il token non si condivide, mai.** Ognuno genera il proprio sul proprio account.
> Non è una precauzione formale: `.git/config` non viene committato, quindi non è
> nemmeno distribuibile; e un token condiviso rende ogni push attribuibile a una
> persona sola e ogni revoca un blocco per tutti.

> **Non incollarlo in una chat.** Un token finito in una conversazione va considerato
> compromesso: si revoca e se ne genera un altro.

Due cose da mettere in conto.

**Il token scade.** Alla scadenza `pull` e `push` ricominciano a fallire con lo stesso
errore, e le skill si fermano di nuovo. Non si è rotto niente: si rigenera il token e
si rilancia il passo 4.

**Il token non c'entra con l'attribuzione.** Chi ha scritto cosa lo stabilisce
`user.email` del passo 2; il token dice solo se hai il permesso di scrivere su GitHub.
Sono due meccanismi separati, e ognuno può essere sbagliato per conto suo: un token
valido con un'email non registrata produce commit che il lint segnala come identità
ignota.

**Cosa cambia nel metodo.** Senza credenziali, nessun agente può pubblicare: è un
blocco cieco, ma è un blocco. Con il token, l'unica cosa che separa una sessione da un
push è il controllo `L ∩ R` di `/pubblica` e la sua fermata. È il comportamento
previsto — quel controllo distingue casi che un blocco cieco non distingue — ma va
scelto sapendo che la rete di sicurezza involontaria non c'è più.

### 6. Aggiornare i comandi

Quando qualcuno modifica una skill, la modifica arriva agli altri in tre passi.

1. **Chi modifica**: cambia il file in `.claude/skills/`, **incrementa `version` in
   `.claude-plugin/plugin.json`**, committa e spinge. Il campo `version` non è
   decorativo: è l'unico segnale con cui Cowork si accorge che esiste qualcosa di
   nuovo. Senza incremento il push arriva su GitHub e non prosegue oltre — vedi la
   nota qui sotto.
2. **Chi riceve**: risincronizza la marketplace **e poi** aggiorna il plugin. Sono
   due passi distinti e vanno in quest'ordine: la marketplace è ciò che sa quale
   versione esiste su GitHub, il plugin è la copia installata. Finché la prima non
   ha visto la versione nuova, il pulsante di aggiornamento del secondo resta
   spento.
   - **Da Cowork**: `Impostazioni` → `Plugin`, trova la marketplace `asernet-wiki`
     e usa il menu a destra della sua riga — lo stesso da cui si rimuove. Poi apri
     il plugin **asernet-wiki** e premi **Aggiorna**. Se il pulsante è grigio, la
     marketplace non ha ancora visto niente di nuovo: quasi sempre manca
     l'incremento di `version` del passo 1. In ultima istanza, `Disinstalla` dal
     menu dei tre puntini e reinstalla: si perde solo la cache.
   - **Da Claude Code**: `/plugin marketplace update asernet-wiki`, poi `/plugin update`.
3. **Chi riceve**: apre la skill dal pannello e verifica che il testo nuovo ci sia.
   L'aggiornamento ha effetto **dalla sessione successiva**: quella in corso ha già
   la versione vecchia in memoria.

Il terzo passo non è pignoleria. Il plugin installato è una **copia sincronizzata**,
non una lettura in diretta della cartella: finché non lo aggiorni continua a servire
la versione precedente, senza dirti niente. È il punto che sorprende di più, perché
in Cowork la cartella del vault è collegata alla sessione e viene naturale pensare
che il plugin la legga dal disco.

> **Se un aggiornamento non arriva**, la causa quasi certa è il versionamento.
> Si era ipotizzato che su una marketplace ospitata su Git ogni commit valesse come
> versione nuova, rendendo superfluo `version`. **Non è così**: verificato il
> 2026-08-06, con un `plugin.json` privo di `version` il push arriva su GitHub e il
> pulsante *Aggiorna* resta disattivato, senza alcun messaggio. Il campo ora c'è e
> va incrementato a ogni modifica delle skill.

**Il plugin è una copia, non una lettura in diretta.** Il manifesto punta a
`.claude/skills/`, ma ciò che viene installato è uno snapshot del repository copiato
altrove sul disco. Esistono quindi due copie di ogni comando — quella del vault, che
modifichi, e quella del plugin, che gira — e restano allineate solo se fai i tre
passi qui sopra. Vale la pena saperlo perché in Cowork la cartella del vault è
collegata alla sessione, e viene naturale credere che il plugin la stia leggendo da
lì: non lo fa, e quando le due divergono non te lo dice nessuno.

---

## Rapporto col template

Le sei skill e la costituzione sono **una copia**, non un collegamento. Questo
vault è autosufficiente: non dipende da nessun altro repository per funzionare,
e puoi divergere dal template quando il tuo dominio lo richiede.

Il prezzo è che le correzioni non arrivano da sole. Se il template corregge un
difetto di `/lint` o una regola di `CLAUDE.md`, qui non cambia niente finché non
lo porti a mano. Per renderlo almeno possibile, tieni il template come secondo
remote:

```bash
git remote add template https://github.com/<UTENTE-GITHUB>/okf-vault-template.git
git fetch template
git diff template/main --stat -- CLAUDE.md ARCHITETTURA.md .claude/ _TEMPLATES/
```

Quel `diff` è l'unica cosa che ti dice quanto sei lontano. Leggilo prima di
decidere: le differenze non sono tutte da sanare, perché alcune sono scelte tue.
Quando ne recepisci una, aggiorna la riga in [`_meta/template.md`](_meta/template.md).

**Non fondere il template dentro il vault.** `git merge template/main` toccherebbe
pagine di contenuto con un merge automatico, che è esattamente ciò che CLAUDE.md
§9.19 vieta. Si copiano i file, uno alla volta, guardandoli.

---

## I comandi

| Comando | A cosa serve |
|---|---|
| `progetto [slug]` | Sincronizza, imposta il progetto attivo, carica il suo schema |
| `ingest <file>` | Ingerisce una fonte da `raw/` |
| `chiedi <domanda>` | Interroga la wiki citando le pagine |
| `lint [controllo]` | Health check del bundle attivo |
| `pubblica` | Verifica le sovrapposizioni, poi committa e spinge |
| `nuovo-progetto <slug>` | Crea un bundle e ne intervista lo schema |

La specifica di ciascuno — cosa scrive, dove si ferma, cosa non gli è permesso — è in
CLAUDE.md §5. Se questa tabella e CLAUDE.md dicono cose diverse, ha ragione CLAUDE.md.

### Il ciclo di una sessione

```
/progetto <slug>      → pull, identità attiva, novità dall'ultima volta
/ingest raw/<file>    → dry run · STOP · risincronizza · scrive
/pubblica             → verifica sovrapposizioni · STOP se serve · commit e push
```

`/progetto` va sempre per primo: è lì che avviene il pull, e su un vault non
aggiornato `/chiedi` dichiara scoperto un argomento che invece è coperto.

**Un'operazione non è conclusa finché non è pubblicata.** Fino ad allora il lavoro
esiste su un disco solo, e l'altra identità continua a lavorare su uno stato già
superato.

---

## Le tre cose che sorprendono di più

**Nessun agente risolve una contraddizione.** Se una fonte nuova contraddice una
pagina, la contraddizione viene registrata sulla pagina citando entrambe le fonti con
data. Non si sceglie la versione migliore e non si cancella quella vecchia: stabilire
quale delle due vale è una decisione umana.

**L'isolamento fra progetti è metodo, non sicurezza.** Chiunque possa clonare questo
repository vede tutti i bundle e la loro intera cronologia. Le regole di isolamento
vincolano gli agenti, non chi ha accesso al disco. Se un materiale non deve essere
letto da qualcuno che ha accesso al repository, la risposta non è un bundle separato:
è un repository separato.

**`raw/` è immutabile e versionato.** Le fonti stanno in Git perché ogni autore possa
verificare un'affermazione risalendo all'originale. Non si modificano, non si
rinominano, non si riordinano. Attenzione ai file oltre i 50 MB: serve Git LFS, e va
deciso prima del commit.
