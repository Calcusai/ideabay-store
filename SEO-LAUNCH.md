# IdeaBay local search launch

The website is configured for **https://www.ideabay.store** (spelled exactly as supplied).

## Included in the site

- Canonicals, Open Graph URLs, product enquiry links, sitemap and robots all use this domain.
- Store schema includes the actual pickup address, phone, exact coordinates (6.8544375, 79.9133512), Google Place ID ChIJg8dFjGNb4joR8RGYTCiAfMg, Facebook and Google profile links.
- Contact map uses the exact coordinates. Google directions links include both coordinates and the place ID. No API key is needed for these links or the embedded map.
- A linked local rental guide at /camera-rental-colombo/ explains the catalog, Maharagama pickup and service areas including Colombo, Nugegoda, Kottawa, Pannipitiya and Homagama. These are not separate branches.
- Category pages include rental Service schema; product pages, breadcrumbs and the full static HTML catalog remain crawlable without JavaScript.
- ideabay.store redirects to the canonical www.ideabay.store domain, matching the live Vercel domain setup.

## Complete when publishing

1. Add ideabay.store and www.ideabay.store to the hosting project and apply the DNS records shown by the host. Verify HTTPS and the www redirect after propagation.
2. Add a Domain property for ideabay.store in Google Search Console and publish its DNS verification record. Ownership access is required; no verification token has been invented or added to the site.
3. Submit https://www.ideabay.store/sitemap.xml in Search Console. Inspect the home, contact, local rental guide and camera category URLs and request indexing after deployment.
4. In the verified Google Business Profile for the supplied place, set the website to https://www.ideabay.store/ and check that name, phone, address and map pin match the real business. Select the most accurate available rental category and list the actual equipment services. Confirm real opening hours; the site currently says pickup by appointment.
5. Add the same website to the Facebook page. Keep contact details consistent across public business listings.
6. Add authentic store and equipment photos to the Business Profile, keep inventory current, and invite actual customers to leave honest reviews. Never fabricate reviews or add invented ratings to website schema.
7. Monitor indexing, search queries and mobile Core Web Vitals in Search Console. Validate the published domain in Google's Rich Results Test. JSON validity checks are not a guarantee of rich-result eligibility.

No domain/DNS, Search Console or Business Profile changes were made by this local code update. Search appearance depends on Google's crawling, relevance, distance and prominence; no website change can guarantee a placement or immediate indexing.

References:
- https://support.google.com/business/answer/7091
- https://developers.google.com/search/docs/appearance/structured-data/local-business

## Product search and link previews

- Every product has an individual title and description containing its model, Colombo rental intent and actual daily LKR rate. Category pages target cameras, lenses, wireless microphones, lighting, gimbals, flash and intercom searches.
- Product JSON-LD identifies each model and its daily rental offer (`LeaseOut`), with links to the local store and the page's main entity. Stock availability is deliberately omitted because bookings must be confirmed.
- Each product URL has its own Open Graph and Twitter PNG preview in `static/share/`, using that item's photograph. The metadata includes the real image dimensions, MIME type and descriptive alt text. A content hash in the image URL changes when a preview changes.
- Categories use a representative item photograph; general pages use the branded `static/og.png` image.
- The XML sitemap includes all 19 product images. It does not claim a new modification date on every build.
- `npm run check` verifies all 19 individual previews, actual PNG dimensions, rental prices and schema, sitemap images and kit references, as well as the existing site checks.
- Preview PNGs are format conversions of the catalog photos. If a product photo changes, update its matching PNG in `static/share/` as well. For transparent product photos, preserve alpha.

Share a product page URL, such as `https://www.ideabay.store/gear/audio/dji-mic-2/`, rather than the homepage or a direct image file. Direct image URLs cannot carry a page title and description. Social crawlers require publicly reachable HTTPS pages and image files; localhost cannot be fetched outside this computer. These changes are prepared locally and must be deployed to the configured domain before external previews or search indexing can use them. Existing shared links may retain cached previews until the platform recrawls them; use Facebook Sharing Debugger to request a new scrape after deployment.

Google chooses its own search titles, snippets and rich-result presentation. This work improves the underlying content and crawlable metadata, without promising a ranking, indexing date or rental-price rich result. Equipment rentals should not be submitted as products for sale to Merchant Center.

Further references:
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/appearance/snippet
- https://developers.google.com/search/docs/appearance/google-images
- https://ogp.me/
