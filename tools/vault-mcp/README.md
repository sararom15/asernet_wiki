# vault-mcp

Server MCP locale che dà a Claude accesso alle **operazioni git del vault** — non alla tua shell.

Nasce da un limite concreto: in Cowork la shell di Claude gira in una sandbox Linux con la
cartella del vault montata, e quel montaggio **nega la cancellazione dei file**. Un fast-forward
non aggiunge soltanto file: per aggiornare `index.md` sostituisce il vecchio col nuovo, e la
sostituzione passa da un unlink. Quindi `git pull` muore a metà e `HEAD` resta indietro. Questo
server gira invece sulla macchina dell'utente, con i suoi permessi, sul repository vero.

## Perché cinque tool e non `run_shell(command)`

Una tool `run_shell` generica è esecuzione di codice arbitraria sulla macchina, a disposizione di
un modello. Farebbe anche perdere l'unica garanzia esistente: l'elenco di comandi ammessi in cima
a ogni skill funziona perché l'agente lo rispetta — è disciplina, non un lucchetto.

Qui l'elenco diventa la superficie del server: **ciò che non è una tool non è raggiungibile.**
`--force`, `--amend`, `reset`, `checkout`, `rebase`, `stash drop` non sono implementati, quindi
non esistono. È lo stesso spirito di CLAUDE.md §9, applicato meccanicamente invece che per
fiducia. Vedi §12 della costituzione.

## Le tool

| Tool | Scrive? | Cosa fa |
|---|---|---|
| `vault_status` | no | Branch, ahead/behind, untracked, modificati, stash, identità git, merge driver, stato del lock |
| `vault_sync` | sì | `git pull --ff-only`, con auto-stash guardato se il working tree è d'ostacolo |
| `vault_publish` | sì | Verifica L ∩ R, poi commit + merge + push dei soli path passati |
| `vault_unlock` | sì | Mette da parte un `.git/index.lock` abbandonato, solo con conferma |
| `vault_stash_list` | no | Elenca gli stash e il loro contenuto, tracciato e non |

### La guardia di `vault_sync`

È la parte che conta. GitHub Desktop, davanti a modifiche locali, fa un auto-stash e poi
riapplica. Il problema è il `pop`: riapplicare **fonde** le modifiche sul nuovo albero, e su una
pagina di contenuto quella è una fusione automatica senza nessuno che guardi — precisamente ciò
che il vault vieta (§9.19). Desktop può permetterselo perché ha una GUI davanti; un agente no.

Quindi `vault_sync` fa l'auto-stash, ma prima di riapplicare confronta i file messi via con
quelli che il pull ha portato:

