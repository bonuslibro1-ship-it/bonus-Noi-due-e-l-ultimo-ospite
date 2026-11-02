# Landing dei bonus — Noi Due e l'Ultimo Ospite

Una pagina dove il lettore inserisce nome, cognome ed email, spunta il consenso e, solo dopo l'invio riuscito, vede il pulsante che apre la cartella Drive dei bonus. Ogni lead finisce nel tuo Google Sheet. Il link di Drive non si trova mai nel codice della pagina: lo restituisce un server (la funzione di Vercel) solo dopo che il foglio ha confermato la scrittura.

Costo: zero. Servono un account Google, uno GitHub e uno Vercel (tutti gratuiti). Tempo: circa 20 minuti.

## Cosa c'è nella cartella

- `public/index.html` e `public/copertina.jpg`: la pagina che vede il lettore.
- `api/submit.js`: la funzione che controlla i dati, scrive il lead e rilascia il link.
- `apps-script/Code.gs`: lo script da incollare nel Google Sheet.
- `.env.example`: le tre variabili da copiare su Vercel (il secret è già pronto).
- `vercel.json`: dice a Vercel di pubblicare solo la cartella `public`.
- `test/`: test automatici (facoltativi, `npm test` se hai Node).

## 1. Google Sheet e Apps Script

1. Apri il tuo foglio: https://docs.google.com/spreadsheets/d/1JkOM5Io3X_QxGaj9vbxqRLJyjt0fUzM5eJVM61CFZmk/edit
2. Menu **Estensioni → Apps Script**.
3. Cancella tutto quello che c'è nell'editor e incolla il contenuto di `apps-script/Code.gs` così com'è. Non devi cambiare niente. Premi **Salva** (icona dischetto).
4. In alto a destra: **Deploy → Nuovo deployment**. Accanto a «Seleziona tipo» clicca l'ingranaggio e scegli **Applicazione web**.
5. Imposta: **Esegui come: Me**, **Chi ha accesso: Chiunque**. Clicca **Deploy**.
6. Compare la richiesta di autorizzazione: **Autorizza accesso** → scegli il tuo account Google. Se vedi «Google non ha verificato questa app» è normale per uno script tuo: clicca **Avanzate → Vai a (nome progetto) (non sicuro) → Consenti**.
7. Copia l'**URL dell'applicazione web**: finisce con `/exec`. Ti serve al punto 3.

I lead compariranno in una scheda chiamata **Lead**, che lo script crea da solo la prima volta. Non è la scheda che si apre di default: guarda in basso tra le schede del foglio.

## 2. GitHub

1. Decomprimi lo zip.
2. Su github.com crea un nuovo repository **privato** (il file `.env.example` contiene il secret: non renderlo pubblico).
3. Clicca **uploading an existing file** e trascina tutto il contenuto della cartella decompressa, compresi i file nascosti `.gitignore` e `.env.example` (se non li vedi, attiva «mostra file nascosti»). Conferma con **Commit changes**.

## 3. Vercel

1. Su vercel.com → **Add New → Project** → importa il repository.
2. Prima di cliccare Deploy, apri **Environment Variables** e aggiungi queste tre, copiando i valori da `.env.example`:
   - `GOOGLE_SCRIPT_URL` = l'URL `/exec` del punto 1.7
   - `APPS_SCRIPT_SECRET` = il valore già scritto in `.env.example` (non inventarne un altro)
   - `BONUS_DRIVE_URL` = il link della cartella Drive (già scritto in `.env.example`)
3. **Deploy**. Se aggiungi o cambi una variabile dopo il primo deploy, fai **Redeploy** (Deployments → menu dei tre puntini → Redeploy), altrimenti la funzione non la legge.

## 4. Prova da capo a fondo

1. Apri l'indirizzo che ti dà Vercel (tipo `nome-progetto.vercel.app`).
2. Verifica che il pulsante della cartella **non** ci sia ancora.
3. Inserisci dati di prova e invia: deve comparire «I bonus sono pronti» con il pulsante.
4. Apri il foglio, scheda **Lead**: deve esserci la riga. Se non c'è, su Vercel apri **Logs** della funzione `/api/submit` (i log di runtime, non quelli di build): l'errore è scritto lì.
5. Se la cartella Drive chiede l'accesso, aprila su Drive → **Condividi → Chiunque abbia il link → Visualizzatore**.

## Se modifichi Code.gs in futuro

In Apps Script: **Deploy → Gestisci deployment → matita → Versione: Nuova versione → Deploy**. Non creare un «Nuovo deployment»: genererebbe un URL `/exec` diverso e dovresti aggiornare la variabile su Vercel.

## QR code

Quando la pagina è online, genera il QR con l'indirizzo definitivo (meglio un dominio tuo o il nome progetto Vercel che non cambierà). Poi lo inserisci nel riquadro di pagina 178 del libro.

## Dati personali

Il modulo ha una casella di consenso obbligatoria e una breve informativa («Come usiamo i tuoi dati»), che indica Giulia Selli come titolare. Nel foglio, scheda **Lead**, la colonna **Consenso** registra che è stato dato. Prima di fare pubblicità alla pagina, aggiungi un indirizzo email di contatto nell'informativa (dentro `public/index.html`, nel paragrafo sotto «Come usiamo i tuoi dati») e, se vuoi, una privacy policy completa.
