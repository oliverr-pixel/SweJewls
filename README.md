# SweJewls

Webbplats för SweJewls: iced Cuban-kedjor och armband. Hela sidan är en interaktiv 3D-film där ett procedurgenererat kubanskt armband byter metall, växer till ett halsband, plockas isär och till sist ringar in en diamant i glas.

| Produkt | Pris |
| --- | --- |
| Diamantsilverarmband | 250 kr |
| Guldarmband | 300 kr |
| Halsband (silver eller guld) | 350 kr |

Beställning sker via sms till **076-328 20 09**. Kunden lägger varor i korgen och trycker på *Skicka beställning som sms*. Då öppnas ett färdigskrivet sms med varor, totalsumma, namn och valt betalsätt.

Köp sker bara i Stockholm: säljaren och kunden möts upp, ingen frakt. Betalning med **Swish eller kontant**.

## Kom igång

```bash
npm install
npm run dev       # utvecklingsserver på http://localhost:5173
npm run build     # färdig sajt i dist/
npm run preview   # testa bygget lokalt
```

Lägg upp innehållet i `dist/` på valfritt webbhotell (Netlify, Vercel, GitHub Pages, one.com …). Sökvägarna är relativa, så sajten fungerar även i en undermapp.

### Netlify

`netlify.toml` innehåller redan inställningarna (bygg med `npm run build`, publicera `dist`, Node 22).

- **Snabbast:** bygg med `npm run build` och dra mappen `dist/` (eller en zip av den) till <https://app.netlify.com/drop>.
- **Med automatisk uppdatering:** i Netlify väljer du *Add new project → Import an existing project → GitHub* och väljer repot. Netlify läser `netlify.toml` och bygger om sajten vid varje push.

## Ändra innehåll

| Vad | Var |
| --- | --- |
| Priser, produktnamn, färgval för halsbandet | `src/data.js` och texterna i `index.html` |
| Telefonnummer | `src/data.js` (`PHONE`) och `index.html` (sök på `076-328`) |
| Videor och bilder i IRL-sektionen | `public/media/` och `<section id="irl">` i `index.html` |
| Färger och typsnitt | variablerna överst i `src/styles/main.css` |

Färgerna på texten följer loggan: guld (`--gold`, `--gold-hi`, `--gold-lo`) och silver (`--ice`). Vill ni ha andra nyanser räcker det att ändra de variablerna.

## Logga

Den nya loggan ligger i `brand/`:

- `swejewls-logo.svg` / `.png` – liggande, transparent bakgrund
- `swejewls-logo-svart-bakgrund.svg` / `.png` – liggande på svart
- `swejewls-logo-staende.svg` / `.png` – stående, för profilbilder och skyltar
- `swejewls-symbol.svg` / `.png` – bara diamanten
- `swejewls-ikon.svg` / `.png` – app-ikon och profilbild

Ordmärket är Bodoni Moda Black omgjort till kurvor, så det ser likadant ut överallt utan att typsnittet behöver vara installerat. "SWE" är i guld och "JEWLS" i silver, som de två armbanden.

## Teknik

- **Three.js** (WebGL): kedjan byggs i kod. Länkarna är skjuvade, tillplattade ringar och stenarna är briljantslipade. Allt ritas med instancing, så hela kedjan blir tre draw calls.
- **Egna GLSL-shaders**: stenar med "eld" (dispersion) och gnistor, en metall som är guld på ena sidan av en kant och silver på den andra, ljusstrålar, partikeldamm och ljusspår.
- **postprocessing**: bloom, skärpedjup, tonmappning och ett eget linspass med kromatisk aberration, förvrängning vid snabb scroll, krusningar vid klick, vinjett och filmkorn.
- **GSAP + ScrollTrigger + SplitText** för typografi och scrollstyrda övergångar. **Lenis** ger mjuk scroll.
- Prestanda: färre partiklar och inget skärpedjup på mobil, upplösningen sänks automatiskt om bildfrekvensen sjunker, och videor laddas först när man närmar sig dem.
- `prefers-reduced-motion` respekteras: ingen intro, ingen mjukscroll och inga kameraåkningar.
- Utan WebGL visas den vanliga sidan med loggan i stället för 3D-scenen.
