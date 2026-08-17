# vault-mcp

Server MCP locale che dà a Claude accesso alle **operazioni git del vault** — non alla tua shell.

Nasce da un limite concreto: in Cowork la shell di Claude gira in una sandbox Linux con la
cartella del vault montata, e quel montaggio **nega la cancellazione dei file**. Un fast-forward
non aggiunge soltanto file: per aggiornare `index.md` sostituisce il vecchio col nuovo, e la
sostituzione passa da un unlink. Quindi `git pull` muore a metà e `HEAD` resta indietro. Questo
server gira invece sulla tua macchina, con i tuoi permessi, sul repository vero.

## Perché quattro tool e non `run_shell(command)`

Una tool `run_shell` generica è esecuzione di codice arbitraria sulla tua macchina a
disposizione di un modello. Ti farebbe anche perdere l'unica garanzia che hai oggi: l'elenco di
comandi ammessi in cima a ogni skill funziona perché l'agente lo rispetta — è disciplina, non un
lucchetto.

Qui l'elenco diventa la superficie del server: **ciò che non è una tool non è raggiungibile.**
`--force`, `--amend`, `reset`, `checkout`, `rebase`, `stash drop` non sono implementati, quindi
non esistono. È lo stesso spirito di CLAUDE.md §9.21, applicato meccanicamente invece che per
fiducia.

## Le tool

| Tool | Scrive? | Cosa fa |
|---|---|---|
| `vault_status` | no | Branch, ahead/behind, untracked, modificati, stash, identità git, stato del merge driver |
| `vault_sync` | sì | `git pull --ff-only`, con auto-stash guardato se il working tree è di ostacolo |
| `vault_publish` | sì | Verifica L ∩ R, poi commit + merge + push dei soli path passati |
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
  dice, per ogni file, se la tua copia locale è `IDENTICO` al contenuto arrivato (duplicato:
  scartarla non perde niente) o `DIVERSO` (contenuto che il remoto non ha: decisione tua).

`index.md` e i file di `log/` sono esclusi dal confronto: cambiano a ogni operazione e non dicono
niente sul merito.

Il server **non scarta mai uno stash**. `drop` e `clear` non sono implementati, perché uno stash
scartato non è recuperabile da nessuna parte.

### `vault_publish`

Riproduce il passo 5.5 della costituzione. Costruisce R dal `merge-base`, calcola `L ∩ R`
escludendo `index.md` e `log/`, e **se non è vuoto non scrive niente**: restituisce il referto con
chi ha toccato cosa e se il contenuto dei due lati è identico o diverso. Non esiste un'opzione
«tieni la mia»: `confirm_overlap` serve solo dopo che il referto è stato mostrato a un umano e
l'umano ha deciso.

Se il merge produce conflitti, li **lascia sul disco** e non spinge: risolverli è una decisione
umana, e un `index.md` in conflitto non si risolve leggendo ma rigenerando con `/lint`.

## Installazione

Serve solo Node (testato su v22; qualunque versione ≥ 18 va bene). Nessuna dipendenza, nessun
`npm install`, nessun `node_modules`.

1. Copia la cartella `vault-mcp` dove preferisci, per esempio
   `C:\Users\sarar\Documents\GitHub\asernet_wiki\tools\vault-mcp\`.
2. Apri la config MCP dell'app desktop e aggiungi il server:

```json
{
  "mcpServers": {
    "vault-asernet": {
      "command": "node",
      "args": ["C:\\Users\\sarar\\Documents\\GitHub\\asernet_wiki\\tools\\vault-mcp\\server.js"],
      "env": {
        "VAULT_PATH": "C:\\Users\\sarar\\Documents\\GitHub\\asernet_wiki"
      }
    }
  }
}
```

3. Riavvia l'app.

**`VAULT_PATH` è fissato nella config, non passato come argomento.** Chi chiama le tool non può
puntarle a un'altra cartella. Il server rifiuta di partire se quel path non contiene sia `.git`
sia `CLAUDE.md`, e ogni path passato a `vault_publish` viene validato: relativo, senza `..`,
risolto dentro il vault.

### Un server per vault

Hai anche `datapyx-wiki`. Se lo vuoi coprire, aggiungi una **seconda voce** con un `VAULT_PATH`
diverso — `vault-datapyx` — non riusare lo stesso server per due vault. Due vault dietro la stessa
tool sono un modo per confondere il progetto attivo, ed è esattamente ciò che la regola di
isolamento §1 esiste per impedire.

## Test rapido senza l'app

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"vault_status","arguments":{}}}' \
 | VAULT_PATH=/percorso/al/vault node server.js
```

## Cosa resta fuori

Il server non scrive pagine, non aggiorna `index.md`, non appende voci di log: quelle sono cose
dell'operazione, cioè delle skill. Fa solo il git. E non copre `/lint`, `/ingest`, `/chiedi`, che
non hanno bisogno di privilegi che Claude non abbia già.
