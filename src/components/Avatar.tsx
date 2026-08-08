import clsx from 'clsx';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 36,
  md: 44,
  lg: 64,
};

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const dim = sizes[size];
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        width={dim}
        height={dim}
        className={clsx('avatar', className)}
        style={{ width: dim, height: dim, borderRadius: '50%', objectFit: 'cover' }}
      />
    );
  }

  return (
    <div
      className={clsx('avatar avatar--fallback', className)}
      style={{
        width: dim,
        height: dim,
        borderRadius: '50%',
        background: 'var(--gold-soft)',
        color: 'var(--gold)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: dim * 0.38,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}
