# Nutcracker's Portfolio

A continuous scroll-driven 3D journey through Self introduction, Some cool photos, Achievements, Hobbies, and Random facts. **Some cool photos** sits directly below the introduction in the same page and 3D experience. Scrolling moves through five worlds: chrome orbits, floating photo frames, an icy constellation, cyan portals, and a deep-blue tunnel. Background light and accent colors blend along the journey. Drag horizontally in the open scene for unlimited 360-degree rotation; use the header or side dots to jump between sections. Content remains readable inline, with clear rounded panels whose box, text and arrow move together, expanding hobbies, fact reveals and full-size photos.

The graphics use locally bundled Three.js 0.180.0 under its MIT license. A static penguin view appears if WebGL is unavailable. A futuristic Nutcracker startup uses the same live 3D scene as the portfolio. It waits for scene and content readiness plus a 1.1-second minimum, then opens a native scrolling transition. Scrolling moves the orbit sculpture from the centre into its introduction pose while the startup interface fades away. Two simple chevrons, a tap or keyboard entry can complete the same transition. Startup is removed when the introduction is reached; reduced-motion preferences stop automatic movement. Motion can be turned off; device reduced-motion preferences are respected. Lighter shaders, instanced geometry and fewer decorative draw calls reduce graphics work. The scene targets 60 fps with a consistent sharp rendering resolution during dragging and idle animation, capped at 2 device pixels per CSS pixel. Frame rate depends on the device and browser; under load the scene reduces decoration rather than blurring the model. The models keep moving gently while the portfolio is visible and Motion is on. A capped refresh rate and lean scene keep graphics work bounded without a resolution drop during interaction. Rendering pauses when Motion is off, while the page is hidden, or while an editor or photo overlay is open. Startup animates the same lightweight scene while portfolio interaction is locked, without adding another WebGL renderer. Existing content remains in `portfolio.json`.

## Hosting

This is a static GitHub Pages site. Publish the files at the root of `NutcrackerPro/nutcrackerpro.github.io`. In Settings, open Pages and choose main and /(root). No paid hosting, domain purchase or API key is needed.

## Fill in your portfolio

Open `admin.html?v=20261007-refine7` directly, or tap the circular penguin 10 times with no more than 2 seconds between taps. Secret mode pauses section navigation while you enter `ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a b a` using the keyboard or on-screen buttons. A gap longer than 2 seconds resets the tap count. Tap the penguin once more to cancel secret mode and unlock the sections. The homepage has no visible editor link. The sequence hides the entry point only; it is not authentication. The included editor has matching sections, an editable photo collection, a smiley-phrase list and an expandable contacts list.

1. Edit your text, add photos, achievements, hobbies or facts, arrange smiley phrases, and optionally choose images.
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

Headings and copy reveal character by character as they enter the viewport. The inline smiley changes expression, pops a few small sparks and reveals your editable phrases. These effects respect Motion off and reduced-motion preferences. Camera position, 3D worlds and background colors respond to scroll position. These visual effects run locally without an AI service or API cost. Use the header or side dots to jump between worlds. Hobby cards expand and fact cards reveal their answers. Motion off removes animated transitions while retaining static views of every world. The penguin secret mode pauses scrolling and navigation until cancelled.

## Soundtracks

Optional `soundtracks` entries use `{title,url}`. In **07 / Soundtracks**, add a title and a direct HTTPS audio link, or upload a playable audio file under 2 MB. Uploads stay in the draft and are included in the same public `portfolio.json` when published; the total 8 MB content limit still applies. MP3, OGG, WAV, M4A, AAC, WebM and FLAC are accepted where the browser supports them.

Visitors choose Play before music starts. The compact player offers Play/Pause, track selection, Next and volume; it is hidden when no tracks are configured. No audio subscription or API is required.

## Some cool photos

The **Some cool photos** section is part of the scrolling homepage, directly below Self introduction. The introduction has no extra photo shortcut card. It shares the dark-blue 3D design of the other sections and has its own floating photo-frame world. Filters show Everything, Photos, or Places & travel. Select a photo to view it full size. Blank space between controls and cards stays available for rotating the background models.

In the editor, **06 / Some cool photos** lets you set the section title/introduction and add, remove or reorder entries with a category, title, date, location, note and photo. Future travel photos and places visited can be added here. Publish the same `portfolio.json` file as usual; no separate page or account is needed.

Optional fields are `journalTitle`, `journalIntro` and `journalEntries`. Entries use `{type,title,date,location,description,image,imageAlt}`, with internal type `artwork` for a photo or `travel` for a place. Existing content needs no conversion: until entries are added, the section displays the existing featured photo and caption. No travel memories or achievements are invented.

## Assets

The page title shown in browser tabs and shared links is **Nutcracker's Portfolio**. The penguin site icon embeds the supplied image in `favicon.svg?v=2`, with `nutcracker.jpeg?v=2` as a fallback and an Apple touch icon.

The botanical artwork is original AI-generated art. Fonts are Italiana and DM Sans via Google Fonts, with system fallbacks. The website reads `portfolio.json` without a build step.

## Local preview

Serve the directory with a static HTTP server. Direct file opening may prevent JSON content from loading.
