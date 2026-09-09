import React, { useCallback, useEffect, useRef, useState } from "react";
import cx from "classnames";
import { Link } from "react-router-dom";
import {
  ArrowLeftCircleIcon,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import useCameraSettled from "./useCameraSettled";

/**
 * The artifacts shop: Andrew's Etsy listings, fetched through
 * GET /api/shop (see server/handler.mjs). Checkout stays on Etsy — every
 * item links out. Lives at /artifacts (/shop redirects there).
 *
 * Deliberately unstyled beyond legibility for now; a design pass comes
 * later.
 */

type ShopImage = {
  src: string;
  alt: string | null;
  width: number;
  height: number | null;
};

type ShopListing = {
  id: string;
  title: string;
  /** Already formatted ("$75.00"); the lowest option when hasVariations */
  price: string | null;
  hasVariations: boolean;
  url: string;
  /** Etsy's plain-text listing copy; absent from API responses that
   *  predate it (a stored payload, a cached deploy) */
  description?: string | null;
  /** The primary photo (older API responses carry only this) */
  image: ShopImage | null;
  /** Every photo, primary first */
  images?: ShopImage[];
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

/** A listing's photos in a scroll-snap strip: swipe, or use the arrows;
 *  the dots track which frame is in view. One photo renders plain. */
const ListingCarousel = ({
  images,
  title,
}: {
  images: ShopImage[];
  title: string;
}) => {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }, []);

  const go = (delta: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.min(images.length - 1, Math.max(0, index + delta));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  const photos = images.map((image, i) => (
    <img
      key={image.src}
      src={image.src}
      alt={image.alt ?? (i === 0 ? title : `${title} (photo ${i + 1})`)}
      width={image.width}
      height={image.height ?? undefined}
      loading="lazy"
      decoding="async"
    />
  ));

  if (images.length === 1) {
    return <div className="shop-carousel-track">{photos}</div>;
  }

  return (
    <div className="shop-carousel">
      <div className="shop-carousel-track" ref={track} onScroll={handleScroll}>
        {photos}
      </div>
      <button
        type="button"
        className="shop-carousel-arrow prev"
        aria-label="Previous photo"
        disabled={index === 0}
        onClick={() => go(-1)}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="shop-carousel-arrow next"
        aria-label="Next photo"
        disabled={index === images.length - 1}
        onClick={() => go(1)}
      >
        <ChevronRight size={20} />
      </button>
      <div className="shop-carousel-dots" aria-hidden="true">
        {images.map((image, i) => (
          <span
            key={image.src}
            className={cx("shop-carousel-dot", i === index && "is-active")}
          />
        ))}
      </div>
    </div>
  );
};

/** Etsy titles are keyword-stuffed for search ("Name | Gift | Handmade");
 *  the card shows only what comes before the first pipe. The full title
 *  still rides along as the photo's alt text. */
const displayTitle = (title: string) => title.split("|")[0].trim() || title;

/** One listing: photo strip, title, price, and Etsy's own copy clamped to
 *  two lines until it's expanded. */
const ListingCard = ({ listing }: { listing: ShopListing }) => {
  const [expanded, setExpanded] = useState(false);
  // Older API copies (the Lambda's stored payload, a cached deploy) carry
  // the primary photo alone, and no description at all
  const images = listing.images ?? (listing.image ? [listing.image] : []);
  const description = listing.description?.trim();
  const descriptionId = `shop-desc-${listing.id}`;

  return (
    <li className="shop-listing">
      {images.length > 0 && (
        <ListingCarousel images={images} title={listing.title} />
      )}
      <div className="shop-listing-body">
        <h2>{displayTitle(listing.title)}</h2>
        {listing.price && (
          <p>
            {listing.hasVariations ? "From " : ""}
            {listing.price}
          </p>
        )}
        {description && (
          <div className={cx("shop-listing-blurb", expanded && "is-expanded")}>
            <p id={descriptionId}>{description}</p>
            <button
              type="button"
              className="shop-listing-toggle"
              aria-expanded={expanded}
              aria-controls={descriptionId}
              onClick={() => setExpanded((open) => !open)}
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          </div>
        )}
        <a
          className="shop-listing-link"
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Etsy
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </div>
    </li>
  );
};

/** The wait: a row of card-shaped shimmers. Three are rendered and the
 *  grid's own breakpoints hide the ones that would wrap, so it's always
 *  exactly one row. */
const ListingSkeletons = () => (
  <ul className="shop-listings shop-skeletons" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <li key={i} className="shop-skeleton" />
    ))}
  </ul>
);

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

  // The page holds off until the camera has landed on its moon perch,
  // then comes in through a short blur (App.scss .shop-page--arriving)
  const cameraSettled = useCameraSettled();

  return (
    <main className={cx("shop-page", !cameraSettled && "shop-page--arriving")}>
      <Link className="flex items-center gap-1" to="/home">
        <ArrowLeftCircleIcon className="starIcon" size={16} />
        <span>home</span>
      </Link>
      <h1>
        Artifacts <span className="shop-title-byline">by Andy</span>
      </h1>
      <p className="shop-intro">
        3D-Printed Goods - made by me! To see item details or submit an order,
        visit me on{" "}
        <a href={shopUrl} target="_blank" rel="noopener noreferrer">
          Etsy
        </a>
        . More products to come soon.
      </p>

      {state.status === "loading" && (
        <>
          <p className="sr-only" role="status">
            warming up the replicator…
          </p>
          <ListingSkeletons />
        </>
      )}

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
            <ListingCard key={listing.id} listing={listing} />
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
