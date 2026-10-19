# Public UI design

The public TRUECOLOURS design follows the local `/Users/b/Desktop/mere-simplicity` project: Geist typography, a pale paper surface with its original animated dotted ribbon, large centred headlines, black pill actions, numbered editorial rows, word-list dropdowns, a mobile drawer and the dotted footer wordmark.

`app/public-site.css` scopes these styles to public pages. The homepage, catalogue, paint finder (including vehicle deep links), policy pages and error page use the shared public system. Catalogue filters, product detail expansion, enquiry/account flows and paint code search retain their data and behaviour.

Antique and classic years and makes now use the main Find by Vehicle selectors. Make/year references can be searched without choosing an unsupported model. Original charts appear directly in the results, with a single matching chart opened automatically; there is no separate archive tab or era selector. Makes are merged across sources regardless of casing or punctuation so original charts and modern models remain available from one selection. References without a local preview appear as compact source links. The original chart and sample images keep their source colours, and digital paint swatches use the supplied hex value without a gradient overlay.

The original reference project is read only. Geist font files are bundled locally with their official SIL Open Font License in `public/fonts/geist-LICENSE.txt`. `components/PaintAmbientBackground.tsx` adapts the reference's existing canvas to the TRUECOLOURS story and respects reduced motion and hidden tabs.

Public navigation provides hover and click dropdowns, arrow-key entry, Escape handling, a scroll-locked mobile dialog and keyboard focus containment. The mobile submenu closes on the first Escape; the next Escape closes the drawer. The gallery keeps keyboard image navigation and a focus-contained dialog. FAQs use native details elements.

Local verification: `npm test`, `npm run build`, plus desktop and mobile browser checks at 390px and 320px.

The Google account screen also follows the reference auth gate: a mono account label, bold left-aligned title, lock badge, subtle circular lines and an outlined Google pill. Its existing Google authentication, loading, recovery and redirect behaviour remain in place. The account panel renders above the navbar and contains keyboard focus, locks background scrolling and closes with Escape.

The homepage uses the original `herosectionpic.png` paint splash as a full-width background, with an overlay for legible headings and controls. It restores the original Automotive & Industrial Paints, EST 2022 and Find Our Store content. The navbar blends into the hero with white controls and the original full-colour logo, then uses its pale surface for menus and the content below the hero.
