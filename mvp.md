- this is everytime we need before we demo the project
- we need to remove all those things around the settings 
- we need to remove the more of the zooisms
- we need a logo
- we need a website 
- we need to test all those thingies around the simulator connection with dwsim 
- test the connections
- figure out if we need the ai billings. we might 
- figure out how to send updates to the application very > [!IMPORTANT]
- we need to get the people emails tbh we need to be able to email before
- create export button instead of export path sidebar we jave export (handoff to claude tbh)

- write an x article about what you are building trying put it on build in public

## later
fix your file system, it is not efficient. it is not effici

## release mvp

6. App code (small)
- src/main.ts: needs no changes. electron-updater reads the provider from a generated app-update.yml packaged into the app.
- src/menu/helpRole.ts:103: optionally re-enable "Check for Updates…".
- Look through the update toast and dialog text in the renderer for "Zoo Design Studio" wording.
7. Code signing (the hard part)
Platform	Without signing	To sign
macOS	Auto-update does not work (Squirrel.Mac rejects unsigned apps), and Gatekeeper blocks the first launch	Apple Developer Program ($99/yr), a "Developer ID Application" certificate, and these repo secrets: APPLE_CERTIFICATE (base64 .p12), APPLE_CERTIFICATE_PASSWORD, APPLE_ID, APPLE_PASSWORD (app-specific password), APPLE_TEAM_ID. The workflow already reads these names.
Windows	Auto-update works; users see a SmartScreen warning	Azure Trusted Signing (~$10/mo) plus the AZURE_* secrets the workflow already references
Linux	Works (AppImage)	Not needed
If you're not signing macOS yet, set notarize: false and accept that Mac users will update manually for now.
8. First release and test
1. git tag v0.1.0 && git push origin v0.1.0
2. Wait for CI, then open the draft release. It should contain the .dmg, the mac .zip (which the updater needs), the .exe, the .AppImage files, latest.yml, latest-mac.yml, latest-linux.yml and .blockmap files. Publish it.
3. Install v0.1.0.
4. Tag and publish v0.1.1.
5. Open v0.1.0. Within about a minute it should download v0.1.1 and offer a restart.
The first version always has to be installed by hand. Auto-update starts from the second release.
Order I'd do it in
1. Make the repo public.
2. Rebrand package.json and electron-builder.yml.
3. Switch publish to github.
4. Trim build-apps.yml and delete publish-apps.yml.
5. Release Windows and Linux first.
6. Add macOS signing once you have the Apple account.
I'm in Plan mode, so I can't edit files yet. Switch to a build agent if you'd like me to make these changes. It would also help to know your appId, the protocol name, and whether you already have an Apple Developer account.