- **non si intersecano** → `git stash pop`, esito `OK_STASH_REAPPLIED`;
- **si intersecano** → **nessun pop**, esito `OK_STASH_HELD`. Lo stash resta intatto e il referto
  dice, per ogni file, se la copia locale è `IDENTICO` al contenuto arrivato (duplicato:
  scartarla non perde niente) o `DIVERSO` (contenuto che il remoto non ha: decisione dell'utente).

`index.md` e i file di `log/` sono esclusi dal confronto: cambiano a ogni operazione e non dicono
niente sul merito.

Il server **non scarta mai uno stash**. `drop` e `clear` non sono implementati, perché uno stash
scartato non è recuperabile da nessuna parte (§9.22).

### `vault_publish`

Riproduce il passo §5.5 della costituzione. Costruisce R dal `merge-base`, calcola `L ∩ R`
escludendo `index.md` e `log/`, e **se non è vuoto non scrive niente**: restituisce il referto con
chi ha toccato cosa e se il contenuto dei due lati è identico o diverso. Non esiste un'opzione
«tieni la mia»: `confirm_overlap` serve solo dopo che il referto è stato mostrato a un umano e
l'umano ha deciso.

Se il merge produce conflitti, li **lascia sul disco** e non spinge: risolverli è una decisione
umana, e un `index.md` in conflitto non si risolve leggendo ma rigenerando con `/lint`.

Rifiuta anche di partire se `git config user.email` è vuota: un commit firmato da nessuno non è
tracciabilità.

### `vault_unlock`

Un `.git/index.lock` abbandonato blocca ogni scrittura sull'indice, quindi `vault_publish` non
parte nemmeno. Ma un lock può essere legittimo — se un altro client git lo tiene in mano *adesso*,
toglierlo corrompe l'indice.

Il server non può chiedere niente all'utente, quindi non decide: pretende `confirm: true`, che
l'agente ottiene solo dopo aver chiesto (§9.23). Rifiuta comunque i lock più giovani di 60
secondi. E non cancella: **rinomina** in `index.lock.abbandonato-<timestamp>`, così se si scopre
di aver sbagliato si rimette a posto.

## Come trova il vault

In quest'ordine:

1. **`VAULT_PATH`**, se impostata nell'ambiente. È l'override esplicito e vince su tutto: chi ha
   più di un vault deve poter dire quale.
2. risalita da **`CLAUDE_PROJECT_DIR`**, se l'ambiente la fornisce.
3. risalita dalla **cartella di lavoro** del processo.

«Risalita» significa: da quella cartella verso la radice, il primo livello che contiene sia
`.git` sia `CLAUDE.md`. Entrambi, non uno — `.git` da solo è un qualunque repository, `CLAUDE.md`
da solo è un qualunque progetto. Se non trova nulla, ogni tool restituisce un errore che dice
dove ha cercato.

`vault_status` riporta nel campo `vault_resolved_by` quale dei tre modi ha funzionato.

## Installazione

### Col plugin — nessuna configurazione

Il server viaggia dentro il plugin `asernet-wiki`, dichiarato in
`.claude-plugin/plugin.json`:

```json
"mcpServers": {
  "vault": {
    "command": "node",
    "args": ["${CLAUDE_PLUGIN_ROOT}/tools/vault-mcp/server.js"]
  }
}
```

Parte da solo quando il plugin è attivo. Nessun `VAULT_PATH` da scrivere: `${CLAUDE_PLUGIN_ROOT}`
è la copia del plugin nella cache, mentre il vault di lavoro sta dove ciascuno l'ha clonato, e il
server lo trova da sé con la risalita.

**Le tool prendono un nome scopato**: `mcp__plugin_asernet-wiki_vault__vault_sync`. Per questo le
skill le citano sempre per nome corto.

### A mano — quando serve un `VAULT_PATH` esplicito

Utile con più vault, o per lavorare al server senza reinstallare il plugin. Nella configurazione
MCP dell'app desktop:

```json
{
  "mcpServers": {
    "vault-asernet": {
      "command": "node",
      "args": ["C:\\Users\\<utente>\\Documents\\GitHub\\asernet_wiki\\tools\\vault-mcp\\server.js"],
      "env": {
        "VAULT_PATH": "C:\\Users\\<utente>\\Documents\\GitHub\\asernet_wiki"
      }
    }
  }
}
```

Tre trappole, tutte già viste: il file deve contenere **una sola coppia di graffe** al livello più
esterno (se ci sono già delle `preferences`, la voce va aggiunta *dentro*, non accanto); i
backslash vanno **raddoppiati**; e l'app va chiusa dall'icona nella barra di sistema, non con la
X, altrimenti il processo resta vivo e non rilegge la configurazione. Se il server non parte
nonostante tutto, sostituisci `"node"` con il percorso assoluto che dà `where node`: le app con
interfaccia grafica su Windows non sempre ereditano il `PATH` della shell.

**Un server per vault.** Con più vault si aggiunge una seconda voce con un `VAULT_PATH` diverso,
non si riusa lo stesso server: due vault dietro la stessa tool sono un modo per confondere il
progetto attivo, che è ciò che la regola di isolamento §1 esiste per impedire.

## Requisiti

Node ≥ 18. Nessuna dipendenza, nessun `npm install`, nessun `node_modules`: il protocollo MCP è
implementato a mano su JSON-RPC, ~450 righe leggibili in dieci minuti. Un server che dà accesso
al disco deve essere ispezionabile.

## Test rapido senza l'app

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"vault_status","arguments":{}}}' \
 | VAULT_PATH=/percorso/al/vault node server.js
```

Deve stampare due righe JSON, la seconda con lo stato del vault. Omettendo `VAULT_PATH` e
lanciando da dentro il vault si prova anche la risalita.

## Cosa resta fuori

Il server non scrive pagine, non aggiorna `index.md`, non appende voci di log: quelle sono cose
dell'operazione, cioè delle skill. Fa solo il git. E non copre `/lint`, `/ingest`, `/chiedi`, che
non hanno bisogno di privilegi che Claude non abbia già.
