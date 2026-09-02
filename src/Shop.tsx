import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftCircleIcon } from "lucide-react";

/**
 * The gift shop: Andrew's Etsy listings, fetched through GET /api/shop
 * (see server/handler.mjs). Checkout stays on Etsy — every item links out.
 *
 * Deliberately unstyled beyond legibility for now; a design pass comes
 * later.
 */

type ShopListing = {
  id: string;
  title: string;
  /** Already formatted ("$75.00"); the lowest option when hasVariations */
  price: string | null;
  hasVariations: boolean;
  url: string;
  image: {
    src: string;
    alt: string | null;
    width: number;
    height: number | null;
  } | null;
};

type ShopPayload = {
  shop: { name: string; url: string };
  listings: ShopListing[];
  fetchedAt: string;
  /** Set when the API served its stored copy because Etsy was unreachable */
  stale?: boolean;
};

type ShopState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: ShopPayload };

// Required verbatim by Etsy's API Terms of Use (section 1)
const ETSY_NOTICE =
  "The term 'Etsy' is a trademark of Etsy, Inc. This Application uses Etsy's API, but is not endorsed or certified by Etsy.";

const SHOP_URL = "https://www.etsy.com/shop/ArtifactAndy";

const Shop = () => {
  const [state, setState] = useState<ShopState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/shop", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as ShopPayload;
        setState({ status: "ready", data });
      } catch {
        if (!controller.signal.aborted) setState({ status: "error" });
      }
    };
    void load();
    return () => controller.abort();
  }, []);

  const shopUrl = state.status === "ready" ? state.data.shop.url : SHOP_URL;

  return (
    <main className="shop-page">
      <Link className="flex items-center gap-1" to="/home">
        <ArrowLeftCircleIcon className="starIcon" size={16} />
        <span>home</span>
      </Link>
      <h1>gift shop</h1>
      <p>
        small things I make, sold over on{" "}
        <a href={shopUrl} target="_blank" rel="noopener noreferrer">
          Etsy
        </a>
        .
      </p>

      {state.status === "loading" && <p>warming up the replicator…</p>}

      {state.status === "error" && (
        <p>
          the shelves are dark right now — browse{" "}
          <a href={shopUrl} target="_blank" rel="noopener noreferrer">
            the shop on Etsy
          </a>{" "}
          instead.
        </p>
      )}

      {state.status === "ready" && state.data.listings.length === 0 && (
        <p>
          the shelves are empty at the moment — check back soon, or peek at{" "}
          <a href={shopUrl} target="_blank" rel="noopener noreferrer">
            the shop on Etsy
          </a>
          .
        </p>
      )}

      {state.status === "ready" && state.data.listings.length > 0 && (
        <ul className="shop-listings">
          {state.data.listings.map((listing) => (
            <li key={listing.id} className="shop-listing">
              {listing.image && (
                <img
                  src={listing.image.src}
                  alt={listing.image.alt ?? listing.title}
                  width={listing.image.width}
                  height={listing.image.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                />
              )}
              <h2>{listing.title}</h2>
              {listing.price && (
                <p>
                  {listing.hasVariations ? "from " : ""}
                  {listing.price}
                </p>
              )}
              <a href={listing.url} target="_blank" rel="noopener noreferrer">
                buy on Etsy
              </a>
            </li>
          ))}
        </ul>
      )}

      <footer className="shop-footer">
        <p>{ETSY_NOTICE}</p>
      </footer>
    </main>
  );
};

export default Shop;
