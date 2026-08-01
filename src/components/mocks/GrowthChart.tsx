export default function GrowthChart({
  path,
  areaPath,
  gridLabels,
}: {
  path: string;
  areaPath: string;
  gridLabels: string[];
}) {
  return (
    <div>
      <svg
        viewBox="0 0 300 100"
        className="h-24 w-full text-sky-500"
        preserveAspectRatio="none"
      >
        <path d={areaPath} fill="currentColor" opacity={0.12} />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-400">
        {gridLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
