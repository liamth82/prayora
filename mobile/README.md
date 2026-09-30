# Ora mobile app

Expo (React Native) app for iPhone and Android. Lives in `mobile/` of the prayora repo; the website is at the repo root.

- Every push to `main` that changes `mobile/` publishes an EAS Update to the `preview` branch (see `.eas/workflows/preview-update.yml`).
- To try it: install **Expo Go**, sign in with the Ora Expo account, then open the latest update from expo.dev → ora → Updates and scan its QR code.
- Local: `npm install`, then `npx expo start`.
