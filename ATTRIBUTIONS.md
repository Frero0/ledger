# Attribution and licensing notes

Ledger's application transformation, visual identity and documentation are by [Federico Santorsola](https://github.com/Frero0). Existing history is preserved and is not rewritten to change authors.

No repository-level license or copyright notice was found in the supplied project files. This release does not assign a blanket license or claim ownership of third-party software. The original reviewed source is preserved in the initial local commit; obsolete editorial links and integrations are not part of the running application.

Main runtime dependencies retain their own license notices:

- React and React DOM: MIT, Facebook, Inc. and its affiliates.
- Recharts: MIT, recharts.
- Lucide React icons: ISC, Lucide Contributors (with inherited Feather icon notices where applicable).
- Vite: MIT; TypeScript: Apache-2.0; build/test tools and transitive dependencies retain their respective terms.

Package distributions contain the authoritative notices. Installing dependencies does not transfer their copyright to the application author. Local SVG brand artwork is code-native; no third-party photos, remote font files or financial data are bundled.

Browser speech recognition is optional and subject to the browser/provider's availability and privacy behavior. Ledger neither hosts nor supplies that recognition service.

Full notices for the 44 installed runtime packages are included in [public/THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt) and copied into the static build. Regenerate them with `npm run licenses:generate` after installing changed dependencies.
