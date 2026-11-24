export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="icon"><use href={`/icons/navigation.svg#${name}`} /></svg>;
}
