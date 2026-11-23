export default function AdWaitBar({ label }: { label: string }) {
  return (
    <div role="progressbar" aria-label={label} className="h-2 w-full overflow-hidden rounded-full bg-purple-500/15">
      <div className="dream-analysis-progress-bar h-full w-2/5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-400" />
    </div>
  );
}
