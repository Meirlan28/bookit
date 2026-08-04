import { Link } from 'wouter';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="logo" to="/" aria-label="BookIt — на главную">
      <span className="logo__mark" aria-hidden>
        B<span />
      </span>
      {!compact && <span className="logo__word">BookIt</span>}
    </Link>
  );
}
