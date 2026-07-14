import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { formatPKR } from '@/lib/money';

export interface BusinessCardData {
  slug: string;
  display_name: string;
  category_name: string;
  cover_url: string | null;
  area: string | null;
  landmark: string | null;
  rating_avg: number | null;
  rating_count: number;
  distance_km: number | null;
  from_price: number | null;
}

export function BusinessCard({ b }: { b: BusinessCardData }) {
  return (
    <Link href={`/b/${b.slug}`}
      className="group block overflow-hidden rounded-[18px] border border-warm-line/60 bg-white transition-all hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(88,66,55,.12)]">
      <div className="relative aspect-[16/10] bg-warm-low">
        {/* A business with no cover gets a warm branded placeholder — never a
            grey box and never "No photo yet". An empty card looks like a broken
            listing, and a broken listing makes the whole app look untrustworthy. */}
        <Image
          src={b.cover_url ?? '/images/placeholder-cover.webp'}
          alt=""
          fill
          unoptimized={!!b.cover_url}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        {/* "NEW", not "0 stars". A good new salon should be discoverable —
            otherwise supply never onboards. Zero stars reads as "bad". */}
        {b.rating_count === 0 && (
          <span className="absolute left-3.5 top-3.5 rounded-full bg-white px-2.5 py-1 font-display text-[0.62rem] font-bold uppercase tracking-wide text-warm-ink shadow-sm">
            New
          </span>
        )}
      </div>

      <div className="p-5">
        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h3 className="truncate font-display text-[1.05rem] font-bold tracking-tight text-warm-ink">
            {b.display_name}
          </h3>
          {b.rating_count > 0 && (
            <span className="tnum flex flex-none items-center gap-1 font-display text-[0.84rem] font-bold text-warm-ink">
              <Star className="size-3.5 fill-brand text-brand" />
              {b.rating_avg?.toFixed(1)}
              <span className="font-normal text-warm-faint">({b.rating_count})</span>
            </span>
          )}
        </div>

        <p className="mb-3 text-[0.82rem] text-warm-muted">{b.category_name}</p>

        {/* THE LANDMARK. Not the street address. "House 42, Street 7, Block C"
            will not get her to the door in Lahore. "Opposite Emporium Mall" will. */}
        <p className="flex items-start gap-1.5 text-[0.86rem] leading-snug text-warm-ink">
          <MapPin className="mt-0.5 size-3.5 flex-none text-brand" />
          <span className="line-clamp-1">{b.landmark || b.area}</span>
        </p>

        <div className="mt-4 flex items-center justify-between border-t border-warm-line/50 pt-3.5">
          {b.from_price !== null ? (
            <span className="text-[0.83rem] text-warm-muted">
              From{' '}
              <b className="tnum font-display font-bold text-warm-ink">
                {formatPKR(b.from_price)}
              </b>
            </span>
          ) : <span />}

          {b.distance_km !== null && (
            <span className="tnum font-mono text-[0.8rem] text-warm-faint">
              {b.distance_km} km
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
