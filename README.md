# Nutcracker's Portfolio

A continuous scroll-driven 3D journey through Self introduction, Achievements, Hobbies, and Random facts. Scrolling flies the camera through four geometry worlds: chrome orbits, an icy constellation, cyan portals, and a deep-blue tunnel. Background light and accent colors blend along the journey. Drag horizontally in the open scene to orbit it, or click a floating chapter token to jump to a section. All chapters are readable inline, with expanding hobby cards, fact reveals, full-size certificate photos and subtle card depth. The graphics use locally bundled Three.js 0.180.0 under its MIT license. A static penguin view appears if WebGL is unavailable. Motion can be turned off; device reduced-motion preferences are respected. Existing content and editor use portfolio.json without a schema migration.

## Hosting

This is a static GitHub Pages site. Publish the files at the root of `NutcrackerPro/nutcrackerpro.github.io`. In Settings, open Pages and choose main and /(root). No paid hosting, domain purchase or API key is needed.

## Fill in your portfolio

Open `admin.html?v=20260928-secret2` directly, or tap the circular penguin 10 times with no more than 2 seconds between taps. Secret mode pauses section navigation while you enter `ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a b a` using the keyboard or on-screen buttons. A gap longer than 2 seconds resets the tap count. Tap the penguin once more to cancel secret mode and unlock the sections. The homepage has no visible editor link. The sequence hides the entry point only; it is not authentication. The included editor has matching sections, a smiley-phrase list and an expandable contacts list.

1. Edit your text, add achievements, hobbies or facts, arrange smiley phrases, and optionally choose photos.
2. Choose **Copy for GitHub**, then **Open GitHub editor**.
3. Sign in and replace the text in `portfolio.json` with the copied content. Commit the change.
4. Refresh the website after GitHub Pages finishes publishing.

Alternatively, download `portfolio.json` and upload it to the repository root, replacing the existing file. Draft edits are only held in the current editor page until copied or downloaded. The public editor cannot save to GitHub; GitHub account permissions protect publication.

Only include information you want public. Each photo can be up to 2 MB; the complete content file is limited to 8 MB. Photos selected in the draft are embedded in the JSON file. No private information or credentials belong in this public repository.

## Contacts

The email contact opens an email application. Discord uses a copy-username button because a username is not a Discord user ID. More email addresses, usernames or web links can be added in the editor.

## Smiley phrases

Edit the smiley’s messages in the **Smiley phrases** section. Add, remove and reorder phrases using the same controls as the other lists. They are stored in `portfolio.json` as `smileyPhrases`, an array of objects such as `{"text": "Hey there! :D"}`. An empty array intentionally disables messages. Older content without this field starts with three default phrases.

## Interactions

Sections reveal as they enter the viewport. Camera position, 3D worlds and background colors respond to scroll position. These visual effects run locally without an AI service or API cost. Use the header or side dots to jump between worlds. Hobby cards expand and fact cards reveal their answers. Motion off removes continuous animation while retaining static views of every world. The penguin secret mode pauses scrolling and navigation until cancelled.

## Assets

The page title shown in browser tabs and shared links is **Nutcracker's Portfolio**. The penguin site icon embeds the supplied image in `favicon.svg?v=2`, with `nutcracker.jpeg?v=2` as a fallback and an Apple touch icon.

The botanical artwork is original AI-generated art. Fonts are Italiana and DM Sans via Google Fonts, with system fallbacks. The website reads `portfolio.json` without a build step.

## Local preview

Serve the directory with a static HTTP server. Direct file opening may prevent JSON content from loading.
