interface ScopeHeaderProps {
  scopeName: string;
  sprintDuration?: string;
  teamComposition?: string;
  version?: string;
  isDirty?: boolean;
}

export default function ScopeHeader({
  scopeName,
  sprintDuration,
  teamComposition,
  version,
  isDirty,
}: ScopeHeaderProps) {
  return (
    <header className="bg-card p-4 rounded-lg mb-6 border border-border">
      <h1 className="text-2xl font-semibold mb-2 text-foreground">
        {scopeName}
      </h1>
      <div className="flex flex-wrap gap-4 text-secondary-text">
        {sprintDuration && <span>Duration: {sprintDuration}</span>}
        {teamComposition && <span>Team: {teamComposition}</span>}
        {version && (
          <span className="px-2 py-1 bg-accent rounded text-background">
            v{version}
          </span>
        )}
        {isDirty && <span className="text-destructive">● Unsaved changes</span>}
      </div>
    </header>
  );
}
