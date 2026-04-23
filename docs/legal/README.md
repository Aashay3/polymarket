# Legal documents

> **⚠️ NOT LEGAL ADVICE. THESE ARE SKELETONS.**
>
> The files in this directory are starting points for a lawyer, not ready-to-publish policies. Publishing them verbatim and taking user money is **reckless** — the specific language depends on:
>
> - Your jurisdiction of incorporation
> - The jurisdictions you accept users from
> - Your custody model (custodial vs. non-custodial)
> - Your KYC/AML program
> - Whether you're a regulated entity (money services business, securities dealer, etc.)
>
> A prediction-market platform handling crypto is in one of the most heavily-scrutinized corners of fintech. Retain a crypto-native lawyer (not your friend's family attorney) before you take public traffic.

## What you need before launch

1. **Terms of Service** — starting from `TERMS_OF_SERVICE.md`, fine-tuned by a lawyer
2. **Privacy Policy** — starting from `PRIVACY_POLICY.md`, fine-tuned by a lawyer. GDPR-compliant if you serve EU users.
3. **Risk Disclosure** — a bold, plain-English warning that users can lose all their money. Required in most jurisdictions.
4. **Cookie Policy** — required for EU visitors. Usually rolled into the privacy policy.
5. **AML / KYC Policy** — internal, but you need one; regulators will ask.
6. **Responsible gambling / prediction-market warnings** — specifically required in some jurisdictions.
7. **Geofencing disclosure** — list of jurisdictions you don't serve (and enforce it at the CDN).

## Recommended lawyer shortlist

- **Cooley LLP** — tech-native, expensive
- **Anderson Kill** — crypto specialist
- **Hogan Lovells** — global reach
- **Any of the "crypto boutique" firms** that advertise on Twitter; do diligence

## Things a lawyer will fix in these skeletons

The language below is intentionally incomplete/wrong so you're not tempted to ship it. Expect your lawyer to:

- Add arbitration + choice-of-law clauses tuned to your corp structure
- Add liability caps that are actually enforceable in your jurisdictions
- Correct US securities / commodities posture (the SEC/CFTC boundary for prediction markets is messy)
- Add IRS/tax-reporting clauses if you serve US users
- Get the dispute resolution right
- Get the KYC/AML language right for your program
- Add geoblocking disclosures
