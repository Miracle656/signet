import { notFound } from 'next/navigation';
import { attributeContract } from '@/lib/contract-attribution';
import { SiteFooter } from '../../_components/site-footer';
import { SiteNav } from '../../_components/site-nav';
import { ContractTabsNav } from './tabs-nav';

// Rendered per request. The root layout reads request headers for the CSP
// nonce, so no route can be statically pre-rendered anyway, and attribution
// is a live DB/Horizon question. Declaring it explicitly matters: a dynamic
// segment with no build-time params would otherwise be treated as ISR, where
// the layout's `headers()` call turns every render into a 500 instead of a
// page (or a clean 404 for a contract this handle did not deploy). The
// setting covers every child segment below this layout.
export const dynamic = 'force-dynamic';

function truncate(str: string, head: number, tail: number): string {
  if (str.length <= head + tail + 3) return str;
  return `${str.slice(0, head)}...${str.slice(-tail)}`;
}

/**
 * Shell for the per-contract documentation route (#445, design §2.1):
 * attribution gate, profile identity strip, header slot, tab bar. Every
 * later issue fills a slot; this layout owns the frame.
 */
export default async function ContractLayout({
  params,
  children,
}: {
  params: Promise<{ handle: string; address: string }>;
  children: React.ReactNode;
}) {
  const { handle, address } = await params;

  // One attribution check for the whole route: the contract renders as part
  // of this developer's record, so a contract the handle did not deploy is a
  // 404 — a real one, not a 200 with a not-found body. `invalid` (malformed
  // handle or address) is indistinguishable from the outside on purpose.
  const attribution = await attributeContract(handle, address);
  if (attribution.status === 'not-attributed' || attribution.status === 'invalid') {
    notFound();
  }

  return (
    <div className="relative min-h-screen bg-[#0a0908] text-[#f5f4ee]">
      {/* Grain */}
      <div
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      <SiteNav />

      {attribution.status === 'unavailable' ? (
        // Attribution could not be decided (DB and Horizon both unreachable).
        // Neither a 404 (the claim might be true) nor the page (it might not
        // be) is honest here; #459 builds the full error state, this is the
        // minimal truthful placeholder until then.
        <main className="relative z-10 mx-auto max-w-5xl px-8 py-16 md:px-14">
          <p
            className="text-[13px] leading-[1.7] text-[#8a8779]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Attribution for this contract can&apos;t be verified right now — the indexer and
            Horizon are both unreachable. Nothing is shown rather than something unverified.
            Try again shortly.
          </p>
        </main>
      ) : (
        <>
          {/* Identity strip: the contract is shown as part of this
              developer's record, and the route says so. */}
          <div className="relative z-10 border-b border-[#1f1d19] px-8 py-4 md:px-14">
            <div
              className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.22em]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              <a href={`/p/${handle}`} className="text-[#8b1a1a] transition-colors hover:text-[#c2410c]">
                @{handle}
              </a>
              <span className="text-[#3d3a33]">/</span>
              <span className="text-[#8a8779]" title={address}>
                {truncate(address, 8, 6)}
              </span>
            </div>
          </div>

          {/* Header slot — #448 fills this with the contract header. */}
          <div className="relative z-10 px-8 pt-10 md:px-14" data-slot="contract-header" />

          <ContractTabsNav handle={handle} address={address} />

          <main className="relative z-10 mx-auto max-w-5xl px-8 py-16 md:px-14">{children}</main>
        </>
      )}

      <SiteFooter />
    </div>
  );
}
