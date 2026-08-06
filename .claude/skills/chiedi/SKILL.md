---
name: chiedi
description: Interroga la wiki del progetto attivo. Risponde citando le pagine, oppure dichiara esplicitamente che la wiki non copre l'argomento invece di improvvisare.
argument-hint: "[la domanda]"
allowed-tools: Read, Glob, Grep
---

# Query sulla wiki

Domanda: `$ARGUMENTS`

## Precondizione

Serve un progetto attivo. Se non c'è, fermati e chiedi di lanciare `/progetto`.

Serve anche che `/progetto` sia stato lanciato **in questa sessione**, perché è
lì che avviene il `git pull`. Su un vault non sincronizzato non sai che certe
pagine esistono: applicheresti la soglia di astensione qui sotto a un bundle
incompleto e dichiareresti scoperto un argomento che invece è coperto. È il modo
più silenzioso in cui questa skill può sbagliare.

## Procedura

1. Leggi l'`index.md` di radice, poi gli `index.md` di sezione pertinenti.
2. Apri **solo** le pagine che servono. Se ne stai aprendo più di sei, fermati e
   chiedi di restringere la domanda: significa che è troppo larga.
3. Componi la risposta dalle pagine lette, citandole con link relativi.

## Soglia di astensione — regola non derogabile

Prima di scrivere la risposta, poniti questa domanda: *l'affermazione centrale
della mia risposta è scritta in una pagina che ho aperto, oppure la sto
costruendo io mettendo insieme frammenti debolmente pertinenti?*

Nel secondo caso la risposta corretta è:

> La wiki di `<slug>` non contiene una risposta affidabile a questa domanda.

seguita da: cosa manca esattamente, e quale fonte servirebbe per colmarlo.

- Non sintetizzare da match a bassa rilevanza.
- Se conosci la risposta per conoscenza generale ma la wiki non la contiene,
  puoi dirlo — ma in un blocco **separato e marcato come esterno alla wiki**,
  dopo la dichiarazione di astensione. Mai mescolato alla risposta citata.
- Una risposta di astensione **non viene mai archiviata**.

## Formato della risposta

```
<risposta, con [link](percorso.md) alle pagine da cui viene ogni affermazione>

---
Fonti nella wiki: <elenco pagine aperte>
Confidenza: alta | media | bassa — <perché>
```

Se le pagine usate hanno `status: stale` o `confidence: low`, dillo.
Se contengono `## Contraddizioni aperte` rilevanti, riportale: non scegliere
tu quale versione è giusta.

## Archiviazione

Se la risposta è ben fondata e ha valore duraturo, **proponi** di salvarla in
`syntheses/` con `type: Synthesis`, indicando titolo e `confidence`.
Proponi e fermati: non archiviare di iniziativa, e non archiviare mai una
risposta di astensione o una che si appoggia a conoscenza esterna alla wiki.
