# Nutcracker's Portfolio

A continuous scroll-driven 3D journey through Self introduction, Achievements, Hobbies, and Random facts. Scrolling flies the camera through four geometry worlds: chrome orbits, an icy constellation, cyan portals, and a deep-blue tunnel. Background light and accent colors blend along the journey. Drag horizontally in the open scene for unlimited 360-degree rotation, or click a clear, front-facing chapter token to jump to a section. On phones, chapter navigation stays in the normal header. All chapters are readable inline, with expanding hobby cards, fact reveals, full-size certificate photos and subtle card depth. The graphics use locally bundled Three.js 0.180.0 under its MIT license. A static penguin view appears if WebGL is unavailable. Motion can be turned off; device reduced-motion preferences are respected. Lighter shaders, instanced portal geometry, a lower pixel ratio and a 30 fps idle cadence reduce graphics work; interactions can render at 60 fps. Existing content remains in portfolio.json.

## Hosting

This is a static GitHub Pages site. Publish the files at the root of `NutcrackerPro/nutcrackerpro.github.io`. In Settings, open Pages and choose main and /(root). No paid hosting, domain purchase or API key is needed.

## Fill in your portfolio

Open `admin.html?v=20261007-refine2` directly, or tap the circular penguin 10 times with no more than 2 seconds between taps. Secret mode pauses section navigation while you enter `ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a b a` using the keyboard or on-screen buttons. A gap longer than 2 seconds resets the tap count. Tap the penguin once more to cancel secret mode and unlock the sections. The homepage has no visible editor link. The sequence hides the entry point only; it is not authentication. The included editor has matching sections, a smiley-phrase list and an expandable contacts list.

1. Edit your text, add achievements, hobbies or facts, arrange smiley phrases, and optionally choose photos.
2. Choose **Copy for GitHub**, then **Open GitHub editor**.
3. Sign in and replace the text in `portfolio.json` with the copied content. Commit the change.
4. Refresh the website after GitHub Pages finishes publishing.

Alternatively, download `portfolio.json` and upload it to the repository root, replacing the existing file. Draft edits are only held in the current editor page until copied or downloaded. The public editor cannot save to GitHub; GitHub account permissions protect publication.

Only include information you want public. JPG, PNG, WebP and AVIF source photos can be up to 15 MB. The editor resizes them locally to at most 2048 px along the long edge and a final size of 2 MB. Animated GIFs must already be under 2 MB. The complete content file is limited to 8 MB. Selected photos are embedded in the JSON file; hosted image URLs also work. No private information or credentials belong in this public repository.

## Contacts

The email contact opens an email application. Discord uses a copy-username button because a username is not a Discord user ID. More email addresses, usernames or web links can be added in the editor.

## Smiley phrases

Edit the smiley’s messages in the **Smiley phrases** section. Add, remove and reorder phrases using the same controls as the other lists. They are stored in `portfolio.json` as `smileyPhrases`, an array of objects such as `{"text": "Hey there! :D"}`. An empty array intentionally disables messages. Older content without this field starts with three default phrases.

## Interactions

Headings and copy reveal character by character as they enter the viewport. The inline smiley changes expression, pops a few small sparks and reveals your editable phrases. These effects respect Motion off and reduced-motion preferences. Camera position, 3D worlds and background colors respond to scroll position. These visual effects run locally without an AI service or API cost. Use the header or side dots to jump between worlds. Hobby cards expand and fact cards reveal their answers. Motion off removes continuous animation while retaining static views of every world. The penguin secret mode pauses scrolling and navigation until cancelled.

## Artwork and places

`artwork.html` is a separate, lightweight collection page with a scrapbook design, artwork/travel filters, and a full-size entry viewer. Open **Artwork & places** from the homepage. In the editor, **06 / Artwork & travel collection** lets you set the page title/introduction and add, remove or reorder entries with a category, title, date, location, note and photo. Publish the same portfolio.json file as usual.

Optional fields are journalTitle, journalIntro and journalEntries. Entries use `{type,title,date,location,description,image,imageAlt}`, with type `artwork` or `travel`. Existing content needs no conversion: until entries are added, the page displays the existing artwork photo and caption. No travel memories or achievements are invented.

## Assets

The page title shown in browser tabs and shared links is **Nutcracker's Portfolio**. The penguin site icon embeds the supplied image in `favicon.svg?v=2`, with `nutcracker.jpeg?v=2` as a fallback and an Apple touch icon.

The botanical artwork is original AI-generated art. Fonts are Italiana and DM Sans via Google Fonts, with system fallbacks. The website reads `portfolio.json` without a build step.

## Local preview

Serve the directory with a static HTTP server. Direct file opening may prevent JSON content from loading.
